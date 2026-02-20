import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  extractWhopPaymentStatus,
  getSubmissionPaymentIdFromPayment,
  getWhopCheckoutConfigurationIdFromPayment,
  getWhopPaymentId,
} from "../lib/whop-payments";
import { getWhopSdk } from "../lib/whop";

type StalePendingAttempt = {
  submissionPaymentId: Id<"submissionPayments">;
  status: "pending" | "paid" | "failed" | "refunded";
  whopPaymentId: string | null;
  whopCheckoutConfigurationId: string | null;
  updatedAt: number;
  expiresAt: number | null;
  reconcileAttempts: number;
};

function getPlatformCompanyIdForReconciliation() {
  const companyId = process.env.WHOP_COMPANY_ID?.trim() ?? "";
  if (!companyId || !companyId.startsWith("biz_")) {
    return null;
  }

  return companyId;
}

async function notifyAdminSubmissionCreatedFromCron(args: {
  whopSdk: ReturnType<typeof getWhopSdk>;
  experienceId: string;
  creatorUserId: string;
  requesterUserName: string;
  requestTypeTitle: string;
}) {
  const notifications = (args.whopSdk as {
    notifications?: {
      create?: (input: {
        experience_id: string;
        user_ids: string[];
        title: string;
        content: string;
        rest_path: string;
        icon_user_id: string;
      }) => Promise<unknown>;
    };
  }).notifications;

  if (!notifications?.create) {
    return;
  }

  const requesterName = args.requesterUserName.trim() || "A member";
  const requestType = args.requestTypeTitle.trim() || "a request";
  await notifications.create({
    experience_id: args.experienceId,
    user_ids: [args.creatorUserId],
    title: "New request",
    content: `${requesterName} submitted ${requestType}.`,
    rest_path: `/experiences/${encodeURIComponent(args.experienceId)}/admin`,
    icon_user_id: args.creatorUserId,
  });
}

export const reconcileStalePendingPaymentAttempts = internalAction({
  args: {
    olderThanMs: v.number(),
    limit: v.number(),
    maxListScan: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ scanned: number; attached: number; paid: number; failed: number; stillPending: number }> => {
    const staleAttempts = (await ctx.runQuery(internal.payments.listStalePendingPaymentAttempts, {
      olderThanMs: args.olderThanMs,
      limit: args.limit,
    })) as StalePendingAttempt[];

    if (staleAttempts.length === 0) {
      return {
        scanned: 0,
        attached: 0,
        paid: 0,
        failed: 0,
        stillPending: 0,
      };
    }

    const attemptsNeedingLookup = staleAttempts.filter(
      (attempt: StalePendingAttempt) =>
        !attempt.whopPaymentId && Boolean(attempt.whopCheckoutConfigurationId),
    );
    const whopSdk = getWhopSdk();
    const maxListScan = Math.max(args.maxListScan ?? 1000, attemptsNeedingLookup.length * 20);

    const byAttemptId = new Map<string, unknown>();
    const byCheckoutId = new Map<string, unknown>();
    const unresolvedAttemptIds = new Set(
      attemptsNeedingLookup.map((attempt) => String(attempt.submissionPaymentId)),
    );
    const unresolvedCheckoutIds = new Set(
      attemptsNeedingLookup
        .map((attempt) => attempt.whopCheckoutConfigurationId)
        .filter((value): value is string => Boolean(value)),
    );

    if (attemptsNeedingLookup.length > 0) {
      const companyId = getPlatformCompanyIdForReconciliation();
      if (companyId) {
        const list = (whopSdk as {
          payments: { list: (input: unknown) => AsyncIterable<unknown> };
        }).payments.list({
          company_id: companyId,
          statuses: ["draft", "open", "pending", "paid", "void", "uncollectible", "unresolved"],
          direction: "desc",
          order: "created_at",
          first: maxListScan,
        });

        let seen = 0;
        for await (const payment of list) {
          seen += 1;
          if (seen > maxListScan) {
            break;
          }

          const attemptId = getSubmissionPaymentIdFromPayment(payment);
          if (attemptId) {
            byAttemptId.set(attemptId, payment);
            unresolvedAttemptIds.delete(attemptId);
          }

          const checkoutId = getWhopCheckoutConfigurationIdFromPayment(payment);
          if (checkoutId) {
            byCheckoutId.set(checkoutId, payment);
            unresolvedCheckoutIds.delete(checkoutId);
          }

          if (unresolvedAttemptIds.size === 0 && unresolvedCheckoutIds.size === 0) {
            break;
          }
        }
      }
    }

    let attached = 0;
    let paid = 0;
    let failed = 0;
    let stillPending = 0;

    for (const attempt of staleAttempts) {
      let providerPayment: unknown | null = null;

      if (attempt.whopPaymentId) {
        providerPayment = await (whopSdk as {
          payments: { retrieve: (id: string) => Promise<unknown> };
        }).payments.retrieve(attempt.whopPaymentId);
      } else {
        const fromAttemptId = byAttemptId.get(String(attempt.submissionPaymentId));
        if (fromAttemptId) {
          providerPayment = fromAttemptId;
        } else if (attempt.whopCheckoutConfigurationId) {
          providerPayment = byCheckoutId.get(attempt.whopCheckoutConfigurationId) ?? null;
        }
      }

      let errorMessage: string | null = null;

      if (!providerPayment) {
        stillPending += 1;
        errorMessage = "No provider payment found during reconciliation.";
      } else {
        const resolvedPaymentId = getWhopPaymentId(providerPayment);
        if (resolvedPaymentId && resolvedPaymentId !== attempt.whopPaymentId) {
          await ctx.runMutation(api.payments.attachWhopPaymentIdToSubmissionPayment, {
            submissionPaymentId: attempt.submissionPaymentId,
            whopPaymentId: resolvedPaymentId,
            whopCheckoutConfigurationId: attempt.whopCheckoutConfigurationId ?? undefined,
          });
          attached += 1;
        }

        const providerStatus = extractWhopPaymentStatus(providerPayment);
        if (providerStatus === "paid") {
          const completion = await ctx.runMutation(api.payments.completeSubmissionPayment, {
            submissionPaymentId: attempt.submissionPaymentId,
          });

          if (completion.created) {
            await notifyAdminSubmissionCreatedFromCron({
              whopSdk,
              experienceId: completion.experienceId,
              creatorUserId: completion.creatorUserId,
              requesterUserName: completion.requesterUserName,
              requestTypeTitle: completion.requestTypeTitle,
            });
          }

          paid += 1;
        } else if (providerStatus === "failed" || providerStatus === "void") {
          await ctx.runMutation(api.payments.markSubmissionPaymentFailed, {
            submissionPaymentId: attempt.submissionPaymentId,
            errorMessage: "Payment was not successful.",
          });
          failed += 1;
        } else {
          stillPending += 1;
        }
      }

      await ctx.runMutation(internal.payments.touchReconciliationState, {
        submissionPaymentId: attempt.submissionPaymentId,
        errorMessage: errorMessage ?? undefined,
      });
    }

    return {
      scanned: staleAttempts.length,
      attached,
      paid,
      failed,
      stillPending,
    };
  },
});
