import { describe, expect, it } from "vitest";
import { APP_FEE_PERCENT, CREATOR_PAYOUT_PERCENT, calculateCashoutBreakdown } from "../lib/cashout";

describe("cashout fee breakdown", () => {
  it("splits cashout into 10 percent app fee and 90 percent creator payout", () => {
    const breakdown = calculateCashoutBreakdown(50);

    expect(APP_FEE_PERCENT).toBe(10);
    expect(CREATOR_PAYOUT_PERCENT).toBe(90);
    expect(breakdown).toMatchObject({
      grossAmountUsd: 50,
      appFeeUsd: 5,
      creatorAmountUsd: 45,
      paymentFeesIncludedInAppFee: true,
    });
  });

  it("rounds to cents and keeps gross amount conserved", () => {
    const breakdown = calculateCashoutBreakdown(12.34);

    expect(breakdown.grossAmountUsd).toBe(12.34);
    expect(breakdown.appFeeUsd + breakdown.creatorAmountUsd).toBe(breakdown.grossAmountUsd);
  });
});
