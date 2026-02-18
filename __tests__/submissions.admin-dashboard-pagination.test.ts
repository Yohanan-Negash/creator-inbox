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

  it("keeps labels for archived and soft-deleted requests", async () => {
    const t = createConvexTest();
    const now = Date.now();
    const experienceId = "exp-admin-label-state";
    const creatorId = "creator-admin-label-state";

    await t.run(async (ctx) => {
      const archivedRequestTypeId = await ctx.db.insert("requestTypes", {
        experienceId,
        creatorId,
        title: "Archived Request",
        description: "Archived but not deleted",
        price: 20,
        responseWindowHours: 24,
        isActive: false,
        isDeleted: false,
      });

      const deletedRequestTypeId = await ctx.db.insert("requestTypes", {
        experienceId,
        creatorId,
        title: "Deleted Request",
        description: "Deleted request type",
        price: 20,
        responseWindowHours: 24,
        isActive: false,
        isDeleted: true,
      });

      await ctx.db.insert("submissions", {
        experienceId,
        requestTypeId: archivedRequestTypeId,
        userId: "member-archived",
        userName: "Member Archived",
        creatorId,
        requestTypeTitleSnapshot: "Archived Request Snapshot",
        amountUsd: 20,
        responseWindowHoursSnapshot: 24,
        submissionText: "Archived submission",
        createdAt: now,
        status: "pending",
        paymentStatus: "held",
      });

      await ctx.db.insert("submissions", {
        experienceId,
        requestTypeId: deletedRequestTypeId,
        userId: "member-deleted",
        userName: "Member Deleted",
        creatorId,
        requestTypeTitleSnapshot: "Deleted Request Snapshot",
        amountUsd: 20,
        responseWindowHoursSnapshot: 24,
        submissionText: "Deleted submission",
        createdAt: now + 1,
        status: "pending",
        paymentStatus: "held",
      });
    });

    const page = await t.query(api.submissions.listForAdminDashboardPaginated, {
      experienceId,
      viewerUserId: creatorId,
      paginationOpts: {
        numItems: 10,
        cursor: null,
      },
    });

    const labels = page.page.map((item) => item.requestTypeLabel);
    expect(labels).toContain("Archived Request");
    expect(labels).toContain("Deleted Request");
  });

  it("shows fallback label only when request type is fully deleted", async () => {
    const t = createConvexTest();
    const now = Date.now();
    const experienceId = "exp-admin-label-hard-delete";
    const creatorId = "creator-admin-label-hard-delete";

    await t.run(async (ctx) => {
      const removedRequestTypeId = await ctx.db.insert("requestTypes", {
        experienceId,
        creatorId,
        title: "Removed Request",
        description: "Will be fully deleted",
        price: 20,
        responseWindowHours: 24,
        isActive: false,
        isDeleted: true,
      });

      await ctx.db.insert("submissions", {
        experienceId,
        requestTypeId: removedRequestTypeId,
        userId: "member-removed",
        userName: "Member Removed",
        creatorId,
        requestTypeTitleSnapshot: "Removed Request Snapshot",
        amountUsd: 20,
        responseWindowHoursSnapshot: 24,
        submissionText: "Removed submission",
        createdAt: now,
        status: "pending",
        paymentStatus: "held",
      });

      await ctx.db.delete(removedRequestTypeId);
    });

    const page = await t.query(api.submissions.listForAdminDashboardPaginated, {
      experienceId,
      viewerUserId: creatorId,
      paginationOpts: {
        numItems: 10,
        cursor: null,
      },
    });

    expect(page.page[0]?.requestTypeLabel).toBe("Request no longer active");
  });
});
