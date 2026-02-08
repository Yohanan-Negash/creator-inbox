import { describe, expect, it } from "vitest";
import { api } from "../convex/_generated/api";
import { createConvexTest } from "./convex.setup";

describe("submissions.answerSubmission + metrics", () => {
  it("answers a pending submission and updates creator metrics", async () => {
    const t = createConvexTest();
    const experienceId = "exp-answer-1";
    const creatorId = "creator-answer-1";

    const requestType = await t.mutation(api.requestTypes.createRequestType, {
      experienceId,
      viewerUserId: creatorId,
      title: "Growth strategy",
      description: "Detailed growth strategy response.",
      price: 40,
      responseWindowHours: 24,
    });

    expect(requestType).not.toBeNull();
    if (!requestType) {
      throw new Error("Request type was not created.");
    }

    const submission = await t.mutation(api.submissions.createSubmission, {
      experienceId,
      requestTypeId: requestType._id,
      viewerUserId: "member-answer-1",
      viewerUserName: "member-answer-1",
      submissionText: "Need a growth plan for my audience this month.",
    });

    expect(submission).not.toBeNull();
    if (!submission) {
      throw new Error("Submission was not created.");
    }

    const answered = await t.mutation(api.submissions.answerSubmission, {
      submissionId: submission._id,
      viewerUserId: creatorId,
      responseText: "Start with one niche and post daily for 30 days.",
    });

    expect(answered).toMatchObject({
      status: "answered",
      paymentStatus: "released",
      responseText: "Start with one niche and post daily for 30 days.",
    });

    const metrics = await t.query(api.submissions.getAdminMetrics, {
      experienceId,
      viewerUserId: creatorId,
    });

    expect(metrics).toMatchObject({
      totalSubmissions: 1,
      totalPending: 0,
      totalAnswered: 1,
      moneyEarned: 40,
      moneyAvailable: 0,
      totalRevenueOpportunity: 40,
      earnedRate: 100,
    });
  });

  it("rejects answering an expired submission", async () => {
    const t = createConvexTest();
    const experienceId = "exp-answer-2";
    const creatorId = "creator-answer-2";

    const requestType = await t.mutation(api.requestTypes.createRequestType, {
      experienceId,
      viewerUserId: creatorId,
      title: "Content plan",
      description: "Content planning response.",
      price: 15,
      responseWindowHours: 1,
    });

    expect(requestType).not.toBeNull();
    if (!requestType) {
      throw new Error("Request type was not created.");
    }

    const submission = await t.mutation(api.submissions.createSubmission, {
      experienceId,
      requestTypeId: requestType._id,
      viewerUserId: "member-answer-2",
      viewerUserName: "member-answer-2",
      submissionText: "Give me a weekly content calendar.",
    });

    expect(submission).not.toBeNull();
    if (!submission) {
      throw new Error("Submission was not created.");
    }

    await t.run(async (ctx) => {
      await ctx.db.patch(submission._id, {
        createdAt: Date.now() - 2 * 60 * 60 * 1000,
      });
    });

    await expect(
      t.mutation(api.submissions.answerSubmission, {
        submissionId: submission._id,
        viewerUserId: creatorId,
        responseText: "This should be blocked.",
      }),
    ).rejects.toThrowError("Response window has expired for this submission.");

    const metrics = await t.query(api.submissions.getAdminMetrics, {
      experienceId,
      viewerUserId: creatorId,
    });

    expect(metrics).toMatchObject({
      totalSubmissions: 1,
      totalPending: 1,
      totalAnswered: 0,
      moneyEarned: 0,
      moneyAvailable: 15,
    });
  });
});
