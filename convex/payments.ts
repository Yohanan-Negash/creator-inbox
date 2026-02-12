import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
  applyCreatorMetricsDelta,
  ensureValidSubmissionText,
} from "./submissions";

function getSinglePaymentRecordByPaymentId(rows: Array<{ _id: Id<"submissionPayments"> }>) {
  if (rows.length === 0) {
    return null;
  }

  return rows[0];
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
    };
  },
});

export const upsertSubmissionPayment = mutation({
  args: {
    paymentId: v.string(),
    whopCheckoutConfigurationId: v.optional(v.string()),
    checkoutConfigurationId: v.optional(v.string()),
    experienceId: v.string(),
    requestTypeId: v.id("requestTypes"),
    viewerUserId: v.string(),
    viewerUserName: v.string(),
    submissionText: v.string(),
    amountUsd: v.number(),
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

    const existing = await ctx.db
      .query("submissionPayments")
      .withIndex("by_payment_id", (q) => q.eq("paymentId", args.paymentId))
      .collect();

    const existingRecord = getSinglePaymentRecordByPaymentId(existing);
    if (existingRecord) {
      const row = await ctx.db.get(existingRecord._id);
      if (!row) {
        throw new Error("Payment row missing.");
      }

      return row;
    }

    const now = Date.now();
    const paymentRowId = await ctx.db.insert("submissionPayments", {
      paymentId: args.paymentId,
      whopCheckoutConfigurationId: args.whopCheckoutConfigurationId,
      checkoutConfigurationId: args.checkoutConfigurationId,
      experienceId: args.experienceId,
      requestTypeId: args.requestTypeId,
      viewerUserId: args.viewerUserId,
      viewerUserName: args.viewerUserName,
      submissionText: args.submissionText,
      amountUsd: args.amountUsd,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(paymentRowId);
  },
});

export const completeSubmissionPayment = mutation({
  args: {
    paymentId: v.string(),
  },
  handler: async (ctx, args) => {
    const matches = await ctx.db
      .query("submissionPayments")
      .withIndex("by_payment_id", (q) => q.eq("paymentId", args.paymentId))
      .collect();

    const existing = getSinglePaymentRecordByPaymentId(matches);
    if (!existing) {
      throw new Error("Payment record not found.");
    }

    const paymentRow = await ctx.db.get(existing._id);
    if (!paymentRow) {
      throw new Error("Payment row missing.");
    }

    if (paymentRow.submissionId) {
      const existingSubmission = await ctx.db.get(paymentRow.submissionId);

      return {
        paymentId: paymentRow.paymentId,
        submissionId: paymentRow.submissionId,
        status: paymentRow.status,
        created: false,
        experienceId: paymentRow.experienceId,
        creatorUserId: existingSubmission?.creatorId ?? "",
        requesterUserId: paymentRow.viewerUserId,
        requesterUserName: paymentRow.viewerUserName,
        requestTypeTitle: existingSubmission?.requestTypeTitleSnapshot ?? "",
      };
    }

    if (paymentRow.status === "failed") {
      throw new Error("Payment failed.");
    }

    if (paymentRow.status === "refunded") {
      throw new Error("Payment already refunded.");
    }

    const requestType = await ctx.db.get(paymentRow.requestTypeId);
    if (!requestType) {
      throw new Error("Request not found.");
    }

    if (!requestType.isActive || requestType.isDeleted === true) {
      throw new Error("Request is not active.");
    }

    if (requestType.experienceId !== paymentRow.experienceId) {
      throw new Error("Request does not belong to this experience.");
    }

    const submissionId = await ctx.db.insert("submissions", {
      experienceId: paymentRow.experienceId,
      requestTypeId: paymentRow.requestTypeId,
      userId: paymentRow.viewerUserId,
      userName: paymentRow.viewerUserName,
      creatorId: requestType.creatorId,
      requestTypeTitleSnapshot: requestType.title,
      amountUsd: requestType.price,
      responseWindowHoursSnapshot: requestType.responseWindowHours,
      submissionText: paymentRow.submissionText,
      createdAt: Date.now(),
      status: "pending",
      paymentStatus: "held",
    });

    await applyCreatorMetricsDelta(ctx, {
      creatorId: requestType.creatorId,
      experienceId: paymentRow.experienceId,
      delta: {
        totalSubmissions: 1,
        totalPending: 1,
        moneyAvailable: requestType.price,
      },
    });

    await ctx.db.patch(paymentRow._id, {
      status: "paid",
      submissionId,
      updatedAt: Date.now(),
      lastError: undefined,
    });

    return {
      paymentId: paymentRow.paymentId,
      submissionId,
      status: "paid" as const,
      created: true,
      experienceId: paymentRow.experienceId,
      creatorUserId: requestType.creatorId,
      requesterUserId: paymentRow.viewerUserId,
      requesterUserName: paymentRow.viewerUserName,
      requestTypeTitle: requestType.title,
    };
  },
});

export const attachPaymentIdToCheckoutConfiguration = mutation({
  args: {
    checkoutConfigurationId: v.string(),
    paymentId: v.string(),
  },
  handler: async (ctx, args) => {
    const byPaymentId = await ctx.db
      .query("submissionPayments")
      .withIndex("by_payment_id", (q) => q.eq("paymentId", args.paymentId))
      .collect();

    if (byPaymentId.length > 0) {
      return await ctx.db.get(byPaymentId[0]._id);
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

    const paymentRow = await ctx.db.get(rows[0]._id);
    if (!paymentRow) {
      throw new Error("Payment row missing.");
    }

    await ctx.db.patch(paymentRow._id, {
      paymentId: args.paymentId,
      whopCheckoutConfigurationId:
        paymentRow.whopCheckoutConfigurationId ??
        (paymentRow.paymentId.startsWith("pending:")
          ? paymentRow.paymentId.slice("pending:".length)
          : undefined),
      updatedAt: Date.now(),
    });

    return await ctx.db.get(paymentRow._id);
  },
});

export const attachPaymentIdToWhopCheckoutConfiguration = mutation({
  args: {
    whopCheckoutConfigurationId: v.string(),
    paymentId: v.string(),
  },
  handler: async (ctx, args) => {
    const byPaymentId = await ctx.db
      .query("submissionPayments")
      .withIndex("by_payment_id", (q) => q.eq("paymentId", args.paymentId))
      .collect();

    if (byPaymentId.length > 0) {
      return await ctx.db.get(byPaymentId[0]._id);
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

    const paymentRow = await ctx.db.get(rows[0]._id);
    if (!paymentRow) {
      throw new Error("Payment row missing.");
    }

    await ctx.db.patch(paymentRow._id, {
      paymentId: args.paymentId,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(paymentRow._id);
  },
});

export const markSubmissionPaymentFailed = mutation({
  args: {
    paymentId: v.string(),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const matches = await ctx.db
      .query("submissionPayments")
      .withIndex("by_payment_id", (q) => q.eq("paymentId", args.paymentId))
      .collect();

    const existing = getSinglePaymentRecordByPaymentId(matches);
    if (!existing) {
      return null;
    }

    const paymentRow = await ctx.db.get(existing._id);
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
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("submissionPayments")
      .withIndex("by_experience_user", (q) =>
        q.eq("experienceId", args.experienceId).eq("viewerUserId", args.viewerUserId),
      )
      .collect();

    const match = rows.find(
      (row) =>
        row.status === "pending" &&
        row.requestTypeId === args.requestTypeId &&
        row.submissionText === args.submissionText,
    );

    if (!match) {
      return null;
    }

    return {
      paymentId: match.paymentId,
      checkoutConfigurationId: match.checkoutConfigurationId ?? null,
    };
  },
});

export const getSubmissionPaymentStatusForUser = query({
  args: {
    paymentId: v.string(),
    viewerUserId: v.string(),
  },
  handler: async (ctx, args) => {
    let matches = await ctx.db
      .query("submissionPayments")
      .withIndex("by_payment_id", (q) => q.eq("paymentId", args.paymentId))
      .collect();

    if (matches.length === 0 && args.paymentId.startsWith("pending:")) {
      const whopCheckoutConfigurationId = args.paymentId.slice("pending:".length);
      if (whopCheckoutConfigurationId) {
        matches = await ctx.db
          .query("submissionPayments")
          .withIndex("by_whop_checkout_configuration_id", (q) =>
            q.eq("whopCheckoutConfigurationId", whopCheckoutConfigurationId),
          )
          .collect();
      }
    }

    const existing = getSinglePaymentRecordByPaymentId(matches);
    if (!existing) {
      return null;
    }

    const paymentRow = await ctx.db.get(existing._id);
    if (!paymentRow || paymentRow.viewerUserId !== args.viewerUserId) {
      return null;
    }

    return {
      paymentId: paymentRow.paymentId,
      status: paymentRow.status,
      submissionId: paymentRow.submissionId ?? null,
      lastError: paymentRow.lastError ?? null,
    };
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
      paymentId: paymentRow?.paymentId ?? null,
      amountUsd: submission.amountUsd,
    };
  },
});

export const finalizeSubmissionRefund = mutation({
  args: {
    submissionId: v.id("submissions"),
    viewerUserId: v.string(),
    paymentId: v.optional(v.string()),
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

    const paymentId = args.paymentId;
    if (paymentId) {
      const paymentRows = await ctx.db
        .query("submissionPayments")
        .withIndex("by_payment_id", (q) => q.eq("paymentId", paymentId))
        .collect();

      if (paymentRows.length > 0) {
        await ctx.db.patch(paymentRows[0]._id, {
          status: "refunded",
          refundedAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
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
