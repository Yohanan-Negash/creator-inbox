import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { getSafeErrorMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getWhopSdk } from "@/lib/whop";
import { getConvexServerClient } from "@/lib/convex-server";
import {
  extractWhopPaymentStatus,
  getSubmissionCheckoutContextIdFromPayment,
  getWhopCheckoutConfigurationIdFromPayment,
  getWhopPaymentId,
} from "@/lib/whop-payments";

function getPlatformCompanyId() {
  const companyId = process.env.WHOP_COMPANY_ID?.trim() ?? "";
  if (!companyId || !companyId.startsWith("biz_")) {
    return null;
  }

  return companyId;
}

export async function GET(request: NextRequest) {
  const experienceId = request.nextUrl.searchParams.get("experienceId") ?? "";
  const paymentId = request.nextUrl.searchParams.get("paymentId") ?? "";
  const devUserToken = request.nextUrl.searchParams.get("whop-dev-user-token") ?? "";
  const route = "/api/whop/payments/submission-status";

  if (!experienceId || !paymentId) {
    return NextResponse.json({ error: "Missing experienceId or paymentId." }, { status: 400 });
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
      paymentId,
      viewerUserId,
    });

    if (!status && paymentId.startsWith("pay_")) {
      const payment = await (whopSdk as {
        payments: { retrieve: (id: string) => Promise<unknown> };
      }).payments.retrieve(paymentId);

      const checkoutContextId = getSubmissionCheckoutContextIdFromPayment(payment);
      const whopCheckoutConfigurationId = getWhopCheckoutConfigurationIdFromPayment(payment);

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

      if (checkoutContextId || whopCheckoutConfigurationId) {
        status = await convex.query(api.payments.getSubmissionPaymentStatusForUser, {
          paymentId,
          viewerUserId,
        });
      }
    }

    if (!status) {
      return NextResponse.json(
        {
          paymentId,
          status: "pending",
          submissionCreated: false,
          submissionId: null,
          error: null,
        },
        { status: 200 },
      );
    }

    if (status.status === "pending") {
      const paymentIdForLookup = status.paymentId;

      if (paymentIdForLookup.startsWith("pending:")) {
        const whopCheckoutConfigurationId = paymentIdForLookup.slice("pending:".length);
        const companyId = getPlatformCompanyId();

        if (companyId && whopCheckoutConfigurationId) {
          const payments = (whopSdk as {
            payments: { list: (input: unknown) => AsyncIterable<unknown> };
          }).payments.list({
            company_id: companyId,
            statuses: ["paid", "pending", "open", "void", "uncollectible", "unresolved"],
            first: 50,
            created_after: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            direction: "desc",
            order: "created_at",
          });

          for await (const payment of payments) {
            const paymentWhopCheckoutId = getWhopCheckoutConfigurationIdFromPayment(payment);
            if (paymentWhopCheckoutId !== whopCheckoutConfigurationId) {
              continue;
            }

            const resolvedPaymentId = getWhopPaymentId(payment);
            if (!resolvedPaymentId) {
              break;
            }

            await convex.mutation(api.payments.attachPaymentIdToWhopCheckoutConfiguration, {
              whopCheckoutConfigurationId,
              paymentId: resolvedPaymentId,
            });

            const resolvedStatus = extractWhopPaymentStatus(payment);
            if (resolvedStatus === "paid") {
              await convex.mutation(api.payments.completeSubmissionPayment, {
                paymentId: resolvedPaymentId,
              });
            }

            if (resolvedStatus === "failed" || resolvedStatus === "void") {
              await convex.mutation(api.payments.markSubmissionPaymentFailed, {
                paymentId: resolvedPaymentId,
                errorMessage: "Payment failed before confirmation.",
              });
            }

            break;
          }
        }
      }

      if (paymentIdForLookup.startsWith("pay_")) {
        const payment = await (whopSdk as {
          payments: { retrieve: (id: string) => Promise<unknown> };
        }).payments.retrieve(paymentIdForLookup);
        const paymentStatus = extractWhopPaymentStatus(payment);

        if (paymentStatus === "paid") {
          await convex.mutation(api.payments.completeSubmissionPayment, {
            paymentId: paymentIdForLookup,
          });
        }

        if (paymentStatus === "failed" || paymentStatus === "void") {
          await convex.mutation(api.payments.markSubmissionPaymentFailed, {
            paymentId: paymentIdForLookup,
            errorMessage: "Payment failed before confirmation.",
          });
        }
      }

      status = await convex.query(api.payments.getSubmissionPaymentStatusForUser, {
        paymentId,
        viewerUserId,
      });
    }

    return NextResponse.json(
      {
        paymentId,
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
      paymentId,
      errorMessage: getSafeErrorMessage(error),
    });

    return NextResponse.json({ error: getSafeErrorMessage(error) }, { status: 500 });
  }
}
