# Convex Backend Implementation

## Submission Lifecycle Deltas

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
