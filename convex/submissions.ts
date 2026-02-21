import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  SUBMISSION_ATTACHMENT_ALLOWED_CONTENT_TYPES,
  SUBMISSION_ATTACHMENT_MAX_SIZE_BYTES,
  SUBMISSION_ATTACHMENT_STALE_CLEANUP_MS,
} from "../lib/submissions/constants";

export const MIN_SUBMISSION_TEXT_LENGTH = 5;
export const MIN_RESPONSE_TEXT_LENGTH = 4;

export type SubmissionAttachmentSnapshot = {
  storageId: Id<"_storage">;
  fileName: string;
  contentType: string;
  sizeBytes: number;
};

export function ensureValidSubmissionText(submissionText: string) {
  if (submissionText.trim().length < MIN_SUBMISSION_TEXT_LENGTH) {
    throw new Error(
      `Submission text must be at least ${MIN_SUBMISSION_TEXT_LENGTH} characters.`,
    );
  }
}

function ensureValidResponseText(responseText: string) {
  if (responseText.trim().length < MIN_RESPONSE_TEXT_LENGTH) {
    throw new Error(`Response text must be at least ${MIN_RESPONSE_TEXT_LENGTH} characters.`);
  }
}

function ensureAttachmentContentType(contentType: string) {
  if (!SUBMISSION_ATTACHMENT_ALLOWED_CONTENT_TYPES.includes(contentType as never)) {
    throw new Error("Attachment file type is not supported.");
  }
}

function ensureAttachmentSize(sizeBytes: number) {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    throw new Error("Attachment file size is invalid.");
  }

  if (sizeBytes > SUBMISSION_ATTACHMENT_MAX_SIZE_BYTES) {
    throw new Error("Attachment must be 10MB or smaller.");
  }
}

