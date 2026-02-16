# Operations + Release Overview

## Branch Model

- `dev`: integration branch for ongoing work.
- `main`: production-ready branch.

Current process relies on feature PRs into `dev` and automated releases from `main`.

## Versioning + Release Model

- Semantic versioning is managed by Changesets.
- PR labels on merges to `dev` determine release type.
- Merges to `main` trigger release automation:
  1. Create/update version PR when pending changesets exist.
  2. After version PR merge, create git tag + GitHub release automatically.

## Label Policy

- Exactly one primary label is required per PR to `dev`:
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
