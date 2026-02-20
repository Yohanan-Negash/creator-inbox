import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
  applyCreatorMetricsDelta,
  consumePendingAttachmentForSubmission,
  ensureValidSubmissionText,
} from "./submissions";

function getSingleSubmissionPaymentRecord<
  T extends { _id: Id<"submissionPayments">; createdAt: number; status: string },
>(rows: Array<T>) {
  if (rows.length === 0) {
    return null;
  }

  const pendingRows = rows
    .filter((row) => row.status === "pending")
    .sort((a, b) => b.createdAt - a.createdAt);

  if (pendingRows.length > 0) {
    return pendingRows[0];
  }

  return rows.sort((a, b) => b.createdAt - a.createdAt)[0];
}

export const getRequestTypeQuote = query({
  args: {
    experienceId: v.string(),
    requestTypeId: v.id("requestTypes"),
  },
  handler: async (ctx, args) => {
    const requestType = await ctx.db.get(args.requestTypeId);
    if (!requestType) {
      throw new Error("Request not found.");
    }

    if (requestType.experienceId !== args.experienceId) {
      throw new Error("Request does not belong to this experience.");
    }

    if (!requestType.isActive || requestType.isDeleted === true) {
      throw new Error("Request is not active.");
    }

    return {
      requestTypeId: requestType._id,
      creatorId: requestType.creatorId,
      title: requestType.title,
      price: requestType.price,
      responseWindowHours: requestType.responseWindowHours,
      allowAttachments: requestType.allowAttachments === true,
    };
  },
});

export const upsertSubmissionPayment = mutation({
  args: {
    whopCheckoutConfigurationId: v.optional(v.string()),
    checkoutConfigurationId: v.optional(v.string()),
    experienceId: v.string(),
    requestTypeId: v.id("requestTypes"),
    viewerUserId: v.string(),
    viewerUserName: v.string(),
    submissionText: v.string(),
    amountUsd: v.number(),
    attachmentToken: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    ensureValidSubmissionText(args.submissionText);

    const requestType = await ctx.db.get(args.requestTypeId);
    if (!requestType) {
      throw new Error("Request not found.");
    }

    if (!requestType.isActive || requestType.isDeleted === true) {
      throw new Error("Request is not active.");
    }

    if (requestType.experienceId !== args.experienceId) {
      throw new Error("Request does not belong to this experience.");
    }

    if (requestType.price !== args.amountUsd) {
      throw new Error("Payment amount does not match request price.");
    }

    const now = Date.now();
    const paymentRowId = await ctx.db.insert("submissionPayments", {
      whopPaymentId: undefined,
      whopCheckoutConfigurationId: args.whopCheckoutConfigurationId,
      checkoutConfigurationId: args.checkoutConfigurationId,
      experienceId: args.experienceId,
      requestTypeId: args.requestTypeId,
      viewerUserId: args.viewerUserId,
      viewerUserName: args.viewerUserName,
      submissionText: args.submissionText,
      amountUsd: args.amountUsd,
      creatorIdSnapshot: requestType.creatorId,
      requestTypeTitleSnapshot: requestType.title,
      responseWindowHoursSnapshot: requestType.responseWindowHours,
      allowAttachmentsSnapshot: requestType.allowAttachments === true,
      attachmentToken: args.attachmentToken,
      status: "pending",
      createdAt: now,
      updatedAt: now,
      expiresAt: args.expiresAt,
    });

    return await ctx.db.get(paymentRowId);
  },
});

