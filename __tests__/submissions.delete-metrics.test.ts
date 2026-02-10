import { describe, expect, it } from "vitest";
import { api } from "../convex/_generated/api";
import { createConvexTest } from "./convex.setup";

describe("submissions.deleteSubmissionForCreator metrics", () => {
  it("removes pending submission and decrements pending metrics", async () => {
    const t = createConvexTest();
    const experienceId = "exp-delete-pending";
    const creatorId = "creator-delete-pending";

    const requestType = await t.mutation(api.requestTypes.createRequestType, {
      experienceId,
      viewerUserId: creatorId,
      title: "Q&A",
      description: "Quick Q&A",
      price: 30,
      responseWindowHours: 24,
    });

    if (!requestType) {
      throw new Error("Request type missing.");
    }

    const submission = await t.mutation(api.submissions.createSubmission, {
      experienceId,
      requestTypeId: requestType._id,
      viewerUserId: "member-delete-pending",
      viewerUserName: "member-delete-pending",
      submissionText: "Need help with conversion rates this week.",
    });

    if (!submission) {
      throw new Error("Submission missing.");
    }

    await t.mutation(api.submissions.deleteSubmissionForCreator, {
      submissionId: submission._id,
      viewerUserId: creatorId,
    });

    const metrics = await t.query(api.submissions.getAdminMetrics, {
      experienceId,
      viewerUserId: creatorId,
    });

    expect(metrics).toMatchObject({
      totalSubmissions: 0,
      totalPending: 0,
      totalAnswered: 0,
      moneyAvailable: 0,
      moneyEarned: 0,
      balanceAvailable: 0,
    });
  });

  it("removes answered submission and decrements earned metrics", async () => {
    const t = createConvexTest();
    const experienceId = "exp-delete-answered";
    const creatorId = "creator-delete-answered";

    const requestType = await t.mutation(api.requestTypes.createRequestType, {
      experienceId,
      viewerUserId: creatorId,
      title: "Strategy",
      description: "Strategy response",
      price: 45,
      responseWindowHours: 24,
    });

    if (!requestType) {
      throw new Error("Request type missing.");
    }

    const submission = await t.mutation(api.submissions.createSubmission, {
      experienceId,
      requestTypeId: requestType._id,
      viewerUserId: "member-delete-answered",
      viewerUserName: "member-delete-answered",
      submissionText: "Need a growth strategy for this quarter.",
    });

    if (!submission) {
      throw new Error("Submission missing.");
    }

    await t.mutation(api.submissions.answerSubmission, {
      submissionId: submission._id,
      viewerUserId: creatorId,
      responseText: "Focus on one channel and run weekly experiments.",
    });

    await t.mutation(api.submissions.deleteSubmissionForCreator, {
      submissionId: submission._id,
      viewerUserId: creatorId,
    });

    const metrics = await t.query(api.submissions.getAdminMetrics, {
      experienceId,
      viewerUserId: creatorId,
    });

    expect(metrics).toMatchObject({
      totalSubmissions: 0,
      totalPending: 0,
      totalAnswered: 0,
      moneyAvailable: 0,
      moneyEarned: 0,
      balanceAvailable: 0,
    });
  });
});
