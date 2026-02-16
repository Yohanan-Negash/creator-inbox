---
name: Release From Dev to Main (Label-Driven Changesets)
description: Ship releases with automatic SemVer bumps and GitHub release notes from PR labels
triggers: [release preparation, dev to main merge, semantic versioning workflow]
last_updated: 2026-02-16
---

# Release From Dev to Main (Label-Driven Changesets)

## Overview

Use this SOP to ship changes from `dev` to `main` with automated Changesets versioning and GitHub Releases.

## Prerequisites

- [ ] Release labels exist in GitHub: `feat`, `fix`, `enhancement`, `chore`, `docs`, `breaking`
- [ ] CI workflows are enabled for label policy, changeset generation, and release
- [ ] Local tests are passing on `dev`

## Procedure

### Step 1: Prepare feature PRs to `dev`

1. Open PRs into `dev` for each feature/fix.
2. Apply exactly one primary label: `feat`, `fix`, `enhancement`, `chore`, or `docs`.
3. Add `breaking` only when the change is backward-incompatible.

### Step 2: Merge feature PRs and verify changesets

1. Merge PRs after CI passes.
2. Confirm workflow adds `.changeset/*.md` commit on `dev` for each merged PR.
3. Ensure entry prefix matches the label (`feat:`, `fix:`, `enhancement:`, `chore:`, `docs:`).

### Step 3: Promote `dev` to `main`

1. Open PR from `dev` to `main`.
2. Verify standard checks are green.
3. Merge PR to `main`.

### Step 4: Complete version and release publish

1. Wait for `Release` workflow to open or update `chore: version packages` PR.
2. Review and merge the version PR.
3. Confirm tag `v<version>` and GitHub Release were created.

## Verification

- `main` has merged `chore: version packages` commit.
- New tag `vX.Y.Z` exists.
- GitHub Release is published with notes generated from changelog entries.

## Troubleshooting

- If label policy fails, ensure only one primary label is present.
- If no version PR appears, check pending `.changeset/*.md` files were merged to `main`.
- If release is missing after version PR merge, inspect `Release` workflow logs and token permissions.

## Related Documentation

- `docs/operations-release/overview.md`
- `docs/operations-release/implementation.md`
- `docs/operations-release/troubleshooting.md`
