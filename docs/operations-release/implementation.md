# Operations + Release Implementation

## Pre-Release Checklist

1. Sync working branch with `dev`.
2. Run local checks:

```bash
pnpm exec tsc --noEmit
pnpm test --run
pnpm lint
```

3. Verify required environment variables are set in deployment target.

## Convex Deployment Flow

For backend changes:

```bash
pnpm convex:deploy
```

If projection logic changed (or schema fields were added/updated), run one-time backfill:

```bash
pnpm convex run submissions:backfillCreatorMetrics '{}'
```

Use `--prod` when targeting production deployment explicitly.

## Branch Flow (Current)

1. Push changes to `dev`.
2. Confirm unit tests are green.
3. Open PR from `dev` to `main`.
4. Merge after verification.

## Post-Release Validation

- Check admin KPI cards for expected values.
- Validate member submission + admin answer round-trip on a smoke test experience.
- Review logs for integration/auth route errors.
