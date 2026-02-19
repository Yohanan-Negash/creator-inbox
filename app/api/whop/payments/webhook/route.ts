import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { getSafeErrorMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getConvexServerClient } from "@/lib/convex-server";
import {
  extractWhopPaymentStatus,
  getSubmissionCheckoutContextIdFromPayment,
  getSubmissionPaymentIdFromPayment,
  getWhopCheckoutConfigurationIdFromPayment,
  getWhopPaymentId,
} from "@/lib/whop-payments";
import { getWhopSdk } from "@/lib/whop";
import { notifyAdminSubmissionCreated } from "@/lib/whop-notifications";

function getWebhookKey() {
  return (process.env.WHOP_WEBHOOK_SECRET ?? "").trim();
}

async function unwrapWebhookPayload(request: NextRequest, whopSdk: unknown) {
  const body = await request.text();
  const key = getWebhookKey();

  const sdk = whopSdk as {
    webhooks: {
      unwrap: (input: string, options: { headers: Record<string, string>; key?: string }) => unknown;
    };
  };

  const headers = Object.fromEntries(request.headers.entries());

  try {
    return sdk.webhooks.unwrap(body, {
      headers,
      key,
    });
  } catch {
    return sdk.webhooks.unwrap(body, {
      headers,
      key: Buffer.from(key).toString("base64"),
    });
  }
}

export async function POST(request: NextRequest) {
  const route = "/api/whop/payments/webhook";

  try {
    const webhookSecret = getWebhookKey();
    if (!webhookSecret) {
      logger.error("Payment webhook misconfigured (missing secret)", {
        route,
        method: "POST",
        event: "whop.payment.webhook_missing_secret",
        status: 500,
      });
      return NextResponse.json({ error: "Webhook is not configured." }, { status: 500 });
    }

    const whopSdk = getWhopSdk();
    let payload: unknown;

    try {
      payload = await unwrapWebhookPayload(request, whopSdk);
    } catch (error) {
      logger.error("Payment webhook signature validation failed", {
        route,
        method: "POST",
        event: "whop.payment.webhook_invalid_signature",
        status: 401,
        errorMessage: getSafeErrorMessage(error),
      });
      return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
    }

    const whopPaymentId = getWhopPaymentId(payload);

    if (!whopPaymentId) {
      logger.info("Payment webhook ignored (no payment id)", {
        route,
        method: "POST",
        event: "whop.payment.webhook_ignored",
      });
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const convex = getConvexServerClient();
    const payment = await (whopSdk as {
      payments: { retrieve: (id: string) => Promise<unknown> };
    }).payments.retrieve(whopPaymentId);

    const status = extractWhopPaymentStatus(payment);
    const checkoutContextId = getSubmissionCheckoutContextIdFromPayment(payment);
    const whopCheckoutConfigurationId = getWhopCheckoutConfigurationIdFromPayment(payment);
    let submissionPaymentId = getSubmissionPaymentIdFromPayment(payment);

    try {
      if (submissionPaymentId) {
        const attached = await convex.mutation(api.payments.attachWhopPaymentIdToSubmissionPayment, {
          submissionPaymentId: submissionPaymentId as never,
          whopPaymentId,
          whopCheckoutConfigurationId: whopCheckoutConfigurationId ?? undefined,
        });
        submissionPaymentId = String((attached as { _id?: string } | null)?._id ?? submissionPaymentId);
      } else if (checkoutContextId) {
        const attached = await convex.mutation(api.payments.attachPaymentIdToCheckoutConfiguration, {
          checkoutConfigurationId: checkoutContextId,
          whopPaymentId,
        });
        submissionPaymentId = String((attached as { _id?: string } | null)?._id ?? "");
      } else if (whopCheckoutConfigurationId) {
        const attached = await convex.mutation(api.payments.attachPaymentIdToWhopCheckoutConfiguration, {
          whopCheckoutConfigurationId,
          whopPaymentId,
        });
        submissionPaymentId = String((attached as { _id?: string } | null)?._id ?? "");
      }
    } catch (error) {
      logger.error("Payment webhook could not attach checkout mapping", {
        route,
        method: "POST",
        event: "whop.payment.webhook_attach_mapping_failed",
        submissionPaymentId: submissionPaymentId ?? null,
        checkoutConfigurationId: checkoutContextId ?? null,
        whopCheckoutConfigurationId: whopCheckoutConfigurationId ?? null,
        whopPaymentId,
        errorMessage: getSafeErrorMessage(error),
      });

      if (status === "paid" || status === "failed" || status === "void") {
        throw error;
      }
    }

    if ((status === "paid" || status === "failed" || status === "void") && !submissionPaymentId) {
      throw new Error("Payment webhook missing submissionPaymentId and checkout mapping context.");
    }

    if (status === "paid") {
      const completion = await convex.mutation(api.payments.completeSubmissionPayment, {
        submissionPaymentId: submissionPaymentId as never,
      });

      if (completion.created) {
        await notifyAdminSubmissionCreated({
          experienceId: completion.experienceId,
          creatorUserId: completion.creatorUserId,
          requesterUserName: completion.requesterUserName,
          requestTypeTitle: completion.requestTypeTitle,
        });
      }

      return NextResponse.json({ received: true, whopPaymentId, status: "paid" }, { status: 200 });
    }

    if ((status === "failed" || status === "void") && submissionPaymentId) {
      await convex.mutation(api.payments.markSubmissionPaymentFailed, {
        submissionPaymentId: submissionPaymentId as never,
        errorMessage: "Payment was not successful.",
      });

      return NextResponse.json(
        { received: true, whopPaymentId, status: "failed" },
        { status: 200 },
      );
    }

    return NextResponse.json({ received: true, whopPaymentId, status: "pending" }, { status: 200 });
  } catch (error) {
    logger.error("Payment webhook processing failed", {
      route,
      method: "POST",
      event: "whop.payment.webhook_failed",
      status: 500,
      errorMessage: getSafeErrorMessage(error),
    });
    return NextResponse.json({ error: "Please try again later." }, { status: 500 });
  }
}
