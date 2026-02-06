import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listPendingForCreator = query({
  args: {
    creatorId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("submissions")
      .withIndex("by_creator_status", (q) =>
        q.eq("creatorId", args.creatorId).eq("status", "pending"),
      )
      .collect();
  },
});

export const createSubmission = mutation({
  args: {
    experienceId: v.string(),
    requestTypeId: v.id("requestTypes"),
    userId: v.string(),
    creatorId: v.string(),
  },
  handler: async (ctx, args) => {
    const submissionId = await ctx.db.insert("submissions", {
      experienceId: args.experienceId,
      requestTypeId: args.requestTypeId,
      userId: args.userId,
      creatorId: args.creatorId,
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
    responseText: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.submissionId);

    if (!existing) {
      throw new Error("Submission not found.");
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
