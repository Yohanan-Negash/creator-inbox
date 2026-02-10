import { describe, expect, it } from "vitest";
import { api } from "../convex/_generated/api";
import { createConvexTest } from "./convex.setup";

describe("payments cashout mutations", () => {
  it("reuses pending cashout and finalizes without double-decrementing balance", async () => {
    const t = createConvexTest();
    const experienceId = "exp-cashout-1";
    const creatorId = "creator-cashout-1";

    const requestType = await t.mutation(api.requestTypes.createRequestType, {
      experienceId,
      viewerUserId: creatorId,
      title: "Consulting",
      description: "Consulting response",
      price: 50,
      responseWindowHours: 24,
    });

    if (!requestType) {
      throw new Error("Request type missing.");
    }

    const submission = await t.mutation(api.submissions.createSubmission, {
      experienceId,
      requestTypeId: requestType._id,
      viewerUserId: "member-cashout-1",
      viewerUserName: "member-cashout-1",
      submissionText: "Need a short consulting response.",
    });

    if (!submission) {
      throw new Error("Submission missing.");
    }

    await t.mutation(api.submissions.answerSubmission, {
      submissionId: submission._id,
      viewerUserId: creatorId,
      responseText: "Here is your consulting answer.",
    });

    const before = await t.query(api.submissions.getAdminMetrics, {
      experienceId,
      viewerUserId: creatorId,
    });

    expect(before).toMatchObject({
      moneyEarned: 50,
      balanceAvailable: 50,
      totalAnswered: 1,
    });

    const firstPending = await t.mutation(api.payments.getOrCreatePendingCashout, {
      experienceId,
      creatorUserId: creatorId,
      destinationCompanyId: "biz_destination_1",
      originCompanyId: "biz_origin_1",
      grossAmountUsd: 50,
      creatorAmountUsd: 45,
      platformFeeUsd: 5,
      currency: "usd",
    });

    const secondPending = await t.mutation(api.payments.getOrCreatePendingCashout, {
      experienceId,
      creatorUserId: creatorId,
      destinationCompanyId: "biz_destination_1",
      originCompanyId: "biz_origin_1",
      grossAmountUsd: 50,
      creatorAmountUsd: 45,
      platformFeeUsd: 5,
      currency: "usd",
    });

    expect(firstPending?._id).toBe(secondPending?._id);
    expect(firstPending?.status).toBe("pending");

    if (!firstPending) {
      throw new Error("Pending cashout missing.");
    }

    await t.mutation(api.payments.finalizeCashout, {
      cashoutId: firstPending._id,
      viewerUserId: creatorId,
      transferId: "tr_1",
    });

    const afterFirstFinalize = await t.query(api.submissions.getAdminMetrics, {
      experienceId,
      viewerUserId: creatorId,
    });

    expect(afterFirstFinalize).toMatchObject({
      moneyEarned: 0,
      balanceAvailable: 0,
      totalAnswered: 1,
    });

    await t.mutation(api.payments.finalizeCashout, {
      cashoutId: firstPending._id,
      viewerUserId: creatorId,
      transferId: "tr_1",
    });

    const afterSecondFinalize = await t.query(api.submissions.getAdminMetrics, {
      experienceId,
      viewerUserId: creatorId,
    });

    expect(afterSecondFinalize).toMatchObject({
      moneyEarned: 0,
      balanceAvailable: 0,
      totalAnswered: 1,
    });
  });
});
