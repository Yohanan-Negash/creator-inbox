import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockWebhookUnwrap = vi.fn();
const mockPaymentsRetrieve = vi.fn();
const mockConvexMutation = vi.fn();

vi.mock("@/lib/whop", () => ({
  getWhopSdk: () => ({
    webhooks: {
      unwrap: mockWebhookUnwrap,
    },
    payments: {
      retrieve: mockPaymentsRetrieve,
    },
  }),
}));

vi.mock("@/lib/convex-server", () => ({
  getConvexServerClient: () => ({
    mutation: mockConvexMutation,
  }),
}));

describe("POST /api/whop/payments/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WHOP_WEBHOOK_SECRET = "test-secret";
  });

  it("returns 401 when webhook signature is invalid", async () => {
    mockWebhookUnwrap.mockImplementation(() => {
      throw new Error("invalid signature");
    });

    const { POST } = await import("../app/api/whop/payments/webhook/route");
    const request = new NextRequest("https://example.com/api/whop/payments/webhook", {
      method: "POST",
      body: JSON.stringify({ type: "payment.succeeded" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
    expect(mockConvexMutation).not.toHaveBeenCalled();
  });

  it("maps payment and completes submission on payment.succeeded payload", async () => {
    mockWebhookUnwrap.mockReturnValue({
      type: "payment.succeeded",
      data: {
        id: "pay_123",
      },
    });

    mockPaymentsRetrieve.mockResolvedValue({
      id: "pay_123",
      status: "paid",
      metadata: {
        checkoutConfigurationId: "8e624478-53e0-4ee8-9976-5a78aac7e401",
      },
    });

    const { POST } = await import("../app/api/whop/payments/webhook/route");
    const request = new NextRequest("https://example.com/api/whop/payments/webhook", {
      method: "POST",
      body: JSON.stringify({ type: "payment.succeeded" }),
      headers: {
        "content-type": "application/json",
      },
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.status).toBe("paid");
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
