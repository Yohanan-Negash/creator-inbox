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

- `__tests__/submissions.create-and-metrics.test.ts`
  - submission creation success + validation rejection
- `__tests__/submissions.answer-and-metrics.test.ts`
  - answer success + expired-window rejection
- `__tests__/submissions.get-admin-metrics.test.ts`
  - projection-backed metric read assertions
- `__tests__/submissions.backfill-creator-metrics.test.ts`
  - full rebuild of `creatorMetrics` from seeded submissions

## Commands

```bash
pnpm test
pnpm test --run
pnpm exec tsc --noEmit
```

## Adding New Backend Tests

1. Add a new file under `__tests__/` ending with `.test.ts`.
2. Use `createConvexTest()` to initialize in-memory Convex runtime.
3. Use `t.mutation`, `t.query`, and `t.run` for assertions and direct data setup.
4. Assert both domain state transitions and projection side effects when applicable.