function normalizeAttachmentFileName(fileName: string) {
  const cleaned = fileName.trim().slice(0, 120);
  if (cleaned.length === 0) {
    throw new Error("Attachment file name is required.");
  }
  return cleaned;
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

async function hydrateSubmissionRequestTypeLabels(
  ctx: QueryCtx,
  submissions: Array<{
    requestTypeId: Id<"requestTypes">;
    requestTypeTitleSnapshot: string;
  }>,
) {
  const requestTypeIds = Array.from(new Set(submissions.map((item) => item.requestTypeId)));
  const requestTypeById = new Map<Id<"requestTypes">, Doc<"requestTypes"> | null>();

  await Promise.all(
    requestTypeIds.map(async (requestTypeId) => {
      const requestType = await ctx.db.get(requestTypeId);
      requestTypeById.set(requestTypeId, requestType);
    }),
  );

  return submissions.map((submission) => {
    const requestType = requestTypeById.get(submission.requestTypeId);
    return requestType
      ? requestType.title ?? submission.requestTypeTitleSnapshot
      : "Request no longer active";
  });
}

async function hydrateSubmissionAttachmentDownloadUrls(
  ctx: QueryCtx,
  submissions: Array<{
    attachment?: SubmissionAttachmentSnapshot;
  }>,
) {
  return await Promise.all(
    submissions.map(async (submission) => {
      if (!submission.attachment) {
        return null;
      }

      const downloadUrl = await ctx.storage.getUrl(submission.attachment.storageId);
      return {
        fileName: submission.attachment.fileName,
        contentType: submission.attachment.contentType,
        sizeBytes: submission.attachment.sizeBytes,
        downloadUrl,
      };
    }),
  );
}

async function cleanupStalePendingAttachmentsForViewer(
  ctx: MutationCtx,
  viewerUserId: string,
  now: number,
) {
  const rows = await ctx.db
    .query("pendingSubmissionAttachments")
    .withIndex("by_viewer_created_at", (q) => q.eq("viewerUserId", viewerUserId))
    .collect();

  for (const row of rows) {
    if (row.consumedAt) {
      continue;
    }
    if (now - row.createdAt <= SUBMISSION_ATTACHMENT_STALE_CLEANUP_MS) {
      continue;
    }
    await ctx.storage.delete(row.storageId);
    await ctx.db.delete(row._id);
  }
}

export async function consumePendingAttachmentForSubmission(
  ctx: MutationCtx,
  args: {
    token?: string;
    viewerUserId: string;
    experienceId: string;
    requestTypeId: Id<"requestTypes">;
    allowAttachments: boolean;
  },
): Promise<SubmissionAttachmentSnapshot | undefined> {
  const token = args.token;
  if (!token) {
    return undefined;
  }

  if (!args.allowAttachments) {
    throw new Error("Attachments are not enabled for this request type.");
  }

  const rows = await ctx.db
    .query("pendingSubmissionAttachments")
    .withIndex("by_token", (q) => q.eq("token", token))
    .collect();

  const pending = rows[0] ?? null;
  if (!pending) {
    throw new Error("Attachment upload has expired or is invalid.");
  }

  if (pending.viewerUserId !== args.viewerUserId) {
    throw new Error("Attachment does not belong to this user.");
  }

  if (pending.experienceId !== args.experienceId || pending.requestTypeId !== args.requestTypeId) {
    throw new Error("Attachment does not match this request.");
  }

  if (pending.consumedAt) {
    throw new Error("Attachment has already been used.");
  }

  const metadata = await ctx.db.system.get(pending.storageId);
  if (!metadata) {
    throw new Error("Attachment file no longer exists.");
  }

  const contentType = metadata.contentType ?? "";
  const sizeBytes = metadata.size ?? 0;

  ensureAttachmentContentType(contentType);
  ensureAttachmentSize(sizeBytes);

  await ctx.db.patch(pending._id, {
    consumedAt: Date.now(),
  });

  return {
    storageId: pending.storageId,
    fileName: pending.fileName,
    contentType: pending.contentType,
    sizeBytes: pending.sizeBytes,
  };
}

export const generateSubmissionAttachmentUploadUrl = mutation({
  args: {
    viewerUserId: v.string(),
  },
  handler: async (ctx, args) => {
    await cleanupStalePendingAttachmentsForViewer(ctx, args.viewerUserId, Date.now());
    return await ctx.storage.generateUploadUrl();
  },
});

export const registerPendingSubmissionAttachment = mutation({
  args: {
    viewerUserId: v.string(),
    experienceId: v.string(),
    requestTypeId: v.id("requestTypes"),
    storageId: v.id("_storage"),
    fileName: v.string(),
  },
  handler: async (ctx, args) => {
    const requestType = await ctx.db.get(args.requestTypeId);
    if (!requestType || requestType.experienceId !== args.experienceId) {
      throw new Error("Request not found.");
    }

    if (requestType.isDeleted === true || !requestType.isActive) {
      throw new Error("Request is not active.");
    }

    if (requestType.allowAttachments !== true) {
      throw new Error("Attachments are not enabled for this request.");
    }

    const metadata = await ctx.db.system.get(args.storageId);
    if (!metadata) {
      throw new Error("Uploaded file was not found.");
    }

    const contentType = metadata.contentType ?? "";
    const sizeBytes = metadata.size ?? 0;

    ensureAttachmentContentType(contentType);
    ensureAttachmentSize(sizeBytes);
    const normalizedName = normalizeAttachmentFileName(args.fileName);

    const existing = await ctx.db
      .query("pendingSubmissionAttachments")
      .withIndex("by_viewer_experience", (q) =>
        q.eq("viewerUserId", args.viewerUserId).eq("experienceId", args.experienceId),
      )
      .collect();

    for (const row of existing) {
      if (row.consumedAt) {
        continue;
      }
      await ctx.storage.delete(row.storageId);
      await ctx.db.delete(row._id);
    }

    const now = Date.now();
    const token = crypto.randomUUID();

    await ctx.db.insert("pendingSubmissionAttachments", {
      token,
      experienceId: args.experienceId,
      requestTypeId: args.requestTypeId,
      viewerUserId: args.viewerUserId,
      storageId: args.storageId,
      fileName: normalizedName,
      contentType,
      sizeBytes,
      createdAt: now,
    });

    return {
      token,
      fileName: normalizedName,
      contentType,
      sizeBytes,
    };
  },
});

export const cancelPendingSubmissionAttachment = mutation({
  args: {
    token: v.string(),
    viewerUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("pendingSubmissionAttachments")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .collect();

    const pending = rows[0] ?? null;
    if (!pending || pending.viewerUserId !== args.viewerUserId) {
      return { success: false };
    }

    if (!pending.consumedAt) {
      await ctx.storage.delete(pending.storageId);
    }

    await ctx.db.delete(pending._id);
    return { success: true };
  },
});

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

    const attachmentDownloads = await hydrateSubmissionAttachmentDownloadUrls(ctx, combined);

    return await Promise.all(
      combined.map(async (submission, index) => {
        const requestType = await ctx.db.get(
          submission.requestTypeId as Id<"requestTypes">,
        );
        const requestTypeLabel = requestType
          ? requestType.title ?? submission.requestTypeTitleSnapshot
          : "Request no longer active";

        return {
          ...submission,
          requestTypeLabel,
          attachment: attachmentDownloads[index],
        };
      }),
    );
  },
});

