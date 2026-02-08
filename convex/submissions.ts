import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

const MIN_SUBMISSION_TEXT_LENGTH = 8;

function ensureValidSubmissionText(submissionText: string) {
  if (submissionText.trim().length < MIN_SUBMISSION_TEXT_LENGTH) {
    throw new Error(
      `Submission text must be at least ${MIN_SUBMISSION_TEXT_LENGTH} characters.`,
    );
  }
}

async function listCreatorSubmissionsForExperience(
  ctx: QueryCtx,
  experienceId: string,
  creatorId: string,
) {
  const pending = await ctx.db
    .query("submissions")
    .withIndex("by_creator_status", (q) =>
      q.eq("creatorId", creatorId).eq("status", "pending"),
    )
    .filter((q) => q.eq(q.field("experienceId"), experienceId))
    .collect();

  const answered = await ctx.db
    .query("submissions")
    .withIndex("by_creator_status", (q) =>
      q.eq("creatorId", creatorId).eq("status", "answered"),
    )
    .filter((q) => q.eq(q.field("experienceId"), experienceId))
    .collect();

  const expired = await ctx.db
    .query("submissions")
    .withIndex("by_creator_status", (q) =>
      q.eq("creatorId", creatorId).eq("status", "expired"),
    )
    .filter((q) => q.eq(q.field("experienceId"), experienceId))
    .collect();

  const refunded = await ctx.db
    .query("submissions")
    .withIndex("by_creator_status", (q) =>
      q.eq("creatorId", creatorId).eq("status", "refunded"),
    )
    .filter((q) => q.eq(q.field("experienceId"), experienceId))
    .collect();

  return [...pending, ...answered, ...expired, ...refunded].sort(
    (a, b) => b.createdAt - a.createdAt,
  );
}

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

    const combined = Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);

    return await Promise.all(
      combined.map(async (submission) => {
        const requestType = await ctx.db.get(
          submission.requestTypeId as Id<"requestTypes">,
        );
        const requestTypeLabel = requestType
          ? requestType.isDeleted === true || requestType.isActive === false
            ? "Request type no longer active"
            : requestType.title ?? submission.requestTypeTitleSnapshot
          : "Request type no longer active";

        return {
          ...submission,
          requestTypeLabel,
        };
      }),
    );
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
    viewerUserName: v.string(),
    submissionText: v.string(),
  },
  handler: async (ctx, args) => {
    ensureValidSubmissionText(args.submissionText);

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
      userName: args.viewerUserName,
      creatorId: requestType.creatorId,
      requestTypeTitleSnapshot: requestType.title,
      amountUsd: requestType.price,
      responseWindowHoursSnapshot: requestType.responseWindowHours,
      submissionText: args.submissionText,
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

export const listForAdminDashboard = query({
  args: {
    experienceId: v.string(),
    viewerUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const submissions = await listCreatorSubmissionsForExperience(
      ctx,
      args.experienceId,
      args.viewerUserId,
    );

    const now = Date.now();

    return await Promise.all(
      submissions.map(async (submission) => {
        const requestType = await ctx.db.get(
          submission.requestTypeId as Id<"requestTypes">,
        );
        const requestTypeLabel = requestType
          ? requestType.isDeleted === true || requestType.isActive === false
            ? "Request type no longer active"
            : requestType.title ?? submission.requestTypeTitleSnapshot
          : "Request type no longer active";
        const deadlineAt =
          submission.createdAt + submission.responseWindowHoursSnapshot * 60 * 60 * 1000;

        return {
          ...submission,
          requestTypeLabel,
          deadlineAt,
          isWithinResponseWindow: now <= deadlineAt,
        };
      }),
    );
  },
});

export const getAdminMetrics = query({
  args: {
    experienceId: v.string(),
    viewerUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const submissions = await listCreatorSubmissionsForExperience(
      ctx,
      args.experienceId,
      args.viewerUserId,
    );

    const now = Date.now();
    const totalSubmissions = submissions.length;
    const totalPending = submissions.filter((item) => item.status === "pending").length;
    const totalAnswered = submissions.filter((item) => item.status === "answered").length;

    const moneyEarned = submissions
      .filter((item) => item.status === "answered")
      .reduce((sum, item) => sum + item.amountUsd, 0);

    const moneyAvailable = submissions
      .filter((item) => {
        if (item.status !== "pending") {
          return false;
        }

        const deadlineAt =
          item.createdAt + item.responseWindowHoursSnapshot * 60 * 60 * 1000;
        return now <= deadlineAt;
      })
      .reduce((sum, item) => sum + item.amountUsd, 0);

    const totalRevenueOpportunity = moneyEarned + moneyAvailable;
    const earnedRate =
      totalRevenueOpportunity > 0 ? (moneyEarned / totalRevenueOpportunity) * 100 : 0;

    return {
      totalSubmissions,
      totalPending,
      totalAnswered,
      moneyEarned,
      moneyAvailable,
      totalRevenueOpportunity,
      earnedRate,
    };
  },
});
