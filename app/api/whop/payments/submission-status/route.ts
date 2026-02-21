import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { getSafeErrorMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getWhopSdk } from "@/lib/whop";
import { getConvexServerClient } from "@/lib/convex-server";
import {
  extractWhopPaymentStatus,
  getSubmissionPaymentIdFromPayment,
  getWhopCheckoutConfigurationIdFromPayment,
  getWhopPaymentId,
} from "@/lib/whop-payments";
import { notifyAdminSubmissionCreated } from "@/lib/whop-notifications";

type SubmissionPaymentStatus = {
  submissionPaymentId: string;
  status: "pending" | "paid" | "failed" | "refunded";
  submissionId: string | null;
  lastError: string | null;
  whopPaymentId: string | null;
  whopCheckoutConfigurationId: string | null;
  expiresAt: number | null;
};

function getPlatformCompanyIdForLookup() {
  const companyId = process.env.WHOP_COMPANY_ID?.trim() ?? "";
  if (!companyId || !companyId.startsWith("biz_")) {
    return null;
  }

  return companyId;
}

async function resolveProviderPayment(args: {
  whopSdk: ReturnType<typeof getWhopSdk>;
  route: string;
  experienceId: string;
  submissionPaymentId: string;
  status: SubmissionPaymentStatus;
  receiptId: string | null;
}) {
  const payments = (args.whopSdk as {
    payments: {
      retrieve?: (id: string) => Promise<unknown>;
      list?: (input: unknown) => AsyncIterable<unknown>;
    };
  }).payments;

  if (args.status.whopPaymentId && payments.retrieve) {
    return await payments.retrieve(args.status.whopPaymentId);
  }

  if (args.receiptId && payments.retrieve) {
    try {
      const fromReceipt = await payments.retrieve(args.receiptId);
      if (fromReceipt) {
        return fromReceipt;
      }
    } catch (error) {
      logger.info("Submission status receipt lookup skipped", {
        route: args.route,
        method: "GET",
        event: "whop.payment.status.receipt_lookup_skipped",
        experienceId: args.experienceId,
        submissionPaymentId: args.submissionPaymentId,
        receiptId: args.receiptId,
        errorMessage: getSafeErrorMessage(error),
      });
    }
  }

  if (!args.status.whopCheckoutConfigurationId || !payments.list) {
    return null;
  }

  const companyId = getPlatformCompanyIdForLookup();
  if (!companyId) {
    return null;
  }

  try {
    const list = payments.list({
      company_id: companyId,
      statuses: ["draft", "open", "pending", "paid", "void", "uncollectible", "unresolved"],
      direction: "desc",
      order: "created_at",
      first: 200,
    });

    let seen = 0;
    for await (const payment of list) {
      seen += 1;
      if (seen > 200) {
        break;
      }

      const paymentAttemptId = getSubmissionPaymentIdFromPayment(payment);
      if (paymentAttemptId && paymentAttemptId === args.submissionPaymentId) {
        return payment;
      }

      const paymentCheckoutId = getWhopCheckoutConfigurationIdFromPayment(payment);
      if (paymentCheckoutId && paymentCheckoutId === args.status.whopCheckoutConfigurationId) {
        return payment;
      }
    }
  } catch (error) {
    logger.info("Submission status list reconciliation skipped", {
      route: args.route,
      method: "GET",
      event: "whop.payment.status.list_lookup_skipped",
      experienceId: args.experienceId,
      submissionPaymentId: args.submissionPaymentId,
      checkoutConfigurationId: args.status.whopCheckoutConfigurationId,
      errorMessage: getSafeErrorMessage(error),
    });
  }

  return null;
}

