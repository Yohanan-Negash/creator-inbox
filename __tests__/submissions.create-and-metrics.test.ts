import { describe, expect, it } from "vitest";
import { api } from "../convex/_generated/api";
import { createConvexTest } from "./convex.setup";

describe("submissions.createSubmission + metrics", () => {
  it("creates a pending submission and increments creator metrics", async () => {
    const t = createConvexTest();
    const experienceId = "exp-create-1";
    const creatorId = "creator-create-1";

    const requestType = await t.mutation(api.requestTypes.createRequestType, {
      experienceId,
      viewerUserId: creatorId,
      title: "Ask me anything",
      description: "I will answer your question with specifics.",
      price: 25,
      responseWindowHours: 24,
    });

    expect(requestType).not.toBeNull();
    if (!requestType) {
      throw new Error("Request type was not created.");
    }

    const submission = await t.mutation(api.submissions.createSubmission, {
      experienceId,
      requestTypeId: requestType._id,
      viewerUserId: "member-1",
      viewerUserName: "member1",
      submissionText: "Please help me plan a launch strategy.",
    });

    expect(submission).toMatchObject({
      status: "pending",
      paymentStatus: "held",
      amountUsd: 25,
    });

    const metrics = await t.query(api.submissions.getAdminMetrics, {
      experienceId,
      viewerUserId: creatorId,
    });

    expect(metrics).toMatchObject({
      totalSubmissions: 1,
      totalPending: 1,
      totalAnswered: 0,
      moneyEarned: 0,
      moneyAvailable: 25,
      totalRevenueOpportunity: 25,
      earnedRate: 0,
    });
  });

  it("rejects submission text shorter than backend minimum", async () => {
    const t = createConvexTest();
    const experienceId = "exp-create-2";
    const creatorId = "creator-create-2";

    const requestType = await t.mutation(api.requestTypes.createRequestType, {
      experienceId,
      viewerUserId: creatorId,
      title: "Code review",
      description: "Review my code and suggest improvements.",
      price: 10,
      responseWindowHours: 24,
    });

    expect(requestType).not.toBeNull();
    if (!requestType) {
      throw new Error("Request type was not created.");
    }

    await expect(
      t.mutation(api.submissions.createSubmission, {
        experienceId,
        requestTypeId: requestType._id,
        viewerUserId: "member-2",
        viewerUserName: "member2",
        submissionText: "short",
      }),
    ).rejects.toThrowError("Submission text must be at least 8 characters.");
  });
});
