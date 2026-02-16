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

For every PR targeting `main` (from `dev`), apply labels before merge:

- Required: exactly one primary label (`feat`, `fix`, `enhancement`, `chore`, or `docs`).
- Optional: `breaking` for major changes.

On merge to `main`, CI automatically:

- Generates a temporary `.changeset/*.md` file from labels.
- Applies semantic version + changelog updates.
- Commits release files back to `main`.
- Creates tag and GitHub release notes.

Priority rules:

1. `breaking` always forces `major`.
2. Otherwise `feat` yields `minor`.
3. Otherwise `fix`/`enhancement`/`chore`/`docs` yield `patch`.

## Main Release Automation

On merged PR to `main`, release workflow runs automatically.

Behavior:

1. Reads labels on the merged PR to compute `major`, `minor`, or `patch`.
2. Builds a release note line with prefix (`feat:`, `fix:`, `enhancement:`, `chore:`, `docs:`).
3. Runs `pnpm version-packages` to update `package.json` and `CHANGELOG.md`.
4. Commits release updates to `main`.
5. Runs `pnpm release` to create `v<version>` GitHub release.

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
2. Confirm dev checks are green.
3. Open PR from `dev` to `main`.
4. Apply one primary release label (`feat`, `fix`, `enhancement`, `chore`, or `docs`), optionally `breaking`.
5. Merge PR after verification.
6. Verify automated release commit, tag, and GitHub release were created.

## Post-Release Validation

- Check admin KPI cards for expected values.
- Validate member submission + admin answer round-trip on a smoke test experience.
- Review logs for integration/auth route errors.