async function completePaymentAndNotify(
  convex: ReturnType<typeof getConvexServerClient>,
  submissionPaymentId: string,
) {
  const completion = await convex.mutation(api.payments.completeSubmissionPayment, {
    submissionPaymentId: submissionPaymentId as never,
  });

  if (!completion.created) {
    return completion;
  }

  await notifyAdminSubmissionCreated({
    experienceId: completion.experienceId,
    creatorUserId: completion.creatorUserId,
    requesterUserName: completion.requesterUserName,
    requestTypeTitle: completion.requestTypeTitle,
  });

  return completion;
}

export async function GET(request: NextRequest) {
  const experienceId = request.nextUrl.searchParams.get("experienceId") ?? "";
  const submissionPaymentId = request.nextUrl.searchParams.get("attemptId") ?? "";
  const receiptId = request.nextUrl.searchParams.get("receiptId") ?? "";
  const devUserToken = request.nextUrl.searchParams.get("whop-dev-user-token") ?? "";
  const route = "/api/whop/payments/submission-status";

  if (!experienceId || !submissionPaymentId) {
    return NextResponse.json({ error: "Missing experienceId or attemptId." }, { status: 400 });
  }

  try {
    const whopSdk = getWhopSdk();
    const convex = getConvexServerClient();
    const token = await whopSdk.verifyUserToken(devUserToken || request.headers);
    const viewerUserId = token.userId;

    const access = await whopSdk.users.checkAccess(experienceId, {
      id: viewerUserId,
    });

    if (!access.has_access) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    let status = (await convex.query(api.payments.getSubmissionPaymentStatusForUser, {
      submissionPaymentId: submissionPaymentId as never,
      viewerUserId,
    })) as SubmissionPaymentStatus | null;

    if (!status) {
      return NextResponse.json(
        {
          attemptId: submissionPaymentId,
          status: "failed",
          submissionCreated: false,
          submissionId: null,
          error: "Payment attempt not found.",
        },
        { status: 200 },
      );
    }

    if (status.status === "pending") {
      if (status.expiresAt !== null && Date.now() > status.expiresAt) {
        await convex.mutation(api.payments.markSubmissionPaymentFailed, {
          submissionPaymentId: submissionPaymentId as never,
          errorMessage: "Checkout session expired.",
        });
      } else {
        const payment = await resolveProviderPayment({
          whopSdk,
          route,
          experienceId,
          submissionPaymentId,
          status,
          receiptId: receiptId || null,
        });

        if (payment) {
          const resolvedPaymentId = getWhopPaymentId(payment);
          if (resolvedPaymentId && resolvedPaymentId !== status.whopPaymentId) {
            await convex.mutation(api.payments.attachWhopPaymentIdToSubmissionPayment, {
              submissionPaymentId: submissionPaymentId as never,
              whopPaymentId: resolvedPaymentId,
              whopCheckoutConfigurationId: status.whopCheckoutConfigurationId ?? undefined,
            });
          }

          const paymentStatus = extractWhopPaymentStatus(payment);

          if (paymentStatus === "paid") {
            await completePaymentAndNotify(convex, submissionPaymentId);
          }

          if (paymentStatus === "failed" || paymentStatus === "void") {
            await convex.mutation(api.payments.markSubmissionPaymentFailed, {
              submissionPaymentId: submissionPaymentId as never,
              errorMessage: "Payment was not successful.",
            });
          }
        }
      }

      status = (await convex.query(api.payments.getSubmissionPaymentStatusForUser, {
        submissionPaymentId: submissionPaymentId as never,
        viewerUserId,
      })) as SubmissionPaymentStatus | null;
    }

    return NextResponse.json(
      {
        attemptId: submissionPaymentId,
        status: status?.status ?? "pending",
        submissionCreated: Boolean(status?.submissionId),
        submissionId: status?.submissionId ?? null,
        error: status?.lastError ?? null,
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error("Submission payment status check failed", {
      route,
      method: "GET",
      event: "whop.payment.status_check_failed",
      status: 500,
      experienceId,
      submissionPaymentId,
      errorMessage: getSafeErrorMessage(error),
    });

    return NextResponse.json({ error: "Please try again later." }, { status: 500 });
  }
}
