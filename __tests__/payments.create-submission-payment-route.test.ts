import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockVerifyUserToken = vi.fn();
const mockCheckAccess = vi.fn();
const mockUsersRetrieve = vi.fn();
const mockCheckoutConfigurationsCreate = vi.fn();
const mockConvexQuery = vi.fn();
const mockConvexMutation = vi.fn();
const mockNotifyAdminSubmissionCreated = vi.fn();

vi.mock("@/lib/whop", () => ({
  getWhopSdk: () => ({
    verifyUserToken: mockVerifyUserToken,
    users: {
      checkAccess: mockCheckAccess,
      retrieve: mockUsersRetrieve,
    },
    checkoutConfigurations: {
      create: mockCheckoutConfigurationsCreate,
    },
    experiences: {
      retrieve: vi.fn(),
    },
  }),
}));

vi.mock("@/lib/convex-server", () => ({
  getConvexServerClient: () => ({
    query: mockConvexQuery,
    mutation: mockConvexMutation,
  }),
}));

vi.mock("@/lib/whop-notifications", () => ({
  notifyAdminSubmissionCreated: mockNotifyAdminSubmissionCreated,
}));

describe("POST /api/whop/payments/create-submission-payment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyUserToken.mockResolvedValue({ userId: "user_1" });
    mockCheckAccess.mockResolvedValue({ has_access: true, access_level: "member" });
    mockUsersRetrieve.mockResolvedValue({ username: "member_1", name: "member_1" });
    mockNotifyAdminSubmissionCreated.mockResolvedValue(true);
  });

  it("creates submission immediately for free request types", async () => {
    mockConvexQuery.mockResolvedValueOnce({
      requestTypeId: "rt_1",
      creatorId: "creator_1",
      title: "Quick question",
      price: 0,
    });
    mockConvexMutation.mockResolvedValueOnce({ _id: "sub_1" });

    const { POST } = await import("../app/api/whop/payments/create-submission-payment/route");
    const request = new NextRequest("https://example.com/api/whop/payments/create-submission-payment", {
      method: "POST",
      body: JSON.stringify({
        experienceId: "exp_1",
        requestTypeId: "rt_1",
        submissionText: "Can you review this intro?",
        whopDevUserToken: "dev-token",
      }),
      headers: {
        "content-type": "application/json",
      },
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.submissionCreated).toBe(true);
    expect(payload.status).toBe("paid");
    expect(mockConvexMutation).toHaveBeenCalledWith(expect.anything(), {
      experienceId: "exp_1",
      requestTypeId: "rt_1",
      viewerUserId: "user_1",
      viewerUserName: "member_1",
      submissionText: "Can you review this intro?",
    });
    expect(mockNotifyAdminSubmissionCreated).toHaveBeenCalledWith({
      experienceId: "exp_1",
      creatorUserId: "creator_1",
      requesterUserName: "member_1",
      requestTypeTitle: "Quick question",
    });
    expect(mockCheckoutConfigurationsCreate).not.toHaveBeenCalled();
  });
});
