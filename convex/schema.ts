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

export default defineSchema({
  requestTypes: defineTable({
    experienceId: v.string(),
    creatorId: v.string(),
    title: v.string(),
    description: v.string(),
    price: v.number(),
    responseWindowHours: v.number(),
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
    createdAt: v.number(),
    status: submissionStatus,
    paymentStatus,
    responseText: v.optional(v.string()),
    answeredAt: v.optional(v.number()),
  })
    .index("by_creator_status", ["creatorId", "status"])
    .index("by_experience_status", ["experienceId", "status"])
    .index("by_experience_user", ["experienceId", "userId"])
    .index("by_user", ["userId"])
    .index("by_request_type", ["requestTypeId"]),
});
