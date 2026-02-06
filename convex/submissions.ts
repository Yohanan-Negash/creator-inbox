import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listPendingForCreator = query({
  args: {
    experienceId: v.string(),
    viewerUserId: v.string(),
    creatorId: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.viewerUserId !== args.creatorId) {
      throw new Error("Unauthorized");
    }

    return await ctx.db
      .query("submissions")
      .withIndex("by_creator_status", (q) =>
        q.eq("creatorId", args.creatorId).eq("status", "pending"),
      )
      .filter((q) => q.eq(q.field("experienceId"), args.experienceId))
      .collect();
  },
});

export const listVisibleForUser = query({
  args: {
    experienceId: v.string(),
    viewerUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const asRequester = await ctx.db
      .query("submissions")
      .withIndex("by_experience_user", (q) =>
        q.eq("experienceId", args.experienceId).eq("userId", args.viewerUserId),
      )
      .collect();

    const asCreator = await ctx.db
      .query("submissions")
      .withIndex("by_creator_status", (q) =>
        q.eq("creatorId", args.viewerUserId).eq("status", "pending"),
      )
      .filter((q) => q.eq(q.field("experienceId"), args.experienceId))
      .collect();

    const answeredByCreator = await ctx.db
      .query("submissions")
      .withIndex("by_creator_status", (q) =>
        q.eq("creatorId", args.viewerUserId).eq("status", "answered"),
      )
      .filter((q) => q.eq(q.field("experienceId"), args.experienceId))
      .collect();

    const map = new Map<string, (typeof asRequester)[number]>();
    for (const item of asRequester) {
      map.set(item._id, item);
    }
    for (const item of asCreator) {
      map.set(item._id, item);
    }
    for (const item of answeredByCreator) {
      map.set(item._id, item);
    }

    return Array.from(map.values());
  },
});

export const getSubmission = query({
  args: {
    submissionId: v.id("submissions"),
    viewerUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) {
      return null;
    }

    const canView =
      submission.userId === args.viewerUserId ||
      submission.creatorId === args.viewerUserId;

    if (!canView) {
      throw new Error("Unauthorized");
    }

    return submission;
  },
});

export const createSubmission = mutation({
  args: {
    experienceId: v.string(),
    requestTypeId: v.id("requestTypes"),
    viewerUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const requestType = await ctx.db.get(args.requestTypeId);
    if (!requestType) {
      throw new Error("Request type not found.");
    }

    if (!requestType.isActive) {
      throw new Error("Request type is not active.");
    }

    if (requestType.experienceId !== args.experienceId) {
      throw new Error("Request type does not belong to this experience.");
    }

    const submissionId = await ctx.db.insert("submissions", {
      experienceId: args.experienceId,
      requestTypeId: args.requestTypeId,
      userId: args.viewerUserId,
      creatorId: requestType.creatorId,
      createdAt: Date.now(),
      status: "pending",
      paymentStatus: "held",
    });

    return await ctx.db.get(submissionId);
  },
});

export const answerSubmission = mutation({
  args: {
    submissionId: v.id("submissions"),
    viewerUserId: v.string(),
    responseText: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.submissionId);

    if (!existing) {
      throw new Error("Submission not found.");
    }

    if (existing.creatorId !== args.viewerUserId) {
      throw new Error("Unauthorized");
    }

    if (existing.status !== "pending") {
      throw new Error("Submission is not pending.");
    }

    await ctx.db.patch(args.submissionId, {
      responseText: args.responseText,
      status: "answered",
      paymentStatus: "released",
      answeredAt: Date.now(),
    });

    return await ctx.db.get(args.submissionId);
  },
});