export const listVisibleForUserPaginated = query({
  args: {
    experienceId: v.string(),
    viewerUserId: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const paginated = await ctx.db
      .query("submissions")
      .withIndex("by_experience_user_created_at", (q) =>
        q.eq("experienceId", args.experienceId).eq("userId", args.viewerUserId),
      )
      .order("desc")
      .paginate(args.paginationOpts);

    const requestTypeLabels = await hydrateSubmissionRequestTypeLabels(ctx, paginated.page);
    const attachmentDownloads = await hydrateSubmissionAttachmentDownloadUrls(ctx, paginated.page);

    return {
      page: paginated.page.map((submission, index) => ({
        ...submission,
        requestTypeLabel: requestTypeLabels[index],
        attachment: attachmentDownloads[index],
      })),
      continueCursor: paginated.continueCursor,
      isDone: paginated.isDone,
    };
  },
});

export const listSubmissionUserNamesForBackfill = internalQuery({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const paginated = await ctx.db.query("submissions").order("desc").paginate(args.paginationOpts);

    return {
      page: paginated.page.map((submission) => ({
        submissionId: submission._id,
        userId: submission.userId,
        userName: submission.userName,
      })),
      continueCursor: paginated.continueCursor,
      isDone: paginated.isDone,
    };
  },
});

export const applySubmissionUserNameBackfill = internalMutation({
  args: {
    updates: v.array(
      v.object({
        submissionId: v.id("submissions"),
        userName: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    let updatedCount = 0;

    for (const update of args.updates) {
      const row = await ctx.db.get(update.submissionId);
      if (!row || row.userName === update.userName) {
        continue;
      }

      await ctx.db.patch(row._id, {
        userName: update.userName,
      });
      updatedCount += 1;
    }

    return {
      attempted: args.updates.length,
      updated: updatedCount,
    };
  },
});

export const getAttachmentDownloadForViewer = query({
  args: {
    experienceId: v.string(),
    submissionId: v.id("submissions"),
    viewerUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) {
      throw new Error("Submission not found.");
    }

    if (submission.experienceId !== args.experienceId) {
      throw new Error("Submission does not belong to this experience.");
    }

    if (submission.userId !== args.viewerUserId && submission.creatorId !== args.viewerUserId) {
      throw new Error("Unauthorized");
    }

    if (!submission.attachment) {
      throw new Error("Attachment not found.");
    }

    const downloadUrl = await ctx.storage.getUrl(submission.attachment.storageId);
    if (!downloadUrl) {
      throw new Error("Attachment URL unavailable.");
    }

    return {
      downloadUrl,
      fileName: submission.attachment.fileName,
      contentType: submission.attachment.contentType,
      sizeBytes: submission.attachment.sizeBytes,
    };
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
    attachmentToken: v.optional(v.string()),
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

    const attachment = await consumePendingAttachmentForSubmission(ctx, {
      token: args.attachmentToken,
      viewerUserId: args.viewerUserId,
      experienceId: args.experienceId,
      requestTypeId: args.requestTypeId,
      allowAttachments: requestType.allowAttachments === true,
    });

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
      attachment,
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
    ensureValidResponseText(args.responseText);

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

export const listForAdminDashboardPaginated = query({
  args: {
    experienceId: v.string(),
    viewerUserId: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const paginated = await ctx.db
      .query("submissions")
      .withIndex("by_creator_experience_created_at", (q) =>
        q.eq("creatorId", args.viewerUserId).eq("experienceId", args.experienceId),
      )
      .order("desc")
      .paginate(args.paginationOpts);

    const requestTypeLabels = await hydrateSubmissionRequestTypeLabels(ctx, paginated.page);
    const attachmentDownloads = await hydrateSubmissionAttachmentDownloadUrls(ctx, paginated.page);

    const now = Date.now();

    return {
      page: paginated.page.map((submission, index) => {
        const deadlineAt =
          submission.createdAt + submission.responseWindowHoursSnapshot * 60 * 60 * 1000;

        return {
          ...submission,
          requestTypeLabel: requestTypeLabels[index],
          attachment: attachmentDownloads[index],
          deadlineAt,
          isWithinResponseWindow: now <= deadlineAt,
        };
      }),
      continueCursor: paginated.continueCursor,
      isDone: paginated.isDone,
    };
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
