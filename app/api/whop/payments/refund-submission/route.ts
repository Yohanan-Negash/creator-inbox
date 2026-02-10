import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import { getSafeErrorMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getWhopSdk } from "@/lib/whop";
import { getConvexServerClient } from "@/lib/convex-server";

const refundSubmissionSchema = z.object({
  experienceId: z.string().min(1),
  submissionId: z.string().min(1),
  whopDevUserToken: z.string().optional(),
});

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
  const substatus = String(record.substatus ?? "").toLowerCase();

  return (
    status === "refunded" ||
    substatus === "refunded" ||
    substatus === "auto_refunded" ||
    substatus === "partially_refunded"
  );
}

async function finalizeSubmissionRefundWithRetry(
  convex: ReturnType<typeof getConvexServerClient>,
  submissionId: string,
  viewerUserId: string,
  paymentId: string | null,
) {
  const backoffMs = [200, 500] as const;
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await convex.mutation(api.payments.finalizeSubmissionRefund, {
        submissionId: submissionId as never,
        viewerUserId,
        paymentId: paymentId ?? undefined,
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

  try {
    const parsed = refundSubmissionSchema.safeParse(await request.json());
    if (!parsed.success) {
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
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const context = await convex.query(api.payments.getRefundContext, {
      submissionId: parsed.data.submissionId as never,
      viewerUserId,
    });

    // Idempotency: if already refunded, return success without calling Whop again
    if (context.status === "refunded") {
      return NextResponse.json(
        {
          success: true,
          submissionId: context.submissionId,
        },
        { status: 200 },
      );
    }

    let whopRefundApplied = false;

    if (context.paymentId) {
      const paymentsClient = (whopSdk as {
        payments: {
          retrieve: (id: string) => Promise<unknown>;
          refund: (id: string, body?: { partial_amount?: number | null }) => Promise<unknown>;
        };
      }).payments;

      const paymentBefore = await paymentsClient.retrieve(context.paymentId);
      if (isWhopPaymentRefunded(paymentBefore)) {
        whopRefundApplied = true;
      } else {
        try {
          await paymentsClient.refund(context.paymentId);
          whopRefundApplied = true;
        } catch (error) {
          const message = getSafeErrorMessage(error).toLowerCase();
          if (message.includes("cannot be refunded") || message.includes("already refunded")) {
            const paymentAfter = await paymentsClient.retrieve(context.paymentId);
            if (isWhopPaymentRefunded(paymentAfter)) {
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

    let refunded: { _id?: string } | null = null;
    try {
      refunded = await finalizeSubmissionRefundWithRetry(
        convex,
        parsed.data.submissionId,
        viewerUserId,
        context.paymentId,
      );
    } catch (error) {
      if (whopRefundApplied) {
        logger.error("Whop refund succeeded but finalize failed", {
          route,
          method: "POST",
          event: "whop.payment.refund_finalize_failed_after_whop_success",
          submissionId: parsed.data.submissionId,
          paymentId: context.paymentId,
          errorMessage: getSafeErrorMessage(error),
        });
      }
      throw error;
    }

    return NextResponse.json(
      {
        success: true,
        submissionId: refunded?._id ?? parsed.data.submissionId,
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error("Submission refund route failed", {
      route,
      method: "POST",
      event: "whop.payment.refund_failed",
      status: 500,
      errorMessage: getSafeErrorMessage(error),
    });
    return NextResponse.json({ error: getSafeErrorMessage(error) }, { status: 500 });
  }
}
