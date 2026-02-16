---
name: Triage Failed Automated Release
description: Diagnose and recover when version PR or GitHub release automation fails
triggers: [release workflow failure, missing version PR, missing GitHub release]
last_updated: 2026-02-16
---

# Triage Failed Automated Release

## Overview

Use this SOP when release automation does not produce the expected version PR, tag, or GitHub Release.

## Prerequisites

- [ ] Access to GitHub Actions run logs
- [ ] Access to `dev` and `main` branch history

## Procedure

### Step 1: Identify failure point

1. Check `.github/workflows/release.yml` run on the latest `main` push.
2. Determine whether failure happened during:
   - version PR creation
   - publish step
   - GitHub release creation

### Step 2: Validate changeset input

1. Confirm merged feature PRs to `dev` had valid labels.
2. Confirm `.changeset/*.md` commits exist in `dev` and were included in `dev` -> `main` merge.
3. If none exist, merge a correctly labeled PR to `dev` and re-run release flow.

### Step 3: Validate permissions and auth

1. Confirm workflow has `contents: write` and `pull-requests: write`.
2. Confirm `GITHUB_TOKEN` is available to the workflow context.
3. Re-run failed workflow after permission fixes.

### Step 4: Validate release note extraction

1. Confirm `CHANGELOG.md` includes the expected target version section.
2. Confirm tag does not already exist for that version.
3. Re-run publish workflow if changelog or tag state was corrected.

## Verification

- Version PR appears when pending changesets exist.
- Merged version PR produces `vX.Y.Z` tag.
- GitHub Release appears for that tag with changelog notes.

## Troubleshooting

- If no version PR appears, there are no pending changesets in `main` history.
- If tag exists but release does not, rerun publish/release creation and check `gh` command errors in workflow logs.
- If local `changeset status` is blocked by architecture-specific binary issues, use CI workflow logs as source of truth.

## Related Documentation

- `docs/operations-release/troubleshooting.md`
- `docs/testing-ci/implementation.md`
