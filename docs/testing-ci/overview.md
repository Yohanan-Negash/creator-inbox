# Testing + CI Overview

## Current Strategy

The repository currently uses unit-style backend tests focused on Convex business logic and metrics projection behavior.

- Test runner: Vitest
- Convex harness: `convex-test`
- Runtime environment: `edge-runtime`
- Test location: root `__tests__/`

## Current Coverage Focus

- `createSubmission` behavior and metrics deltas
- `answerSubmission` behavior and metrics deltas
- `getAdminMetrics` projection reads
- `backfillCreatorMetrics` rebuild behavior

## CI Philosophy (Current)

CI unit tests are the immediate safety gate. Team process currently requires pushing to `dev` and validating green tests before merging `dev` into `main`.
