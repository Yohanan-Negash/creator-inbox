# Testing + CI Overview

## Current Strategy

The repository uses backend-focused tests across two layers:

- Convex domain/projection tests with `convex-test`
- Next.js route-handler tests with mocked external integrations (Whop/Inference)

- Test runner: Vitest
- Convex harness: `convex-test`
- Runtime environment: `edge-runtime`
- Test location: root `__tests__/`

## Current Coverage Focus

- `createSubmission` behavior and metrics deltas
- `answerSubmission` behavior and metrics deltas
- `getAdminMetrics` projection reads
- `backfillCreatorMetrics` rebuild behavior
- payment checkout/refund/webhook/cashout route behavior
- request/inference schema validation boundaries

## CI Philosophy (Current)

CI unit tests are the immediate safety gate. Team process currently requires pushing to `dev` and validating green tests before merging `dev` into `main`.
