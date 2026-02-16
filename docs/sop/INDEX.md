---
name: Standard Operating Procedures
description: Step-by-step guides for repeating processes and operations
keywords: [sop, procedures, operations, guides, checklists]
last_updated: 2026-02-16
---

# Standard Operating Procedures (SOPs)

## What are SOPs?

SOPs are step-by-step guides for processes that:
- Are performed repeatedly
- Have multiple steps that are easy to forget
- Involve non-obvious gotchas or edge cases
- Need to be performed consistently

## When to Create an SOP

Create an SOP when you encounter a process that:

1. **Has 3+ steps** - Simple processes do not need SOPs
2. **Will be repeated** - One-off tasks do not need SOPs
3. **Has non-obvious steps** - If it is not intuitive, document it
4. **Can fail in subtle ways** - Document the gotchas

## Available SOPs

| SOP | Description | When to Use |
|-----|-------------|-------------|
| [user-facing-error-sanitization-audit.md](./user-facing-error-sanitization-audit.md) | Ensure UI errors stay simple while server logs remain technical | When changing API/UI error handling |
| [release-from-dev-to-main-label-driven-changesets.md](./release-from-dev-to-main-label-driven-changesets.md) | Ship with label-driven semantic versioning and automated GitHub releases | When promoting `dev` changes to `main` |
| [triage-failed-automated-release.md](./triage-failed-automated-release.md) | Diagnose failures in version PR or GitHub release automation | When release workflows fail or outputs are missing |

## Creating New SOPs

Use the `/check-docs` command after completing a multi-step process. It will:
1. Detect if the process should become an SOP
2. Suggest a structure based on what was done
3. Provide a template to fill out

### SOP Template

```markdown
---
name: [Process Name]
description: [One-line description]
triggers: [When to use this SOP]
last_updated: [Date]
---

# [Process Name]

## Overview
Brief description of what this SOP covers and why.

## Prerequisites
- [ ] Prerequisite 1
- [ ] Prerequisite 2

## Procedure

### Step 1: [Step Name]
Description and commands/actions.

### Step 2: [Step Name]
Description and commands/actions.

## Verification
How to verify the process completed successfully.

## Troubleshooting
Common issues and their solutions.

## Related Documentation
- Links to related docs
```
