import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const submissionStatus = v.union(
  v.literal("pending"),
  v.literal("answered"),
  v.literal("expired"),
  v.literal("refunded"),
);

const paymentStatus = v.union(
  v.literal("held"),
  v.literal("released"),
  v.literal("refunded"),
);

const submissionPaymentStatus = v.union(
  v.literal("pending"),
  v.literal("paid"),
  v.literal("failed"),
  v.literal("refunded"),
);

const cashoutStatus = v.union(v.literal("pending"), v.literal("completed"));

export default defineSchema({
  requestTypes: defineTable({
    experienceId: v.string(),
    creatorId: v.string(),
    title: v.string(),
    description: v.string(),
    price: v.number(),
    responseWindowHours: v.number(),
    allowAttachments: v.optional(v.boolean()),
    isActive: v.boolean(),
    isDeleted: v.optional(v.boolean()),
  })
    .index("by_experience_creator", ["experienceId", "creatorId"])
    .index("by_experience_active", ["experienceId", "isActive"])
    .index("by_creator_active", ["creatorId", "isActive"]),
  submissions: defineTable({
    experienceId: v.string(),
    requestTypeId: v.id("requestTypes"),
    userId: v.string(),
    userName: v.string(),
    creatorId: v.string(),
    requestTypeTitleSnapshot: v.string(),
    amountUsd: v.number(),
    responseWindowHoursSnapshot: v.number(),
    submissionText: v.string(),
    attachment: v.optional(
      v.object({
        storageId: v.id("_storage"),
        fileName: v.string(),
        contentType: v.string(),
        sizeBytes: v.number(),
      }),
    ),
    createdAt: v.number(),
    status: submissionStatus,
    paymentStatus,
    responseText: v.optional(v.string()),
    answeredAt: v.optional(v.number()),
  })
    .index("by_creator_status", ["creatorId", "status"])
    .index("by_creator_experience_created_at", ["creatorId", "experienceId", "createdAt"])
    .index("by_experience_status", ["experienceId", "status"])
    .index("by_experience_user", ["experienceId", "userId"])
    .index("by_experience_user_created_at", ["experienceId", "userId", "createdAt"])
    .index("by_user", ["userId"])
    .index("by_request_type", ["requestTypeId"]),
  submissionPayments: defineTable({
    whopPaymentId: v.optional(v.string()),
    whopCheckoutConfigurationId: v.optional(v.string()),
    checkoutConfigurationId: v.optional(v.string()),
    experienceId: v.string(),
    requestTypeId: v.id("requestTypes"),
    viewerUserId: v.string(),
    viewerUserName: v.string(),
    submissionText: v.string(),
    amountUsd: v.number(),
    creatorIdSnapshot: v.string(),
    requestTypeTitleSnapshot: v.string(),
    responseWindowHoursSnapshot: v.number(),
    allowAttachmentsSnapshot: v.boolean(),
    attachmentToken: v.optional(v.string()),
    status: submissionPaymentStatus,
    submissionId: v.optional(v.id("submissions")),
    createdAt: v.number(),
    updatedAt: v.number(),
    expiresAt: v.optional(v.number()),
    lastReconciledAt: v.optional(v.number()),
    reconcileAttempts: v.optional(v.number()),
    refundedAt: v.optional(v.number()),
    lastError: v.optional(v.string()),
  })
    .index("by_whop_payment_id", ["whopPaymentId"])
    .index("by_whop_checkout_configuration_id", ["whopCheckoutConfigurationId"])
    .index("by_checkout_configuration_id", ["checkoutConfigurationId"])
    .index("by_submission_id", ["submissionId"])
    .index("by_experience_user", ["experienceId", "viewerUserId"])
    .index("by_status_updated_at", ["status", "updatedAt"]),
  creatorMetrics: defineTable({
    creatorId: v.string(),
    experienceId: v.string(),
    totalSubmissions: v.number(),
    totalPending: v.number(),
    totalAnswered: v.number(),
    moneyEarned: v.number(),
    moneyAvailable: v.number(),
    updatedAt: v.number(),
  }).index("by_creator_experience", ["creatorId", "experienceId"]),
  pendingSubmissionAttachments: defineTable({
    token: v.string(),
    experienceId: v.string(),
    requestTypeId: v.id("requestTypes"),
    viewerUserId: v.string(),
    storageId: v.id("_storage"),
    fileName: v.string(),
    contentType: v.string(),
    sizeBytes: v.number(),
    createdAt: v.number(),
    consumedAt: v.optional(v.number()),
  })
    .index("by_token", ["token"])
    .index("by_viewer_experience", ["viewerUserId", "experienceId"])
    .index("by_viewer_created_at", ["viewerUserId", "createdAt"]),
  cashouts: defineTable({
    experienceId: v.string(),
    creatorUserId: v.string(),
    destinationCompanyId: v.string(),
    originCompanyId: v.string(),
    grossAmountUsd: v.number(),
    creatorAmountUsd: v.number(),
    platformFeeUsd: v.number(),
    currency: v.string(),
    idempotenceKey: v.string(),
    transferId: v.optional(v.string()),
    status: cashoutStatus,
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_idempotence_key", ["idempotenceKey"])
    .index("by_experience_creator_status", ["experienceId", "creatorUserId", "status"]),
});
