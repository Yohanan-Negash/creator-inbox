---
name: Release Docs Consistency Audit
description: Keep release and CI documentation aligned with workflow and automation behavior
triggers: [workflow changes, release script changes, branch policy updates]
last_updated: 2026-02-16
---

# Release Docs Consistency Audit

## Overview

Use this SOP after changing release/CI workflows or release scripts to prevent doc drift and stale runbooks.

## Prerequisites

- [ ] Diff of changed workflow and release files is available
- [ ] Access to `docs/testing-ci`, `docs/operations-release`, and `docs/sop`

## Procedure

### Step 1: Capture source-of-truth automation changes

1. Review changed files under `.github/workflows/`.
2. Review release-related scripts (`scripts/`, `package.json` scripts).
3. Record actual triggers, branch targets, and output artifacts.

### Step 2: Update release/testing docs

1. Update `docs/testing-ci/*.md` workflow triggers and behavior summaries.
2. Update `docs/operations-release/*.md` to reflect current release execution path.
3. Update troubleshooting entries for any newly observed failure modes.

### Step 3: Update SOP references and canonical files

1. Ensure `docs/sop/INDEX.md` lists one canonical SOP per process.
2. Remove or archive duplicate SOPs that describe the same process.
3. Ensure `docs/INDEX.md` links to canonical SOP filenames.

### Step 4: Run stale-reference sweep

1. Search docs for deleted workflow filenames.
2. Search docs for outdated behavior language (wrong branch targets, deprecated release flow).
3. Fix stale references before merge.

## Verification

- Workflow triggers in docs match current YAML files.
- `docs/INDEX.md` and `docs/sop/INDEX.md` link to existing canonical SOP files.
- No references remain to removed workflows or deprecated release behavior.

## Troubleshooting

- If docs conflict after merge conflict resolution, re-check final default-branch file state before editing.
- If two SOPs differ for the same process, keep one canonical SOP and fold unique guidance into it.

## Related Documentation

- `docs/testing-ci/implementation.md`
- `docs/operations-release/implementation.md`
- `docs/sop/INDEX.md`