export const completeSubmissionPayment = mutation({
  args: {
    submissionPaymentId: v.id("submissionPayments"),
  },
  handler: async (ctx, args) => {
    const paymentRow = await ctx.db.get(args.submissionPaymentId);
    if (!paymentRow) {
      throw new Error("Payment row missing.");
    }

    if (paymentRow.submissionId) {
      const existingSubmission = await ctx.db.get(paymentRow.submissionId);

      return {
        submissionPaymentId: paymentRow._id,
        whopPaymentId: paymentRow.whopPaymentId ?? "",
        submissionId: paymentRow.submissionId,
        status: paymentRow.status,
        created: false,
        experienceId: paymentRow.experienceId,
        creatorUserId: paymentRow.creatorIdSnapshot,
        requesterUserId: paymentRow.viewerUserId,
        requesterUserName: paymentRow.viewerUserName,
        requestTypeTitle:
          existingSubmission?.requestTypeTitleSnapshot ?? paymentRow.requestTypeTitleSnapshot,
      };
    }

    if (paymentRow.status === "failed") {
      throw new Error("Payment failed.");
    }

    if (paymentRow.status === "refunded") {
      throw new Error("Payment already refunded.");
    }

    if (!paymentRow.whopPaymentId) {
      throw new Error("Payment is not linked to a provider payment id yet.");
    }

    const attachment = await consumePendingAttachmentForSubmission(ctx, {
      token: paymentRow.attachmentToken,
      viewerUserId: paymentRow.viewerUserId,
      experienceId: paymentRow.experienceId,
      requestTypeId: paymentRow.requestTypeId,
      allowAttachments: paymentRow.allowAttachmentsSnapshot === true,
    });

    const submissionId = await ctx.db.insert("submissions", {
      experienceId: paymentRow.experienceId,
      requestTypeId: paymentRow.requestTypeId,
      userId: paymentRow.viewerUserId,
      userName: paymentRow.viewerUserName,
      creatorId: paymentRow.creatorIdSnapshot,
      requestTypeTitleSnapshot: paymentRow.requestTypeTitleSnapshot,
      amountUsd: paymentRow.amountUsd,
      responseWindowHoursSnapshot: paymentRow.responseWindowHoursSnapshot,
      submissionText: paymentRow.submissionText,
      attachment,
      createdAt: Date.now(),
      status: "pending",
      paymentStatus: "held",
    });

    await applyCreatorMetricsDelta(ctx, {
      creatorId: paymentRow.creatorIdSnapshot,
      experienceId: paymentRow.experienceId,
      delta: {
        totalSubmissions: 1,
        totalPending: 1,
        moneyAvailable: paymentRow.amountUsd,
      },
    });

    await ctx.db.patch(paymentRow._id, {
      status: "paid",
      submissionId,
      updatedAt: Date.now(),
      lastError: undefined,
    });

    return {
      submissionPaymentId: paymentRow._id,
      whopPaymentId: paymentRow.whopPaymentId,
      submissionId,
      status: "paid" as const,
      created: true,
      experienceId: paymentRow.experienceId,
      creatorUserId: paymentRow.creatorIdSnapshot,
      requesterUserId: paymentRow.viewerUserId,
      requesterUserName: paymentRow.viewerUserName,
      requestTypeTitle: paymentRow.requestTypeTitleSnapshot,
    };
  },
});

export const finalizeCheckoutConfiguration = mutation({
  args: {
    submissionPaymentId: v.id("submissionPayments"),
    whopCheckoutConfigurationId: v.string(),
  },
  handler: async (ctx, args) => {
    const paymentRow = await ctx.db.get(args.submissionPaymentId);
    if (!paymentRow) {
      throw new Error("Payment row missing.");
    }

    if (
      paymentRow.whopCheckoutConfigurationId &&
      paymentRow.whopCheckoutConfigurationId !== args.whopCheckoutConfigurationId
    ) {
      throw new Error("Checkout configuration already finalized with a different id.");
    }

    await ctx.db.patch(paymentRow._id, {
      whopCheckoutConfigurationId: args.whopCheckoutConfigurationId,
      updatedAt: Date.now(),
      lastError: undefined,
    });

    return await ctx.db.get(paymentRow._id);
  },
});

