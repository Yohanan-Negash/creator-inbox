# Operations + Release Overview

## Branch Model

- `dev`: integration branch for ongoing work.
- `main`: production-ready branch.

Current process relies on manually pushing to `dev`, validating green tests, then merging `dev` into `main`.

## Release Risk Areas

- Convex schema/function mismatches after deploy.
- Metrics projection drift when transition logic changes.
- Integration credentials missing in environment.

## Operational Principle

Keep releases predictable by validating tests first, deploying Convex-compatible changes together, and backfilling projections when metric semantics change.
