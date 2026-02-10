import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockVerifyUserToken = vi.fn();
const mockCheckAccess = vi.fn();
const mockPaymentsRetrieve = vi.fn();
const mockPaymentsList = vi.fn();
const mockConvexQuery = vi.fn();
const mockConvexMutation = vi.fn();

async function* listResults(items: Array<unknown>) {
  for (const item of items) {
    yield item;
  }
}

vi.mock("@/lib/whop", () => ({
  getWhopSdk: () => ({
    verifyUserToken: mockVerifyUserToken,
    users: {
      checkAccess: mockCheckAccess,
    },
    payments: {
      retrieve: mockPaymentsRetrieve,
      list: mockPaymentsList,
    },
  }),
}));

vi.mock("@/lib/convex-server", () => ({
  getConvexServerClient: () => ({
    query: mockConvexQuery,
    mutation: mockConvexMutation,
  }),
}));

describe("GET /api/whop/payments/submission-status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WHOP_COMPANY_ID = "biz_test";
    mockVerifyUserToken.mockResolvedValue({ userId: "user_1" });
    mockCheckAccess.mockResolvedValue({ has_access: true });
    mockPaymentsList.mockReturnValue(listResults([]));
  });

  it("does not retrieve Whop payment for pending checkout tokens", async () => {
    mockConvexQuery.mockResolvedValue({
      paymentId: "pending:ch_123",
      status: "pending",
      submissionId: null,
      lastError: null,
    });

    const { GET } = await import("../app/api/whop/payments/submission-status/route");

    const request = new NextRequest(
      "https://example.com/api/whop/payments/submission-status?experienceId=exp_1&paymentId=pending:ch_123",
    );
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.status).toBe("pending");
    expect(mockPaymentsRetrieve).not.toHaveBeenCalled();
  });

  it("reconciles pending checkout token via payments.list when webhook is delayed", async () => {
    mockConvexQuery
      .mockResolvedValueOnce({
        paymentId: "pending:ch_123",
        status: "pending",
        submissionId: null,
        lastError: null,
      })
      .mockResolvedValueOnce({
        paymentId: "pay_123",
        status: "paid",
        submissionId: "sub_1",
        lastError: null,
      });

    mockPaymentsList.mockReturnValue(
      listResults([
        {
          id: "pay_123",
          status: "paid",
          checkout_configuration_id: "ch_123",
        },
      ]),
    );

    const { GET } = await import("../app/api/whop/payments/submission-status/route");

    const request = new NextRequest(
      "https://example.com/api/whop/payments/submission-status?experienceId=exp_1&paymentId=pending:ch_123",
    );
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.status).toBe("paid");
    expect(payload.submissionCreated).toBe(true);
    expect(mockConvexMutation).toHaveBeenCalledTimes(2);
    expect(mockConvexMutation.mock.calls[0][1]).toEqual({
      whopCheckoutConfigurationId: "ch_123",
      paymentId: "pay_123",
    });
    expect(mockConvexMutation.mock.calls[1][1]).toEqual({
      paymentId: "pay_123",
    });
  });

  it("reconciles pay_* lookups by attaching checkout mapping and completes when paid", async () => {
    mockPaymentsRetrieve.mockResolvedValue({
      id: "pay_123",
      status: "paid",
      metadata: {
        checkoutConfigurationId: "8e624478-53e0-4ee8-9976-5a78aac7e401",
      },
    });

    mockConvexQuery
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        paymentId: "pay_123",
        status: "pending",
        submissionId: null,
        lastError: null,
      })
      .mockResolvedValueOnce({
        paymentId: "pay_123",
        status: "paid",
        submissionId: "sub_1",
        lastError: null,
      });

    const { GET } = await import("../app/api/whop/payments/submission-status/route");

    const request = new NextRequest(
      "https://example.com/api/whop/payments/submission-status?experienceId=exp_1&paymentId=pay_123",
    );
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.status).toBe("paid");
    expect(payload.submissionCreated).toBe(true);
    expect(mockConvexMutation).toHaveBeenCalledTimes(2);
    expect(mockConvexMutation.mock.calls[0][1]).toEqual({
      checkoutConfigurationId: "8e624478-53e0-4ee8-9976-5a78aac7e401",
      paymentId: "pay_123",
    });
    expect(mockConvexMutation.mock.calls[1][1]).toEqual({
      paymentId: "pay_123",
    });
  });
});
