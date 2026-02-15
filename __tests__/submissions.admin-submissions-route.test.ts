import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockVerifyUserToken = vi.fn();
const mockCheckAccess = vi.fn();
const mockConvexQuery = vi.fn();
const mockLoggerError = vi.fn();

vi.mock("@/lib/whop", () => ({
  getWhopSdk: () => ({
    verifyUserToken: mockVerifyUserToken,
    users: {
      checkAccess: mockCheckAccess,
    },
  }),
}));

vi.mock("@/lib/convex-server", () => ({
  getConvexServerClient: () => ({
    query: mockConvexQuery,
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: mockLoggerError,
  },
}));

describe("GET /api/whop/experiences/[experienceId]/admin-submissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyUserToken.mockResolvedValue({ userId: "creator_1" });
    mockCheckAccess.mockResolvedValue({ access_level: "admin" });
    mockConvexQuery.mockResolvedValue({
      page: [{ _id: "sub_1", createdAt: Date.now() }],
      continueCursor: "cursor_2",
      isDone: false,
    });
  });

  it("returns paginated admin submissions", async () => {
    const { GET } = await import(
      "../app/api/whop/experiences/[experienceId]/admin-submissions/route"
    );

    const request = new NextRequest(
      "https://example.com/api/whop/experiences/exp_1/admin-submissions?cursor=cursor_1",
    );

    const response = await GET(request, {
      params: Promise.resolve({ experienceId: "exp_1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.dashboardSubmissions).toHaveLength(1);
    expect(payload.dashboardSubmissionsContinueCursor).toBe("cursor_2");
    expect(payload.dashboardSubmissionsIsDone).toBe(false);
  });

  it("returns 403 for non-admin access without classification logging", async () => {
    mockCheckAccess.mockResolvedValueOnce({ access_level: "member" });

    const { GET } = await import(
      "../app/api/whop/experiences/[experienceId]/admin-submissions/route"
    );

    const request = new NextRequest(
      "https://example.com/api/whop/experiences/exp_1/admin-submissions",
    );

    const response = await GET(request, {
      params: Promise.resolve({ experienceId: "exp_1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toEqual({ error: "Admin access required." });
    expect(mockLoggerError).not.toHaveBeenCalled();
  });

  it("returns 500 with classified error code when submissions query fails", async () => {
    mockConvexQuery.mockRejectedValueOnce(new Error("convex unavailable"));

    const { GET } = await import(
      "../app/api/whop/experiences/[experienceId]/admin-submissions/route"
    );

    const request = new NextRequest(
      "https://example.com/api/whop/experiences/exp_1/admin-submissions",
    );

    const response = await GET(request, {
      params: Promise.resolve({ experienceId: "exp_1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toEqual({ error: "Please try again." });
    expect(mockLoggerError).toHaveBeenCalledWith(
      "Admin submissions route failed",
      expect.objectContaining({
        status: 500,
        errorCode: "INTERNAL",
        event: "whop.admin_submissions.failed",
      }),
    );
  });
});
