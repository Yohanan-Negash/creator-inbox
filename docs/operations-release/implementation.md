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

## PR Labeling + Changeset Automation

For every PR targeting `dev`, apply labels before merge:

- Required: exactly one primary label (`feat`, `fix`, `enhancement`, `chore`, or `docs`).
- Optional: `breaking` for major changes.

On merge to `dev`, CI automatically creates a `.changeset/*.md` file with:

- The semantic bump (`major`, `minor`, `patch`) derived from labels.
- A release-note summary prefixed with the primary label.

Priority rules:

1. `breaking` always forces `major`.
2. Otherwise `feat` yields `minor`.
3. Otherwise `fix`/`enhancement`/`chore`/`docs` yield `patch`.

## Main Release Automation

On push to `main`, release workflow runs `changesets/action`.

Behavior:

1. If pending changesets exist, automation opens/updates a `chore: version packages` PR.
2. After that PR is merged, automation:
   - reads the new package version,
   - creates tag `v<version>`,
   - creates a GitHub Release with notes from the matching `CHANGELOG.md` section.

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

1. Open feature PR into `dev`.
2. Apply one primary release label (`feat`, `fix`, `enhancement`, `chore`, or `docs`).
3. Merge feature PR to `dev` (changeset file is generated automatically).
4. Confirm dev checks are green.
5. Open PR from `dev` to `main`.
6. Merge after verification.
7. Merge release version PR generated on `main`.

## Post-Release Validation

- Check admin KPI cards for expected values.
- Validate member submission + admin answer round-trip on a smoke test experience.
- Review logs for integration/auth route errors.
