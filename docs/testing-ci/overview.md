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

CI now has layered safety gates aligned to the `dev` -> `main` release model:

- Unit tests run on pushes to `dev` and PRs targeting `main`.
- PR label policy runs on PRs targeting `dev` and enforces release labeling.
- Changeset generation runs when a PR to `dev` is merged.
- Release automation runs on pushes to `main` and creates/updates the version PR, then publishes GitHub releases after version PR merge.

This keeps tests as the quality gate while ensuring version metadata and release notes are generated consistently from PR labels.
