import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockVerifyUserToken = vi.fn();
const mockCheckAccess = vi.fn();
const mockConvexMutation = vi.fn();
const mockNotifyUserSubmissionAnswered = vi.fn();

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
    mutation: mockConvexMutation,
  }),
}));

vi.mock("@/lib/whop-notifications", () => ({
  notifyUserSubmissionAnswered: mockNotifyUserSubmissionAnswered,
}));

describe("POST /api/whop/experiences/[experienceId]/submissions/action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyUserToken.mockResolvedValue({ userId: "creator_1" });
    mockCheckAccess.mockResolvedValue({ access_level: "admin" });
    mockNotifyUserSubmissionAnswered.mockResolvedValue(true);
  });

  it("sends user notification when admin answers a submission", async () => {
    mockConvexMutation.mockResolvedValueOnce({
      _id: "sub_1",
      experienceId: "exp_1",
      userId: "user_1",
      creatorId: "creator_1",
      requestTypeTitleSnapshot: "Growth strategy",
    });

    const { POST } = await import(
      "../app/api/whop/experiences/[experienceId]/submissions/action/route"
    );

    const request = new NextRequest("https://example.com/api/whop/experiences/exp_1/submissions/action", {
      method: "POST",
      body: JSON.stringify({
        action: "answer",
        submissionId: "sub_1",
        responseText: "Start with one niche.",
      }),
      headers: {
        "content-type": "application/json",
      },
    });

    const response = await POST(request, { params: Promise.resolve({ experienceId: "exp_1" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ success: true });
    expect(mockNotifyUserSubmissionAnswered).toHaveBeenCalledWith({
      experienceId: "exp_1",
      requesterUserId: "user_1",
      creatorUserId: "creator_1",
      requestTypeTitle: "Growth strategy",
    });
  });

  it("does not send notification for delete action", async () => {
    mockConvexMutation.mockResolvedValueOnce({ success: true, submissionId: "sub_1" });

    const { POST } = await import(
      "../app/api/whop/experiences/[experienceId]/submissions/action/route"
    );

    const request = new NextRequest("https://example.com/api/whop/experiences/exp_1/submissions/action", {
      method: "POST",
      body: JSON.stringify({
        action: "delete",
        submissionId: "sub_1",
      }),
      headers: {
        "content-type": "application/json",
      },
    });

    const response = await POST(request, { params: Promise.resolve({ experienceId: "exp_1" }) });

    expect(response.status).toBe(200);
    expect(mockNotifyUserSubmissionAnswered).not.toHaveBeenCalled();
  });
});
