import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { getSafeErrorMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getWhopSdk } from "@/lib/whop";
import { getConvexServerClient } from "@/lib/convex-server";
import {
  extractWhopPaymentStatus,
} from "@/lib/whop-payments";
import { notifyAdminSubmissionCreated } from "@/lib/whop-notifications";

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

    let status = await convex.query(api.payments.getSubmissionPaymentStatusForUser, {
      submissionPaymentId: submissionPaymentId as never,
      viewerUserId,
    });

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
        if (status.whopPaymentId) {
          const payment = await (whopSdk as {
            payments: { retrieve: (id: string) => Promise<unknown> };
          }).payments.retrieve(status.whopPaymentId);
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

      status = await convex.query(api.payments.getSubmissionPaymentStatusForUser, {
        submissionPaymentId: submissionPaymentId as never,
        viewerUserId,
      });
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
