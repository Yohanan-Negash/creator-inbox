---
name: Release Automation Failure Triage
description: Diagnose and recover when automatic versioning or GitHub release publishing fails
triggers: [release workflow failure, missing version bump, missing github release]
last_updated: 2026-02-16
---

# Release Automation Failure Triage

## Overview

Use this SOP when a merged `dev` -> `main` PR does not produce the expected version bump, tag, or GitHub release.

## Prerequisites

- [ ] Access to GitHub Actions logs
- [ ] Access to main branch commit history

## Procedure

### Step 1: Locate failed workflow stage

1. Open the latest run of `.github/workflows/release.yml`.
2. Identify whether failure occurred during metadata, versioning, commit/push, or release creation.

### Step 2: Verify label input

1. Open the merged PR to `main`.
2. Confirm exactly one primary label exists (`feat`, `fix`, `enhancement`, `chore`, `docs`).
3. Confirm `breaking` was only used as optional override.

### Step 3: Verify repository state

1. Check whether release commit was created on `main`.
2. Check `package.json` version increment.
3. Check whether tag `vX.Y.Z` exists.

### Step 4: Fix and rerun

1. Correct labels/permissions/configuration as needed.
2. Rerun the failed workflow from GitHub Actions.
3. Re-verify commit/tag/release outputs.

## Verification

- Release workflow completes successfully.
- Version, tag, and GitHub release all exist and match.

## Troubleshooting

- If local `pnpm changeset status` fails with architecture errors, use CI as source of truth.
- If commit succeeds but release is missing, verify `GITHUB_TOKEN` permissions include `contents: write`.

## Related Documentation

- `docs/operations-release/troubleshooting.md`
- `docs/testing-ci/implementation.md`