export const attachWhopPaymentIdToSubmissionPayment = mutation({
  args: {
    submissionPaymentId: v.id("submissionPayments"),
    whopPaymentId: v.string(),
    whopCheckoutConfigurationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const paymentRow = await ctx.db.get(args.submissionPaymentId);
    if (!paymentRow) {
      throw new Error("Submission payment attempt not found.");
    }

    if (paymentRow.whopPaymentId && paymentRow.whopPaymentId !== args.whopPaymentId) {
      throw new Error("Submission payment attempt already linked to a different payment.");
    }

    await ctx.db.patch(paymentRow._id, {
      whopPaymentId: args.whopPaymentId,
      whopCheckoutConfigurationId:
        paymentRow.whopCheckoutConfigurationId ?? args.whopCheckoutConfigurationId,
      updatedAt: Date.now(),
      lastError: undefined,
    });

    return await ctx.db.get(paymentRow._id);
  },
});

export const attachPaymentIdToCheckoutConfiguration = mutation({
  args: {
    checkoutConfigurationId: v.string(),
    whopPaymentId: v.string(),
  },
  handler: async (ctx, args) => {
    const byPaymentId = await ctx.db
      .query("submissionPayments")
      .withIndex("by_whop_payment_id", (q) => q.eq("whopPaymentId", args.whopPaymentId))
      .collect();

    if (byPaymentId.length > 0) {
      return byPaymentId[0];
    }

    const rows = await ctx.db
      .query("submissionPayments")
      .withIndex("by_checkout_configuration_id", (q) =>
        q.eq("checkoutConfigurationId", args.checkoutConfigurationId),
      )
      .collect();

    if (rows.length === 0) {
      throw new Error("Pending checkout configuration not found.");
    }

    const paymentRow = getSingleSubmissionPaymentRecord(rows);
    if (!paymentRow) {
      throw new Error("Submission payment attempt is missing.");
    }

    if (paymentRow.whopPaymentId && paymentRow.whopPaymentId !== args.whopPaymentId) {
      throw new Error("Submission payment attempt already linked to a different payment.");
    }

    await ctx.db.patch(paymentRow._id, {
      whopPaymentId: args.whopPaymentId,
      updatedAt: Date.now(),
      lastError: undefined,
    });

    return await ctx.db.get(paymentRow._id);
  },
});

export const attachPaymentIdToWhopCheckoutConfiguration = mutation({
  args: {
    whopCheckoutConfigurationId: v.string(),
    whopPaymentId: v.string(),
  },
  handler: async (ctx, args) => {
    const byPaymentId = await ctx.db
      .query("submissionPayments")
      .withIndex("by_whop_payment_id", (q) => q.eq("whopPaymentId", args.whopPaymentId))
      .collect();

    if (byPaymentId.length > 0) {
      return byPaymentId[0];
    }

    const rows = await ctx.db
      .query("submissionPayments")
      .withIndex("by_whop_checkout_configuration_id", (q) =>
        q.eq("whopCheckoutConfigurationId", args.whopCheckoutConfigurationId),
      )
      .collect();

    if (rows.length === 0) {
      throw new Error("Pending whop checkout configuration not found.");
    }

    const paymentRow = getSingleSubmissionPaymentRecord(rows);
    if (!paymentRow) {
      throw new Error("Submission payment attempt is missing.");
    }

    if (paymentRow.whopPaymentId && paymentRow.whopPaymentId !== args.whopPaymentId) {
      throw new Error("Submission payment attempt already linked to a different payment.");
    }

    await ctx.db.patch(paymentRow._id, {
      whopPaymentId: args.whopPaymentId,
      updatedAt: Date.now(),
      lastError: undefined,
    });

    return await ctx.db.get(paymentRow._id);
  },
});

export const markSubmissionPaymentFailed = mutation({
  args: {
    submissionPaymentId: v.id("submissionPayments"),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const paymentRow = await ctx.db.get(args.submissionPaymentId);
    if (!paymentRow) {
      return null;
    }

    if (paymentRow.submissionId) {
      return paymentRow;
    }

    await ctx.db.patch(paymentRow._id, {
      status: "failed",
      updatedAt: Date.now(),
      lastError: args.errorMessage,
    });

    return await ctx.db.get(paymentRow._id);
  },
});

