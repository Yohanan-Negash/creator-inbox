import { describe, expect, it } from "vitest";
import { api } from "../convex/_generated/api";
import { createConvexTest } from "./convex.setup";

describe("submissions.listForAdminDashboardPaginated", () => {
  it("returns submissions page-by-page in descending createdAt order", async () => {
    const t = createConvexTest();
    const now = Date.now();
    const experienceId = "exp-admin-page";
    const creatorId = "creator-admin-page";

    await t.run(async (ctx) => {
      const requestTypeId = await ctx.db.insert("requestTypes", {
        experienceId,
        creatorId,
        title: "Strategy Review",
        description: "Deep-dive feedback",
        price: 20,
        responseWindowHours: 24,
        isActive: true,
        isDeleted: false,
      });

      for (let offset = 0; offset < 3; offset += 1) {
        await ctx.db.insert("submissions", {
          experienceId,
          requestTypeId,
          userId: `member-${offset}`,
          userName: `Member ${offset}`,
          creatorId,
          requestTypeTitleSnapshot: "Strategy Review",
          amountUsd: 20,
          responseWindowHoursSnapshot: 24,
          submissionText: `Submission ${offset}`,
          createdAt: now + offset,
          status: "pending",
          paymentStatus: "held",
        });
      }
    });

    const firstPage = await t.query(api.submissions.listForAdminDashboardPaginated, {
      experienceId,
      viewerUserId: creatorId,
      paginationOpts: {
        numItems: 2,
        cursor: null,
      },
    });

    expect(firstPage.page).toHaveLength(2);
    expect(firstPage.page[0]?.createdAt).toBeGreaterThan(firstPage.page[1]?.createdAt ?? 0);
    expect(firstPage.page[0]?.requestTypeLabel).toBe("Strategy Review");
    expect(firstPage.isDone).toBe(false);

    const secondPage = await t.query(api.submissions.listForAdminDashboardPaginated, {
      experienceId,
      viewerUserId: creatorId,
      paginationOpts: {
        numItems: 2,
        cursor: firstPage.continueCursor,
      },
    });

    expect(secondPage.page).toHaveLength(1);
    expect(secondPage.isDone).toBe(true);
  });
});
