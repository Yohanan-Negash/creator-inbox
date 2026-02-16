---
name: Release Dev to Main With Labels
description: Ship from dev to main with automatic semantic versioning and GitHub releases
triggers: [release prep, dev to main merge]
last_updated: 2026-02-16
---

# Release Dev to Main With Labels

## Overview

Use this SOP for the solo-developer release flow where work lands on `dev`, then a labeled PR is merged into `main`.

## Prerequisites

- [ ] Release labels exist: `feat`, `fix`, `enhancement`, `chore`, `docs`, `breaking`
- [ ] Work is pushed to `dev`
- [ ] Unit tests are passing

## Procedure

### Step 1: Open and label the release PR

1. Open PR from `dev` to `main`.
2. Apply exactly one primary label: `feat`, `fix`, `enhancement`, `chore`, or `docs`.
3. Add `breaking` only when the release should be major.

### Step 2: Merge and let automation run

1. Merge the `dev` -> `main` PR.
2. Wait for the `Release` workflow to finish.
3. Confirm automation committed release updates to `main`.

### Step 3: Verify published release

1. Confirm `package.json` version is incremented.
2. Confirm tag `vX.Y.Z` exists.
3. Confirm GitHub Release exists with notes derived from changelog.

## Verification

- Exactly one release commit was created by automation (`chore: release vX.Y.Z`).
- GitHub shows matching tag and release.
- Release notes include the expected label prefix.

## Troubleshooting

- Missing/duplicate primary labels fail the PR label policy check.
- No release after merge usually means `Release` workflow failed; inspect workflow logs.

## Related Documentation

- `docs/operations-release/implementation.md`
- `docs/operations-release/troubleshooting.md`
- `docs/testing-ci/implementation.md`
