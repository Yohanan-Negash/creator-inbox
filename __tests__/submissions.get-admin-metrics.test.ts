import { describe, expect, it } from "vitest";
import { api } from "../convex/_generated/api";
import { createConvexTest } from "./convex.setup";

describe("submissions.getAdminMetrics", () => {
  it("returns projection values from creatorMetrics", async () => {
    const t = createConvexTest();
    const experienceId = "exp-metrics-1";
    const creatorId = "creator-metrics-1";

    const requestType = await t.mutation(api.requestTypes.createRequestType, {
      experienceId,
      viewerUserId: creatorId,
      title: "Analysis",
      description: "Deep analysis response.",
      price: 30,
      responseWindowHours: 24,
    });

    expect(requestType).not.toBeNull();
    if (!requestType) {
      throw new Error("Request type was not created.");
    }

    await t.mutation(api.submissions.createSubmission, {
      experienceId,
      requestTypeId: requestType._id,
      viewerUserId: "member-metrics-1",
      viewerUserName: "member-metrics-1",
      submissionText: "Provide analysis for my creator funnel.",
    });

    await t.run(async (ctx) => {
      const row = await ctx.db
        .query("creatorMetrics")
        .withIndex("by_creator_experience", (q) =>
          q.eq("creatorId", creatorId).eq("experienceId", experienceId),
        )
        .first();

      if (!row) {
        throw new Error("creatorMetrics row not found.");
      }

      await ctx.db.patch(row._id, {
        totalSubmissions: 9,
        totalPending: 4,
        totalAnswered: 5,
        moneyEarned: 120,
        moneyAvailable: 80,
      });
    });

    const metrics = await t.query(api.submissions.getAdminMetrics, {
      experienceId,
      viewerUserId: creatorId,
    });

    expect(metrics).toMatchObject({
      totalSubmissions: 9,
      totalPending: 4,
      totalAnswered: 5,
      moneyEarned: 120,
      moneyAvailable: 80,
      totalRevenueOpportunity: 200,
      earnedRate: 60,
    });
  });
});
