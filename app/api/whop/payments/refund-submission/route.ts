import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import { getSafeErrorMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getWhopSdk } from "@/lib/whop";
import { getConvexServerClient } from "@/lib/convex-server";
import { notifyUserSubmissionRefunded } from "@/lib/whop-notifications";

const refundSubmissionSchema = z.object({
  experienceId: z.string().min(1),
  submissionId: z.string().min(1),
  whopDevUserToken: z.string().optional(),
});

function createHttpError(status: number, message: string) {
  const error = new Error(message) as Error & { status?: number };
  error.status = status;
  return error;
}

function getStatusString(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object") {
    const statusObj = value as { status?: unknown; value?: unknown };
    if (typeof statusObj.status === "string") {
      return statusObj.status;
    }
    if (typeof statusObj.value === "string") {
      return statusObj.value;
    }
  }

  return "";
}

function isWhopPaymentRefunded(payment: unknown) {
  const record = payment as {
    refunded_at?: unknown;
    refundedAt?: unknown;
    status?: unknown;
    substatus?: unknown;
  };

  const refundedAt =
    (typeof record.refunded_at === "string" && record.refunded_at.length > 0) ||
    (typeof record.refundedAt === "string" && record.refundedAt.length > 0);

  if (refundedAt) {
    return true;
  }

  const status = String(record.status ?? "").toLowerCase();
  const substatus = getStatusString(record.substatus).toLowerCase();
  const normalizedStatus = getStatusString(record.status).toLowerCase() || status;
  const refundedFields = payment as {
    refunded_amount?: unknown;
    refundedAmount?: unknown;
    auto_refunded?: unknown;
    autoRefunded?: unknown;
  };
  const refundedAmount = Number(
    refundedFields.refunded_amount ?? refundedFields.refundedAmount ?? 0,
  );
  const autoRefunded = Boolean(
    refundedFields.auto_refunded ?? refundedFields.autoRefunded ?? false,
  );

  return (
    refundedAmount > 0 ||
    autoRefunded ||
    normalizedStatus === "refunded" ||
    substatus === "refunded" ||
    substatus === "auto_refunded" ||
    substatus === "partially_refunded"
  );
}

async function finalizeSubmissionRefundWithRetry(
  convex: ReturnType<typeof getConvexServerClient>,
  submissionId: string,
  viewerUserId: string,
  whopPaymentId: string | null,
) {
  const backoffMs = [200, 500] as const;
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await convex.mutation(api.payments.finalizeSubmissionRefund, {
        submissionId: submissionId as never,
        viewerUserId,
        whopPaymentId: whopPaymentId ?? undefined,
      });
    } catch (error) {
      lastError = error;
      if (attempt < backoffMs.length) {
        await new Promise((resolve) => setTimeout(resolve, backoffMs[attempt]));
      }
    }
  }

  throw lastError;
}

