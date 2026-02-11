import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

export const MIN_SUBMISSION_TEXT_LENGTH = 8;

export function ensureValidSubmissionText(submissionText: string) {
  if (submissionText.trim().length < MIN_SUBMISSION_TEXT_LENGTH) {
    throw new Error(
      `Submission text must be at least ${MIN_SUBMISSION_TEXT_LENGTH} characters.`,
    );
  }
}

type CreatorMetricsDelta = {
  totalSubmissions?: number;
  totalPending?: number;
  totalAnswered?: number;
  moneyEarned?: number;
  moneyAvailable?: number;
};

type CreatorMetricsSnapshot = {
  totalSubmissions: number;
  totalPending: number;
  totalAnswered: number;
  moneyEarned: number;
  moneyAvailable: number;
};

function clampMetricValue(value: number) {
  return Math.max(0, value);
}

export async function applyCreatorMetricsDelta(
  ctx: MutationCtx,
  args: {
    creatorId: string;
    experienceId: string;
    delta: CreatorMetricsDelta;
  },
) {
  const rows = await ctx.db
    .query("creatorMetrics")
    .withIndex("by_creator_experience", (q) =>
      q.eq("creatorId", args.creatorId).eq("experienceId", args.experienceId),
    )
    .collect();

  const current = rows.reduce(
    (acc, row) => ({
      totalSubmissions: acc.totalSubmissions + row.totalSubmissions,
      totalPending: acc.totalPending + row.totalPending,
      totalAnswered: acc.totalAnswered + row.totalAnswered,
      moneyEarned: acc.moneyEarned + row.moneyEarned,
      moneyAvailable: acc.moneyAvailable + row.moneyAvailable,
    }),
    {
      totalSubmissions: 0,
      totalPending: 0,
      totalAnswered: 0,
      moneyEarned: 0,
      moneyAvailable: 0,
    },
  );

  const next = {
    totalSubmissions: clampMetricValue(
      current.totalSubmissions + (args.delta.totalSubmissions ?? 0),
    ),
    totalPending: clampMetricValue(current.totalPending + (args.delta.totalPending ?? 0)),
    totalAnswered: clampMetricValue(
      current.totalAnswered + (args.delta.totalAnswered ?? 0),
    ),
    moneyEarned: clampMetricValue(current.moneyEarned + (args.delta.moneyEarned ?? 0)),
    moneyAvailable: clampMetricValue(
      current.moneyAvailable + (args.delta.moneyAvailable ?? 0),
    ),
  };

  const now = Date.now();

  if (rows.length === 0) {
    await ctx.db.insert("creatorMetrics", {
      creatorId: args.creatorId,
      experienceId: args.experienceId,
      ...next,
      updatedAt: now,
    });
    return;
  }

  const [primary, ...duplicates] = rows;
  await ctx.db.patch(primary._id, {
    ...next,
    updatedAt: now,
  });

  for (const duplicate of duplicates) {
    await ctx.db.delete(duplicate._id);
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
            ? "Request no longer active"
            : requestType.title ?? submission.requestTypeTitleSnapshot
          : "Request no longer active";

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
      throw new Error("Request not found.");
    }

    if (!requestType.isActive) {
      throw new Error("Request is not active.");
    }

    if (requestType.experienceId !== args.experienceId) {
      throw new Error("Request does not belong to this experience.");
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

    await applyCreatorMetricsDelta(ctx, {
      creatorId: requestType.creatorId,
      experienceId: args.experienceId,
      delta: {
        totalSubmissions: 1,
        totalPending: 1,
        moneyAvailable: requestType.price,
      },
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

    const deadlineAt =
      existing.createdAt + existing.responseWindowHoursSnapshot * 60 * 60 * 1000;
    if (Date.now() > deadlineAt) {
      throw new Error("Response window has expired for this submission.");
    }

    await ctx.db.patch(args.submissionId, {
      responseText: args.responseText,
      status: "answered",
      paymentStatus: "released",
      answeredAt: Date.now(),
    });

    await applyCreatorMetricsDelta(ctx, {
      creatorId: existing.creatorId,
      experienceId: existing.experienceId,
      delta: {
        totalPending: -1,
        totalAnswered: 1,
        moneyEarned: existing.amountUsd,
        moneyAvailable: -existing.amountUsd,
      },
    });

    return await ctx.db.get(args.submissionId);
  },
});

export const deleteSubmissionForCreator = mutation({
  args: {
    submissionId: v.id("submissions"),
    viewerUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.submissionId);
    if (!existing) {
      throw new Error("Submission not found.");
    }

    if (existing.creatorId !== args.viewerUserId) {
      throw new Error("Unauthorized");
    }

    const metricDelta: CreatorMetricsDelta = {
      totalSubmissions: -1,
    };

    if (existing.status === "pending") {
      metricDelta.totalPending = -1;
      metricDelta.moneyAvailable = -existing.amountUsd;
    }

    if (existing.status === "answered") {
      metricDelta.totalAnswered = -1;
      metricDelta.moneyEarned = -existing.amountUsd;
    }

    await applyCreatorMetricsDelta(ctx, {
      creatorId: existing.creatorId,
      experienceId: existing.experienceId,
      delta: metricDelta,
    });

    const paymentRows = await ctx.db
      .query("submissionPayments")
      .withIndex("by_submission_id", (q) => q.eq("submissionId", args.submissionId))
      .collect();

    const now = Date.now();
    for (const paymentRow of paymentRows) {
      await ctx.db.patch(paymentRow._id, {
        submissionId: undefined,
        updatedAt: now,
      });
    }

    await ctx.db.delete(args.submissionId);

    return {
      success: true,
      submissionId: args.submissionId,
    };
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
            ? "Request no longer active"
            : requestType.title ?? submission.requestTypeTitleSnapshot
          : "Request no longer active";
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
    const metricsRows = await ctx.db
      .query("creatorMetrics")
      .withIndex("by_creator_experience", (q) =>
        q.eq("creatorId", args.viewerUserId).eq("experienceId", args.experienceId),
      )
      .collect();

    const totals = metricsRows.reduce(
      (acc, row) => ({
        totalSubmissions: acc.totalSubmissions + row.totalSubmissions,
        totalPending: acc.totalPending + row.totalPending,
        totalAnswered: acc.totalAnswered + row.totalAnswered,
        moneyEarned: acc.moneyEarned + row.moneyEarned,
        moneyAvailable: acc.moneyAvailable + row.moneyAvailable,
      }),
      {
        totalSubmissions: 0,
        totalPending: 0,
        totalAnswered: 0,
        moneyEarned: 0,
        moneyAvailable: 0,
      },
    );

    const totalSubmissions = totals.totalSubmissions;
    const totalPending = totals.totalPending;
    const totalAnswered = totals.totalAnswered;
    const moneyEarned = totals.moneyEarned;
    const moneyAvailable = totals.moneyAvailable;

    const totalRevenueOpportunity = moneyEarned + moneyAvailable;
    const earnedRate =
      totalRevenueOpportunity > 0 ? (moneyEarned / totalRevenueOpportunity) * 100 : 0;

    return {
      totalSubmissions,
      totalPending,
      totalAnswered,
      moneyEarned,
      balanceAvailable: moneyEarned,
      moneyAvailable,
      totalRevenueOpportunity,
      earnedRate,
    };
  },
});

