import { describe, expect, it } from "vitest";
import { internal } from "../convex/_generated/api";
import { createConvexTest } from "./convex.setup";

describe("submissions.backfillCreatorMetrics", () => {
  it("rebuilds creator metrics from submissions", async () => {
    const t = createConvexTest();
    const now = Date.now();

    await t.run(async (ctx) => {
      const rtA = await ctx.db.insert("requestTypes", {
        experienceId: "exp-backfill-1",
        creatorId: "creator-backfill-1",
        title: "Ask 1",
        description: "Desc",
        price: 10,
        responseWindowHours: 24,
        isActive: true,
        isDeleted: false,
      });

      const rtB = await ctx.db.insert("requestTypes", {
        experienceId: "exp-backfill-2",
        creatorId: "creator-backfill-2",
        title: "Ask 2",
        description: "Desc",
        price: 20,
        responseWindowHours: 24,
        isActive: true,
        isDeleted: false,
      });

      await ctx.db.insert("submissions", {
        experienceId: "exp-backfill-1",
        requestTypeId: rtA,
        userId: "u1",
        userName: "u1",
        creatorId: "creator-backfill-1",
        requestTypeTitleSnapshot: "Ask 1",
        amountUsd: 10,
        responseWindowHoursSnapshot: 24,
        submissionText: "Pending submission text",
        createdAt: now,
        status: "pending",
        paymentStatus: "held",
      });

      await ctx.db.insert("submissions", {
        experienceId: "exp-backfill-1",
        requestTypeId: rtA,
        userId: "u2",
        userName: "u2",
        creatorId: "creator-backfill-1",
        requestTypeTitleSnapshot: "Ask 1",
        amountUsd: 35,
        responseWindowHoursSnapshot: 24,
        submissionText: "Answered submission text",
        createdAt: now,
        status: "answered",
        paymentStatus: "released",
        responseText: "Answer",
        answeredAt: now,
      });

      await ctx.db.insert("submissions", {
        experienceId: "exp-backfill-1",
        requestTypeId: rtA,
        userId: "u3",
        userName: "u3",
        creatorId: "creator-backfill-1",
        requestTypeTitleSnapshot: "Ask 1",
        amountUsd: 50,
        responseWindowHoursSnapshot: 24,
        submissionText: "Expired submission text",
        createdAt: now,
        status: "expired",
        paymentStatus: "refunded",
      });

      await ctx.db.insert("submissions", {
        experienceId: "exp-backfill-2",
        requestTypeId: rtB,
        userId: "u4",
        userName: "u4",
        creatorId: "creator-backfill-2",
        requestTypeTitleSnapshot: "Ask 2",
        amountUsd: 20,
        responseWindowHoursSnapshot: 24,
        submissionText: "Pending two",
        createdAt: now,
        status: "pending",
        paymentStatus: "held",
      });

      await ctx.db.insert("creatorMetrics", {
        creatorId: "creator-backfill-1",
        experienceId: "exp-backfill-1",
        totalSubmissions: 999,
        totalPending: 999,
        totalAnswered: 999,
        moneyEarned: 999,
        moneyAvailable: 999,
        updatedAt: now,
      });
    });

    const result = await t.mutation(internal.submissions.backfillCreatorMetrics, {});

    expect(result).toMatchObject({
      submissionsProcessed: 4,
      creatorMetricsRowsCreated: 2,
      existingCreatorMetricsRowsDeleted: 1,
    });

    const metricsRows = await t.run(async (ctx) => {
      const rows = await ctx.db.query("creatorMetrics").collect();
      return rows
        .map((row) => ({
          creatorId: row.creatorId,
          experienceId: row.experienceId,
          totalSubmissions: row.totalSubmissions,
          totalPending: row.totalPending,
          totalAnswered: row.totalAnswered,
          moneyEarned: row.moneyEarned,
          moneyAvailable: row.moneyAvailable,
        }))
        .sort((a, b) =>
          `${a.creatorId}:${a.experienceId}`.localeCompare(
            `${b.creatorId}:${b.experienceId}`,
          ),
        );
    });

    expect(metricsRows).toEqual([
      {
        creatorId: "creator-backfill-1",
        experienceId: "exp-backfill-1",
        totalSubmissions: 3,
        totalPending: 1,
        totalAnswered: 1,
        moneyEarned: 35,
        moneyAvailable: 10,
      },
      {
        creatorId: "creator-backfill-2",
        experienceId: "exp-backfill-2",
        totalSubmissions: 1,
        totalPending: 1,
        totalAnswered: 0,
        moneyEarned: 0,
        moneyAvailable: 20,
      },
    ]);
  });
});