export const findPendingPaymentForUser = query({
  args: {
    experienceId: v.string(),
    requestTypeId: v.id("requestTypes"),
    viewerUserId: v.string(),
    submissionText: v.string(),
    attachmentToken: v.optional(v.string()),
    maxAgeMs: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const minCreatedAt = now - args.maxAgeMs;

    const rows = await ctx.db
      .query("submissionPayments")
      .withIndex("by_experience_user", (q) =>
        q.eq("experienceId", args.experienceId).eq("viewerUserId", args.viewerUserId),
      )
      .collect();

    const match = rows
      .filter(
        (row) =>
          row.status === "pending" &&
          row.createdAt >= minCreatedAt &&
          row.requestTypeId === args.requestTypeId &&
          row.submissionText === args.submissionText &&
          (row.attachmentToken ?? undefined) === (args.attachmentToken ?? undefined) &&
          Boolean(row.whopCheckoutConfigurationId) &&
          (row.expiresAt === undefined || row.expiresAt > now),
      )
      .sort((a, b) => b.createdAt - a.createdAt)[0];

    if (!match) {
      return null;
    }

    return {
      submissionPaymentId: match._id,
      whopCheckoutConfigurationId: match.whopCheckoutConfigurationId ?? null,
      expiresAt: match.expiresAt ?? null,
    };
  },
});

export const getSubmissionPaymentStatusForUser = query({
  args: {
    submissionPaymentId: v.id("submissionPayments"),
    viewerUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const paymentRow = await ctx.db.get(args.submissionPaymentId);
    if (!paymentRow || paymentRow.viewerUserId !== args.viewerUserId) {
      return null;
    }

    return {
      submissionPaymentId: paymentRow._id,
      status: paymentRow.status,
      submissionId: paymentRow.submissionId ?? null,
      lastError: paymentRow.lastError ?? null,
      whopPaymentId: paymentRow.whopPaymentId ?? null,
      whopCheckoutConfigurationId: paymentRow.whopCheckoutConfigurationId ?? null,
      expiresAt: paymentRow.expiresAt ?? null,
    };
  },
});

export const listStalePendingPaymentAttempts = internalQuery({
  args: {
    olderThanMs: v.number(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - args.olderThanMs;

    const rows = await ctx.db
      .query("submissionPayments")
      .withIndex("by_status_updated_at", (q) =>
        q.eq("status", "pending").lt("updatedAt", cutoff),
      )
      .order("asc")
      .take(args.limit);

    return rows.map((row) => ({
      submissionPaymentId: row._id,
      status: row.status,
      whopPaymentId: row.whopPaymentId ?? null,
      whopCheckoutConfigurationId: row.whopCheckoutConfigurationId ?? null,
      updatedAt: row.updatedAt,
      expiresAt: row.expiresAt ?? null,
      reconcileAttempts: row.reconcileAttempts ?? 0,
    }));
  },
});

export const touchReconciliationState = internalMutation({
  args: {
    submissionPaymentId: v.id("submissionPayments"),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.submissionPaymentId);
    if (!row) {
      return null;
    }

    await ctx.db.patch(row._id, {
      lastReconciledAt: Date.now(),
      reconcileAttempts: (row.reconcileAttempts ?? 0) + 1,
      updatedAt: Date.now(),
      lastError: args.errorMessage,
    });

    return await ctx.db.get(row._id);
  },
});

export const getRefundContext = query({
  args: {
    submissionId: v.id("submissions"),
    viewerUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) {
      throw new Error("Submission not found.");
    }

    if (submission.creatorId !== args.viewerUserId) {
      throw new Error("Unauthorized");
    }

    if (submission.status !== "pending" && submission.status !== "refunded") {
      throw new Error("Only pending submissions can be refunded.");
    }

    const paymentRows = await ctx.db
      .query("submissionPayments")
      .withIndex("by_submission_id", (q) => q.eq("submissionId", args.submissionId))
      .collect();

    const paymentRow = paymentRows.length > 0 ? paymentRows[0] : null;

    return {
      submissionId: submission._id,
      status: submission.status,
      whopPaymentId: paymentRow?.whopPaymentId ?? null,
      amountUsd: submission.amountUsd,
    };
  },
});