export const backfillCreatorMetrics = internalMutation({
  args: {},
  handler: async (ctx) => {
    const submissions = await ctx.db.query("submissions").collect();
    const allMetrics = await ctx.db.query("creatorMetrics").collect();

    for (const item of allMetrics) {
      await ctx.db.delete(item._id);
    }

    const byCreatorExperience = new Map<string, {
      creatorId: string;
      experienceId: string;
      snapshot: CreatorMetricsSnapshot;
    }>();

    for (const submission of submissions) {
      const key = `${submission.creatorId}::${submission.experienceId}`;
      const existing = byCreatorExperience.get(key) ?? {
        creatorId: submission.creatorId,
        experienceId: submission.experienceId,
        snapshot: {
          totalSubmissions: 0,
          totalPending: 0,
          totalAnswered: 0,
          moneyEarned: 0,
          moneyAvailable: 0,
        },
      };

      existing.snapshot.totalSubmissions += 1;

      if (submission.status === "pending") {
        existing.snapshot.totalPending += 1;
        existing.snapshot.moneyAvailable += submission.amountUsd;
      }

      if (submission.status === "answered") {
        existing.snapshot.totalAnswered += 1;
        existing.snapshot.moneyEarned += submission.amountUsd;
      }

      byCreatorExperience.set(key, existing);
    }

    const now = Date.now();

    for (const item of byCreatorExperience.values()) {
      await ctx.db.insert("creatorMetrics", {
        creatorId: item.creatorId,
        experienceId: item.experienceId,
        totalSubmissions: item.snapshot.totalSubmissions,
        totalPending: item.snapshot.totalPending,
        totalAnswered: item.snapshot.totalAnswered,
        moneyEarned: item.snapshot.moneyEarned,
        moneyAvailable: item.snapshot.moneyAvailable,
        updatedAt: now,
      });
    }

    return {
      submissionsProcessed: submissions.length,
      creatorMetricsRowsCreated: byCreatorExperience.size,
      existingCreatorMetricsRowsDeleted: allMetrics.length,
    };
  },
});
