# Convex Backend Implementation

## Submission Lifecycle Deltas

### `payments.upsertSubmissionPayment`

- Creates a pending submission payment attempt row before hosted checkout starts.
- Uses Convex document `_id` as immutable attempt identity for all later transitions.
- Validates request type ownership/activity and amount consistency.

### `payments.finalizeCheckoutConfiguration`

- Attaches the provider `whopCheckoutConfigurationId` to an existing attempt by `submissionPaymentId`.

### `payments.attachWhopPaymentIdToSubmissionPayment`

- Attaches provider `whopPaymentId` to an existing attempt by immutable `submissionPaymentId`.

### `payments.attachPaymentIdToCheckoutConfiguration`

- Links a webhook `whopPaymentId` to an existing pending attempt by `checkoutConfigurationId`.
- Enables webhook-driven submission finalization after hosted checkout completion.

### `payments.completeSubmissionPayment`

- Finalizes a paid attempt into a real submission exactly once.
- Inserts `submissions` row in `pending/held` state and links `submissionId` back to `submissionPayments`.
- Applies metrics delta:
  - `totalSubmissions +1`
  - `totalPending +1`
  - `moneyAvailable +amountUsd`

### `payments.finalizeSubmissionRefund`

- Marks pending submission as `refunded` and payment state as `refunded`.
- Applies metrics delta:
  - `totalPending -1`
  - `moneyAvailable -amountUsd`
- Updates linked `submissionPayments` status when a provider payment id is present.

### Cashout Fee Split

- Cashout transfer amount is computed in route-layer logic from admin metrics `balanceAvailable`.
- Payout split is fixed at `90% creator / 10% app fee`.
- The app fee is presented to creators as inclusive of Whop/payment processing infra fees.
- `payments.getOrCreatePendingCashout` persists `grossAmountUsd`, `creatorAmountUsd`, and `platformFeeUsd` for auditability.
- `payments.finalizeCashout` decrements `moneyEarned` by `grossAmountUsd` once per pending cashout completion.

### `createSubmission`

- Validates minimum submission text length (`MIN_SUBMISSION_TEXT_LENGTH`).
- Validates request type existence/activity/experience ownership.
- Inserts pending submission with held payment state.
- Applies metrics delta:
  - `totalSubmissions +1`
  - `totalPending +1`
  - `moneyAvailable +amountUsd`

### `answerSubmission`

- Validates submission exists, creator authorization, pending status, and response window.
- Patches submission to answered/released.
- Applies metrics delta:
  - `totalPending -1`
  - `totalAnswered +1`
  - `moneyEarned +amountUsd`
  - `moneyAvailable -amountUsd`

### `listForAdminDashboardPaginated`

- Reads submissions via indexed pagination on `creatorId + experienceId + createdAt`.
- Returns cursor metadata (`continueCursor`, `isDone`) for server-side page navigation.
- Hydrates request type labels in-page using unique request type ids to avoid per-row (`N+1`) fetches.

### `listVisibleForUserPaginated`

- Reads member-visible submissions via indexed pagination on `experienceId + userId + createdAt`.
- Returns cursor metadata (`continueCursor`, `isDone`) for member submissions page navigation.
- Hydrates request type labels in-page using unique request type ids to avoid per-row (`N+1`) fetches.

## Projection Maintenance

### `applyCreatorMetricsDelta`

- Reads rows by `creatorId + experienceId` index.
- Computes aggregate current totals.
- Applies clamped deltas (`Math.max(0, value)`).
- Deduplicates accidental duplicate projection rows by retaining primary and deleting extras.

### `getAdminMetrics`

- Reads projection rows by creator/experience index.
- Returns totals plus derived values:
  - `totalRevenueOpportunity = moneyEarned + moneyAvailable`
  - `earnedRate = moneyEarned / totalRevenueOpportunity * 100`

### `backfillCreatorMetrics` (internal mutation)

- Clears existing projection rows.
- Scans all submissions.
- Rebuilds per creator/experience totals.
- Re-inserts projection rows and returns rebuild stats.

## Important Invariants

- Every status transition that impacts KPI cards must include a matching projection delta update.
- Projection schema changes require backfill update in the same PR.
- Authorization checks should happen before any state mutation.
- Submission payment attempts are identified by immutable Convex `_id`; provider ids are attached as references.
- Payment webhooks and polling reconciliation must be idempotent (safe to process more than once).
