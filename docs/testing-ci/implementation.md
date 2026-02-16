# Testing + CI Implementation

## Test Configuration

- `vitest.config.ts`
  - `environment: "edge-runtime"`
  - include pattern: `__tests__/**/*.test.ts`
  - inlines `convex-test` dependency

## Convex Harness Setup

- `__tests__/convex.setup.ts`
  - loads schema from `convex/schema`
  - uses `import.meta.glob("../convex/**/*.ts")`
  - exports `createConvexTest()` helper

## Existing Test Files

- Convex domain + projection tests
  - `__tests__/submissions.create-and-metrics.test.ts`
  - `__tests__/submissions.answer-and-metrics.test.ts`
  - `__tests__/submissions.delete-metrics.test.ts`
  - `__tests__/submissions.get-admin-metrics.test.ts`
  - `__tests__/submissions.backfill-creator-metrics.test.ts`
  - `__tests__/submissions.admin-dashboard-pagination.test.ts`
  - `__tests__/submissions.member-pagination.test.ts`
  - `__tests__/payments.cashout.test.ts`
  - `__tests__/cashout-fees.test.ts`
- HTTP route behavior tests (mocked integrations)
  - `__tests__/submissions.action-route.test.ts`
  - `__tests__/submissions.member-submissions-route.test.ts`
  - `__tests__/submissions.admin-submissions-route.test.ts`
  - `__tests__/payments.create-submission-payment-route.test.ts`
  - `__tests__/payments.submission-status-route.test.ts`
  - `__tests__/payments.webhook-route.test.ts`
  - `__tests__/payments.refund-submission-route.test.ts`
- Validation/schema tests
  - `__tests__/request-types.integer-validation.test.ts`
  - `__tests__/inference.schemas.test.ts`

## Commands

```bash
pnpm test
pnpm test --run
pnpm exec tsc --noEmit
```

## GitHub Actions Workflows

### Unit tests

- File: `.github/workflows/unit-tests.yml`
- Triggers:
  - push to `dev`
  - pull request to `main`
- Behavior: installs deps and runs `pnpm test --run`.

### PR label policy

- File: `.github/workflows/pr-label-policy.yml`
- Trigger: pull request events targeting `main` (`opened`, `reopened`, `synchronize`, `ready_for_review`, `labeled`, `unlabeled`)
- Behavior: requires exactly one primary label from `feat`, `fix`, `enhancement`, `chore`, `docs`. Optional `breaking` is allowed.

### Release workflow on main

- File: `.github/workflows/release.yml`
- Trigger: `pull_request` `closed` for PRs targeting `main` (job runs only when merged)
- Behavior:
  1. Computes bump (`major`, `minor`, `patch`) from PR labels (`breaking` overrides)
  2. Writes a temporary `.changeset/release-pr-*.md` entry with a prefixed summary
  3. Runs `pnpm version-packages` to update `package.json` and `CHANGELOG.md`
  4. Commits and pushes release files to `main` as `chore: release vX.Y.Z`
  5. Runs `pnpm release` to create tag + GitHub release notes

## Adding New Backend Tests

1. Add a new file under `__tests__/` ending with `.test.ts`.
2. Use `createConvexTest()` to initialize in-memory Convex runtime.
3. Use `t.mutation`, `t.query`, and `t.run` for assertions and direct data setup.
4. Assert both domain state transitions and projection side effects when applicable.
