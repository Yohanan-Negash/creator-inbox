# Operations + Release Overview

## Branch Model

- `dev`: integration branch for ongoing work.
- `main`: production-ready branch.

Current process relies on feature PRs into `dev` and automated releases from `main`.

## Versioning + Release Model

- Semantic versioning is managed by Changesets.
- PR labels on the `dev` -> `main` merge PR determine release type.
- Merges to `main` trigger release automation that directly:
  1. Generates a changeset from PR labels.
  2. Applies version bump + changelog update.
  3. Commits release changes to `main`.
  4. Creates git tag + GitHub release automatically.

## Label Policy

- Exactly one primary label is required on each PR targeting `main`:
  - `feat` -> minor
  - `fix` -> patch
  - `enhancement` -> patch
  - `chore` -> patch
  - `docs` -> patch
- Optional `breaking` label forces major (overrides primary label bump).
- Release note entries use prefix format: `feat:`, `fix:`, `enhancement:`, `chore:`, `docs:`.

## Release Risk Areas

- Convex schema/function mismatches after deploy.
- Metrics projection drift when transition logic changes.
- Integration credentials missing in environment.

## Operational Principle

Keep releases predictable by validating tests first, deploying Convex-compatible changes together, and backfilling projections when metric semantics change.
