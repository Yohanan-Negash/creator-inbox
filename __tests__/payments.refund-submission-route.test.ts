import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockVerifyUserToken = vi.fn();
const mockCheckAccess = vi.fn();
const mockConvexQuery = vi.fn();
const mockConvexMutation = vi.fn();
const mockPaymentsRetrieve = vi.fn();
const mockPaymentsRefund = vi.fn();
const mockNotifyUserSubmissionRefunded = vi.fn();

vi.mock("@/lib/whop", () => ({
  getWhopSdk: () => ({
    verifyUserToken: mockVerifyUserToken,
    users: {
      checkAccess: mockCheckAccess,
    },
    payments: {
      retrieve: mockPaymentsRetrieve,
      refund: mockPaymentsRefund,
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
  notifyUserSubmissionRefunded: mockNotifyUserSubmissionRefunded,
}));

describe("POST /api/whop/payments/refund-submission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyUserToken.mockResolvedValue({ userId: "creator_1" });
    mockCheckAccess.mockResolvedValue({ access_level: "admin" });
    mockNotifyUserSubmissionRefunded.mockResolvedValue(true);
  });

  it("sends requester notification after successful refund finalize", async () => {
    mockConvexQuery.mockResolvedValueOnce({
      submissionId: "sub_1",
      status: "pending",
      paymentId: null,
    });
    mockConvexMutation.mockResolvedValueOnce({
      _id: "sub_1",
      experienceId: "exp_1",
      userId: "user_1",
      creatorId: "creator_1",
      requestTypeTitleSnapshot: "Growth strategy",
    });

    const { POST } = await import("../app/api/whop/payments/refund-submission/route");
    const request = new NextRequest("https://example.com/api/whop/payments/refund-submission", {
      method: "POST",
      body: JSON.stringify({
        experienceId: "exp_1",
        submissionId: "sub_1",
      }),
      headers: {
        "content-type": "application/json",
      },
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(mockNotifyUserSubmissionRefunded).toHaveBeenCalledWith({
      experienceId: "exp_1",
      requesterUserId: "user_1",
      creatorUserId: "creator_1",
      requestTypeTitle: "Growth strategy",
    });
  });

  it("returns success without notification when submission already refunded", async () => {
    mockConvexQuery.mockResolvedValueOnce({
      submissionId: "sub_1",
      status: "refunded",
      paymentId: "pay_1",
    });

    const { POST } = await import("../app/api/whop/payments/refund-submission/route");
    const request = new NextRequest("https://example.com/api/whop/payments/refund-submission", {
      method: "POST",
      body: JSON.stringify({
        experienceId: "exp_1",
        submissionId: "sub_1",
      }),
      headers: {
        "content-type": "application/json",
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockNotifyUserSubmissionRefunded).not.toHaveBeenCalled();
  });
});
