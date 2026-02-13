---
name: Creator Inbox Documentation
description: Documentation hub for AI coding assistance - use progressive disclosure to find what you need
last_updated: 2026-02-08
---

# Documentation Index

## How to Use These Docs

This documentation uses **progressive disclosure** - load only what you need:

1. **Start here** - Read section descriptions below to find relevant docs
2. **Read section INDEX.md** - Get overview and file list for your topic
3. **Read specific files** - Only load the files you actually need

**Commands:**
- `@doc-reader <query>` - Ask questions (isolated context, returns summaries)
- `/check-docs` - Review what docs need updating after your changes

---

## Core Systems

| Section | Description | Key Files |
|---------|-------------|-----------|
| [architecture/](./architecture/) | System design, boundaries, and runtime flow | `overview.md`, `implementation.md` |
| [frontend-experience/](./frontend-experience/) | Member/admin pages, UI components, and UX behavior | `overview.md`, `implementation.md` |
| [convex-backend/](./convex-backend/) | Convex schema, domain logic, and KPI projections | `overview.md`, `implementation.md` |
| [ai-whop-integrations/](./ai-whop-integrations/) | Whop auth/access and AI request-type generation | `overview.md`, `implementation.md` |
| [testing-ci/](./testing-ci/) | Vitest strategy and CI workflow guidance | `overview.md`, `implementation.md` |
| [operations-release/](./operations-release/) | Branching, deployments, and release process | `overview.md`, `implementation.md` |
| [sop/](./sop/) | Repeatable process playbooks | `INDEX.md` |

## Quick Navigation

### By Task

| I want to... | Go to... |
|--------------|----------|
| Understand system architecture quickly | `architecture/overview.md` |
| Add or change member/admin UI flows | `frontend-experience/implementation.md` |
| Change submissions/request type logic | `convex-backend/implementation.md` |
| Update KPI metrics behavior | `convex-backend/implementation.md` |
| Debug auth/access issues | `ai-whop-integrations/troubleshooting.md` |
| Add new unit tests | `testing-ci/implementation.md` |
| Prepare a release from dev to main | `operations-release/implementation.md` |

### By Error Type

| Error Type | Check |
|------------|-------|
| Unauthorized or access denied | `ai-whop-integrations/troubleshooting.md` |
| Convex query/mutation failures | `convex-backend/troubleshooting.md` |
| KPI mismatch or stale metrics | `convex-backend/troubleshooting.md` |
| Unit test failures | `testing-ci/troubleshooting.md` |
| Release or branch flow issues | `operations-release/troubleshooting.md` |

---

## Section Overview

### Architecture (4 files)
Captures the system as a whole: Next.js entry points, Convex backend boundaries, integration touchpoints, and deployment flow. Read this first if you need broad context before making changes.

### Frontend Experience (4 files)
Documents member and admin surface behavior under `app/experiences/[experienceId]/...` and extracted components under `components/experiences/...`.

### Convex Backend (4 files)
Covers schema definitions, request type/submission mutations and queries, creator metrics projection updates, and backfill behavior.

### AI + Whop Integrations (4 files)
Explains server-side routes and utility layers for Whop token validation/access checks and Inference.net request-type generation.

### Testing + CI (4 files)
Defines the unit test strategy with `vitest` and `convex-test`, test layout under root `__tests__/`, and CI execution expectations.

### Operations + Release (4 files)
Describes branch workflow (`dev` -> `main`), deployment checklist, and interim manual gates while branch rules are unavailable.

### SOP (2 files)
Template and standards for adding repeatable operational runbooks as the project evolves.
