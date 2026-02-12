const USD_CENTS = 100;

export const APP_FEE_PERCENT = 10;
export const CREATOR_PAYOUT_PERCENT = 90;

function toUsd(cents: number) {
  return cents / USD_CENTS;
}

export function calculateCashoutBreakdown(balanceAvailableUsd: number) {
  const grossCents = Math.max(0, Math.round(balanceAvailableUsd * USD_CENTS));
  const appFeeCents = Math.round((grossCents * APP_FEE_PERCENT) / 100);
  const creatorPayoutCents = grossCents - appFeeCents;

  return {
    grossAmountUsd: toUsd(grossCents),
    appFeeUsd: toUsd(appFeeCents),
    creatorAmountUsd: toUsd(creatorPayoutCents),
    paymentFeesIncludedInAppFee: true,
  };
}
