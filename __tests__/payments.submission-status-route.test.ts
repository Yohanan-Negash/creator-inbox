import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockVerifyUserToken = vi.fn();
const mockCheckAccess = vi.fn();
const mockPaymentsRetrieve = vi.fn();
const mockConvexQuery = vi.fn();
const mockConvexMutation = vi.fn();
const mockNotifyAdminSubmissionCreated = vi.fn();

vi.mock("@/lib/whop", () => ({
  getWhopSdk: () => ({
    verifyUserToken: mockVerifyUserToken,
    users: {
      checkAccess: mockCheckAccess,
    },
    payments: {
      retrieve: mockPaymentsRetrieve,
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

describe("GET /api/whop/payments/submission-status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyUserToken.mockResolvedValue({ userId: "user_1" });
    mockCheckAccess.mockResolvedValue({ has_access: true });
    mockNotifyAdminSubmissionCreated.mockResolvedValue(true);
  });

  it("does not retrieve Whop payment when no provider payment link exists", async () => {
    mockConvexQuery.mockResolvedValue({
      submissionPaymentId: "spay_123",
      status: "pending",
      submissionId: null,
      lastError: null,
      whopPaymentId: null,
      whopCheckoutConfigurationId: null,
      expiresAt: null,
    });

    const { GET } = await import("../app/api/whop/payments/submission-status/route");

    const request = new NextRequest(
      "https://example.com/api/whop/payments/submission-status?experienceId=exp_1&attemptId=spay_123",
    );
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.status).toBe("pending");
    expect(mockPaymentsRetrieve).not.toHaveBeenCalled();
  });

  it("does not reconcile via provider list when payment id is not linked", async () => {
    mockConvexQuery
      .mockResolvedValueOnce({
        submissionPaymentId: "spay_123",
        status: "pending",
        submissionId: null,
        lastError: null,
        whopPaymentId: null,
        whopCheckoutConfigurationId: "ch_123",
        expiresAt: null,
      })
      .mockResolvedValueOnce({
        submissionPaymentId: "spay_123",
        status: "paid",
        submissionId: "sub_1",
        lastError: null,
        whopPaymentId: null,
        whopCheckoutConfigurationId: "ch_123",
        expiresAt: null,
      });

    const { GET } = await import("../app/api/whop/payments/submission-status/route");

    const request = new NextRequest(
      "https://example.com/api/whop/payments/submission-status?experienceId=exp_1&attemptId=spay_123",
    );
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.status).toBe("paid");
    expect(payload.submissionCreated).toBe(true);
    expect(mockConvexMutation).not.toHaveBeenCalled();
    expect(mockPaymentsRetrieve).not.toHaveBeenCalled();
  });

  it("completes when attempt already has whopPaymentId linked", async () => {
    mockPaymentsRetrieve.mockResolvedValue({
      id: "pay_123",
      status: "paid",
    });

    mockConvexQuery
      .mockResolvedValueOnce({
        submissionPaymentId: "spay_123",
        status: "pending",
        submissionId: null,
        lastError: null,
        whopPaymentId: "pay_123",
        whopCheckoutConfigurationId: "ch_123",
        expiresAt: null,
      })
      .mockResolvedValueOnce({
        submissionPaymentId: "spay_123",
        status: "paid",
        submissionId: "sub_1",
        lastError: null,
        whopPaymentId: "pay_123",
        whopCheckoutConfigurationId: "ch_123",
        expiresAt: null,
      });
    mockConvexMutation
      .mockResolvedValueOnce({
        created: true,
        experienceId: "exp_1",
        creatorUserId: "creator_1",
        requesterUserName: "member_1",
        requestTypeTitle: "Growth strategy",
      });

    const { GET } = await import("../app/api/whop/payments/submission-status/route");

    const request = new NextRequest(
      "https://example.com/api/whop/payments/submission-status?experienceId=exp_1&attemptId=spay_123",
    );
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.status).toBe("paid");
    expect(payload.submissionCreated).toBe(true);
    expect(mockConvexMutation).toHaveBeenCalledTimes(1);
    expect(mockConvexMutation.mock.calls[0][1]).toEqual({
      submissionPaymentId: "spay_123",
    });
    expect(mockNotifyAdminSubmissionCreated).toHaveBeenCalledWith({
      experienceId: "exp_1",
      creatorUserId: "creator_1",
      requesterUserName: "member_1",
      requestTypeTitle: "Growth strategy",
    });
  });
});
