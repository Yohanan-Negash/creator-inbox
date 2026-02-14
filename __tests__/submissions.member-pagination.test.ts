import { describe, expect, it } from "vitest";
import { api } from "../convex/_generated/api";
import { createConvexTest } from "./convex.setup";

describe("submissions.listVisibleForUserPaginated", () => {
  it("paginates a member's submissions in descending createdAt order", async () => {
    const t = createConvexTest();
    const now = Date.now();
    const experienceId = "exp-member-page";
    const creatorId = "creator-member-page";
    const memberId = "member-page-user";

    await t.run(async (ctx) => {
      const requestTypeId = await ctx.db.insert("requestTypes", {
        experienceId,
        creatorId,
        title: "Quick feedback",
        description: "Helpful response",
        price: 5,
        responseWindowHours: 24,
        isActive: true,
        isDeleted: false,
      });

      for (let offset = 0; offset < 3; offset += 1) {
        await ctx.db.insert("submissions", {
          experienceId,
          requestTypeId,
          userId: memberId,
          userName: "Member",
          creatorId,
          requestTypeTitleSnapshot: "Quick feedback",
          amountUsd: 5,
          responseWindowHoursSnapshot: 24,
          submissionText: `Submission ${offset}`,
          createdAt: now + offset,
          status: "pending",
          paymentStatus: "held",
        });
      }
    });

    const firstPage = await t.query(api.submissions.listVisibleForUserPaginated, {
      experienceId,
      viewerUserId: memberId,
      paginationOpts: {
        numItems: 2,
        cursor: null,
      },
    });

    expect(firstPage.page).toHaveLength(2);
    expect(firstPage.page[0]?.createdAt).toBeGreaterThan(firstPage.page[1]?.createdAt ?? 0);
    expect(firstPage.isDone).toBe(false);

    const secondPage = await t.query(api.submissions.listVisibleForUserPaginated, {
      experienceId,
      viewerUserId: memberId,
      paginationOpts: {
        numItems: 2,
        cursor: firstPage.continueCursor,
      },
    });

    expect(secondPage.page).toHaveLength(1);
    expect(secondPage.isDone).toBe(true);
  });
});
