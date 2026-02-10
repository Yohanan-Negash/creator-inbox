# Convex Backend Implementation

## Submission Lifecycle Deltas

### `payments.upsertSubmissionPayment`

- Stores pending checkout/payment context for a would-be submission.
- Validates request type ownership/activity and amount consistency.
- Enforces idempotency by reusing existing row keyed by `paymentId`.

### `payments.attachPaymentIdToCheckoutConfiguration`

- Links a webhook `paymentId` to an existing pending checkout context by `checkoutConfigurationId`.
- Enables webhook-driven submission finalization after hosted checkout completion.

### `payments.completeSubmissionPayment`

- Finalizes a paid payment into a real submission exactly once.
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
- Payment webhooks and polling reconciliation must be idempotent (safe to process more than once).
