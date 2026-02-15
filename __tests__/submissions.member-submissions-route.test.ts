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

describe("GET /api/whop/experiences/[experienceId]/member-submissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyUserToken.mockResolvedValue({ userId: "user_1" });
    mockCheckAccess.mockResolvedValue({ has_access: true });
    mockConvexQuery.mockResolvedValue({
      page: [{ _id: "sub_1", createdAt: Date.now() }],
      continueCursor: "cursor_2",
      isDone: false,
    });
  });

  it("returns paginated member submissions", async () => {
    const { GET } = await import(
      "../app/api/whop/experiences/[experienceId]/member-submissions/route"
    );

    const request = new NextRequest(
      "https://example.com/api/whop/experiences/exp_1/member-submissions?cursor=cursor_1",
    );

    const response = await GET(request, {
      params: Promise.resolve({ experienceId: "exp_1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.submissions).toHaveLength(1);
    expect(payload.submissionsContinueCursor).toBe("cursor_2");
    expect(payload.submissionsIsDone).toBe(false);
  });

  it("returns 401 with classified error code when token verification fails", async () => {
    mockVerifyUserToken.mockRejectedValueOnce(new Error("token invalid"));

    const { GET } = await import(
      "../app/api/whop/experiences/[experienceId]/member-submissions/route"
    );

    const request = new NextRequest(
      "https://example.com/api/whop/experiences/exp_1/member-submissions",
    );

    const response = await GET(request, {
      params: Promise.resolve({ experienceId: "exp_1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toEqual({ error: "Please try again." });
    expect(mockLoggerError).toHaveBeenCalledWith(
      "Member submissions route failed",
      expect.objectContaining({
        status: 401,
        errorCode: "UNAUTHORIZED",
        event: "whop.member_submissions.failed",
      }),
    );
  });

  it("returns 502 with classified error code when access check fails upstream", async () => {
    mockCheckAccess.mockRejectedValueOnce(new Error("whop timeout"));

    const { GET } = await import(
      "../app/api/whop/experiences/[experienceId]/member-submissions/route"
    );

    const request = new NextRequest(
      "https://example.com/api/whop/experiences/exp_1/member-submissions",
    );

    const response = await GET(request, {
      params: Promise.resolve({ experienceId: "exp_1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(502);
    expect(payload).toEqual({ error: "Please try again." });
    expect(mockLoggerError).toHaveBeenCalledWith(
      "Member submissions route failed",
      expect.objectContaining({
        status: 502,
        errorCode: "UPSTREAM_FAILURE",
      }),
    );
  });
});