export async function POST(request: NextRequest) {
  const route = "/api/whop/payments/refund-submission";
  const baseLog = {
    route,
    method: "POST",
  };

  try {
    const parsed = refundSubmissionSchema.safeParse(await request.json());
    if (!parsed.success) {
      logger.info("Submission refund request validation failed", {
        ...baseLog,
        event: "whop.payment.refund.validation_failed",
        status: 400,
      });
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    const whopSdk = getWhopSdk();
    const convex = getConvexServerClient();

    const token = await whopSdk.verifyUserToken(
      parsed.data.whopDevUserToken || request.headers,
    );
    const viewerUserId = token.userId;

    const access = await whopSdk.users.checkAccess(parsed.data.experienceId, {
      id: viewerUserId,
    });

    if (access.access_level !== "admin") {
      logger.info("Submission refund access denied", {
        ...baseLog,
        event: "whop.payment.refund.access_denied",
        status: 403,
        experienceId: parsed.data.experienceId,
        submissionId: parsed.data.submissionId,
        viewerUserId,
      });
      throw createHttpError(403, "Admin access required.");
    }

    const context = await convex.query(api.payments.getRefundContext, {
      submissionId: parsed.data.submissionId as never,
      viewerUserId,
    });

    // Idempotency: if already refunded, return success without calling Whop again
    if (context.status === "refunded") {
      logger.info("Submission already refunded (idempotent)", {
        ...baseLog,
        event: "whop.payment.refund.idempotent_hit",
        status: 200,
        experienceId: parsed.data.experienceId,
        submissionId: context.submissionId,
        viewerUserId,
      });
      return NextResponse.json(
        {
          success: true,
          submissionId: context.submissionId,
        },
        { status: 200 },
      );
    }

    let whopRefundApplied = false;

    if (context.whopPaymentId) {
      const paymentsClient = (whopSdk as {
        payments: {
          retrieve: (id: string) => Promise<unknown>;
          refund: (id: string, body?: { partial_amount?: number | null }) => Promise<unknown>;
        };
      }).payments;

      const paymentBefore = await paymentsClient.retrieve(context.whopPaymentId);
      if (isWhopPaymentRefunded(paymentBefore)) {
        logger.info("Whop payment already refunded", {
          ...baseLog,
          event: "whop.payment.refund.whop_already_refunded",
          status: 200,
          experienceId: parsed.data.experienceId,
          submissionId: parsed.data.submissionId,
          viewerUserId,
          whopPaymentId: context.whopPaymentId,
        });
        whopRefundApplied = true;
      } else {
        try {
          logger.info("Whop refund initiated", {
            ...baseLog,
            event: "whop.payment.refund.whop_refund_initiated",
            experienceId: parsed.data.experienceId,
            submissionId: parsed.data.submissionId,
            viewerUserId,
            whopPaymentId: context.whopPaymentId,
          });
          await paymentsClient.refund(context.whopPaymentId);
          logger.info("Whop refund succeeded", {
            ...baseLog,
            event: "whop.payment.refund.whop_refund_succeeded",
            status: 200,
            experienceId: parsed.data.experienceId,
            submissionId: parsed.data.submissionId,
            viewerUserId,
            whopPaymentId: context.whopPaymentId,
          });
          whopRefundApplied = true;
        } catch (error) {
          const message = getSafeErrorMessage(error).toLowerCase();
          if (message.includes("cannot be refunded") || message.includes("already refunded")) {
            const paymentAfter = await paymentsClient.retrieve(context.whopPaymentId);
            if (isWhopPaymentRefunded(paymentAfter)) {
              logger.info("Whop refund confirmed after conflict response", {
                ...baseLog,
                event: "whop.payment.refund.whop_refund_confirmed_after_conflict",
                status: 200,
                experienceId: parsed.data.experienceId,
                submissionId: parsed.data.submissionId,
                viewerUserId,
                whopPaymentId: context.whopPaymentId,
              });
              whopRefundApplied = true;
            } else {
              throw error;
            }
          } else {
            throw error;
          }
        }
      }
    }

    let refunded: {
      _id: string;
      experienceId: string;
      userId: string;
      creatorId: string;
      requestTypeTitleSnapshot: string;
    } | null = null;
    try {
      refunded = await finalizeSubmissionRefundWithRetry(
        convex,
        parsed.data.submissionId,
        viewerUserId,
        context.whopPaymentId,
      );
    } catch (error) {
      if (whopRefundApplied) {
        logger.error("Whop refund succeeded but finalize failed", {
          ...baseLog,
          event: "whop.payment.refund_finalize_failed_after_whop_success",
          submissionId: parsed.data.submissionId,
          whopPaymentId: context.whopPaymentId,
          errorMessage: getSafeErrorMessage(error),
        });
      }
      throw error;
    }

    if (refunded) {
      await notifyUserSubmissionRefunded({
        experienceId: refunded.experienceId,
        requesterUserId: refunded.userId,
        creatorUserId: refunded.creatorId,
        requestTypeTitle: refunded.requestTypeTitleSnapshot,
      });
    }

    logger.info("Submission refund completed", {
      ...baseLog,
      event: "whop.payment.refund.completed",
      status: 200,
      experienceId: parsed.data.experienceId,
      submissionId: refunded?._id ?? parsed.data.submissionId,
      viewerUserId,
      whopPaymentId: context.whopPaymentId ?? null,
    });

    return NextResponse.json(
      {
        success: true,
        submissionId: refunded?._id ?? parsed.data.submissionId,
      },
      { status: 200 },
    );
  } catch (error) {
    const errorMessage = getSafeErrorMessage(error);
    const lower = errorMessage.toLowerCase();
    let status = (error as { status?: number })?.status;

    if (!status) {
      if (lower.includes("unauthorized") || lower.includes("admin access required")) {
        status = 403;
      } else if (
        lower.includes("submission not found") ||
        lower.includes("only pending submissions can be refunded")
      ) {
        status = 400;
      } else {
        status = 500;
      }
    }

    logger.error("Submission refund route failed", {
      ...baseLog,
      event: "whop.payment.refund_failed",
      status,
      errorMessage,
    });

    if (status === 403) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    if (status === 400) {
      return NextResponse.json({ error: "Unable to refund this submission." }, { status: 400 });
    }

    return NextResponse.json({ error: "Please try again later." }, { status: 500 });
  }
}