export const finalizeSubmissionRefund = mutation({
  args: {
    submissionId: v.id("submissions"),
    viewerUserId: v.string(),
    whopPaymentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) {
      throw new Error("Submission not found.");
    }

    if (submission.creatorId !== args.viewerUserId) {
      throw new Error("Unauthorized");
    }

    if (submission.status === "refunded") {
      return await ctx.db.get(args.submissionId);
    }

    if (submission.status !== "pending") {
      throw new Error("Only pending submissions can be refunded.");
    }

    await ctx.db.patch(args.submissionId, {
      status: "refunded",
      paymentStatus: "refunded",
    });

    await applyCreatorMetricsDelta(ctx, {
      creatorId: submission.creatorId,
      experienceId: submission.experienceId,
      delta: {
        totalPending: -1,
        moneyAvailable: -submission.amountUsd,
      },
    });

    const paymentRows = await ctx.db
      .query("submissionPayments")
      .withIndex("by_submission_id", (q) => q.eq("submissionId", args.submissionId))
      .collect();

    const paymentRow = args.whopPaymentId
      ? paymentRows.find((row) => row.whopPaymentId === args.whopPaymentId) ?? null
      : paymentRows[0] ?? null;

    if (paymentRow) {
      await ctx.db.patch(paymentRow._id, {
        status: "refunded",
        refundedAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return await ctx.db.get(args.submissionId);
  },
});

export const getOrCreatePendingCashout = mutation({
  args: {
    experienceId: v.string(),
    creatorUserId: v.string(),
    destinationCompanyId: v.string(),
    originCompanyId: v.string(),
    grossAmountUsd: v.number(),
    creatorAmountUsd: v.number(),
    platformFeeUsd: v.number(),
    currency: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.grossAmountUsd <= 0 || args.creatorAmountUsd <= 0) {
      throw new Error("Cashout amount must be greater than 0.");
    }

    const pendingRows = await ctx.db
      .query("cashouts")
      .withIndex("by_experience_creator_status", (q) =>
        q
          .eq("experienceId", args.experienceId)
          .eq("creatorUserId", args.creatorUserId)
          .eq("status", "pending"),
      )
      .collect();

    const matchingPending = pendingRows.find(
      (row) =>
        row.grossAmountUsd === args.grossAmountUsd &&
        row.creatorAmountUsd === args.creatorAmountUsd &&
        row.destinationCompanyId === args.destinationCompanyId,
    );

    if (matchingPending) {
      return matchingPending;
    }

    const now = Date.now();
    const idempotenceKey = `cashout:${args.experienceId}:${args.creatorUserId}:${Math.round(
      args.grossAmountUsd * 100,
    )}:${now}`;

    const cashoutId = await ctx.db.insert("cashouts", {
      experienceId: args.experienceId,
      creatorUserId: args.creatorUserId,
      destinationCompanyId: args.destinationCompanyId,
      originCompanyId: args.originCompanyId,
      grossAmountUsd: args.grossAmountUsd,
      creatorAmountUsd: args.creatorAmountUsd,
      platformFeeUsd: args.platformFeeUsd,
      currency: args.currency,
      idempotenceKey,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(cashoutId);
  },
});

export const finalizeCashout = mutation({
  args: {
    cashoutId: v.id("cashouts"),
    viewerUserId: v.string(),
    transferId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const cashout = await ctx.db.get(args.cashoutId);
    if (!cashout) {
      throw new Error("Cashout not found.");
    }

    if (cashout.creatorUserId !== args.viewerUserId) {
      throw new Error("Unauthorized");
    }

    if (cashout.status === "completed") {
      return cashout;
    }

    await applyCreatorMetricsDelta(ctx, {
      creatorId: cashout.creatorUserId,
      experienceId: cashout.experienceId,
      delta: {
        moneyEarned: -cashout.grossAmountUsd,
      },
    });

    const now = Date.now();
    await ctx.db.patch(args.cashoutId, {
      status: "completed",
      transferId: args.transferId ?? cashout.transferId,
      completedAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(args.cashoutId);
  },
});
