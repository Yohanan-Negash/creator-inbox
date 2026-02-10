import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { getSafeErrorMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getConvexServerClient } from "@/lib/convex-server";
import {
  extractWhopPaymentStatus,
  getSubmissionCheckoutContextIdFromPayment,
  getWhopCheckoutConfigurationIdFromPayment,
  getWhopPaymentId,
} from "@/lib/whop-payments";
import { getWhopSdk } from "@/lib/whop";

function getWebhookKey() {
  return (process.env.WHOP_WEBHOOK_SECRET ?? "").trim();
}

async function unwrapWebhookPayload(request: NextRequest, whopSdk: unknown) {
  const body = await request.text();
  const key = getWebhookKey();

  if (!key) {
    throw new Error("Missing WHOP_WEBHOOK_SECRET");
  }

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

    const paymentId = getWhopPaymentId(payload);

    if (!paymentId) {
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
    }).payments.retrieve(paymentId);

    const status = extractWhopPaymentStatus(payment);
    const checkoutContextId = getSubmissionCheckoutContextIdFromPayment(payment);
    const whopCheckoutConfigurationId = getWhopCheckoutConfigurationIdFromPayment(payment);

    try {
      if (checkoutContextId) {
        await convex.mutation(api.payments.attachPaymentIdToCheckoutConfiguration, {
          checkoutConfigurationId: checkoutContextId,
          paymentId,
        });
      } else if (whopCheckoutConfigurationId) {
        await convex.mutation(api.payments.attachPaymentIdToWhopCheckoutConfiguration, {
          whopCheckoutConfigurationId,
          paymentId,
        });
      }
    } catch (error) {
      logger.info("Payment webhook could not attach checkout mapping", {
        route,
        method: "POST",
        event: "whop.payment.webhook_attach_mapping_failed",
        checkoutConfigurationId: checkoutContextId ?? null,
        whopCheckoutConfigurationId: whopCheckoutConfigurationId ?? null,
        paymentId,
        errorMessage: getSafeErrorMessage(error),
      });
    }

    if (status === "paid") {
      await convex.mutation(api.payments.completeSubmissionPayment, { paymentId });
      return NextResponse.json({ received: true, paymentId, status: "paid" }, { status: 200 });
    }

    if (status === "failed" || status === "void") {
      await convex.mutation(api.payments.markSubmissionPaymentFailed, {
        paymentId,
        errorMessage: "Payment was not successful.",
      });

      return NextResponse.json(
        { received: true, paymentId, status: "failed" },
        { status: 200 },
      );
    }

    return NextResponse.json({ received: true, paymentId, status: "pending" }, { status: 200 });
  } catch (error) {
    logger.error("Payment webhook processing failed", {
      route,
      method: "POST",
      event: "whop.payment.webhook_failed",
      status: 500,
      errorMessage: getSafeErrorMessage(error),
    });
    return NextResponse.json({ error: getSafeErrorMessage(error) }, { status: 500 });
  }
}
