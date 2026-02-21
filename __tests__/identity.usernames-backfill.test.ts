import { describe, expect, it } from "vitest";
import { internal } from "../convex/_generated/api";
import { createConvexTest } from "./convex.setup";

describe("username backfill primitives", () => {
  it("lists and updates submission username snapshots", async () => {
    const t = createConvexTest();
    const now = Date.now();

    await t.run(async (ctx) => {
      const requestTypeId = await ctx.db.insert("requestTypes", {
        experienceId: "exp-usernames-1",
        creatorId: "creator-usernames-1",
        title: "Ask",
        description: "desc",
        price: 10,
        responseWindowHours: 24,
        isActive: true,
      });

      await ctx.db.insert("submissions", {
        experienceId: "exp-usernames-1",
        requestTypeId,
        userId: "user_1",
        userName: "Member One",
        creatorId: "creator-usernames-1",
        requestTypeTitleSnapshot: "Ask",
        amountUsd: 10,
        responseWindowHoursSnapshot: 24,
        submissionText: "Please help with this request.",
        createdAt: now,
        status: "pending",
        paymentStatus: "held",
      });
    });

    const page = await t.query(internal.submissions.listSubmissionUserNamesForBackfill, {
      paginationOpts: {
        numItems: 10,
        cursor: null,
      },
    });

    expect(page.page).toHaveLength(1);
    expect(page.page[0]).toMatchObject({ userId: "user_1", userName: "Member One" });

    const result = await t.mutation(internal.submissions.applySubmissionUserNameBackfill, {
      updates: [
        {
          submissionId: page.page[0].submissionId,
          userName: "member_1",
        },
      ],
    });

    expect(result).toEqual({ attempted: 1, updated: 1 });

    const updated = await t.run(async (ctx) => {
      const rows = await ctx.db.query("submissions").collect();
      return rows[0]?.userName;
    });

    expect(updated).toBe("member_1");
  });

  it("lists and updates submission payment username snapshots", async () => {
    const t = createConvexTest();
    const now = Date.now();

    await t.run(async (ctx) => {
      const requestTypeId = await ctx.db.insert("requestTypes", {
        experienceId: "exp-usernames-2",
        creatorId: "creator-usernames-2",
        title: "Ask",
        description: "desc",
        price: 10,
        responseWindowHours: 24,
        isActive: true,
      });

      await ctx.db.insert("submissionPayments", {
        experienceId: "exp-usernames-2",
        requestTypeId,
        viewerUserId: "user_2",
        viewerUserName: "Member Two",
        submissionText: "Please help with this request.",
        amountUsd: 10,
        creatorIdSnapshot: "creator-usernames-2",
        requestTypeTitleSnapshot: "Ask",
        responseWindowHoursSnapshot: 24,
        allowAttachmentsSnapshot: false,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      });
    });

    const page = await t.query(internal.payments.listSubmissionPaymentUserNamesForBackfill, {
      paginationOpts: {
        numItems: 10,
        cursor: null,
      },
    });

    expect(page.page).toHaveLength(1);
    expect(page.page[0]).toMatchObject({ viewerUserId: "user_2", viewerUserName: "Member Two" });

    const result = await t.mutation(internal.payments.applySubmissionPaymentUserNameBackfill, {
      updates: [
        {
          submissionPaymentId: page.page[0].submissionPaymentId,
          viewerUserName: "member_2",
        },
      ],
    });

    expect(result).toEqual({ attempted: 1, updated: 1 });

    const updated = await t.run(async (ctx) => {
      const rows = await ctx.db.query("submissionPayments").collect();
      return rows[0]?.viewerUserName;
    });

    expect(updated).toBe("member_2");
  });
});
