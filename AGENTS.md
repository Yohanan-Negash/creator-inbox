# AGENTS.md

This file provides guidance to OpenCode when working with code in this repository.

# Creator Inbox

Creator Inbox is a Next.js + Convex application for paid creator request submissions, admin response workflows, and KPI tracking.

## Tech Stack

- **Language**: TypeScript
- **Framework**: Next.js App Router (React 19)
- **Package Manager**: pnpm (use `pnpm` commands, not npm/yarn/bun)
- **Database**: Convex document database with Convex functions as backend layer
- **UI**: shadcn/ui + Tailwind CSS + lucide-react
- **Inference**: OpenAI SDK client pointed to Inference.net
- **External Platform**: Whop SDK for identity and access checks
- **Import Path**: Use `@/` for app/lib/components imports; use relative imports inside `convex/` and `__tests__/`

## Documentation System

This project uses **progressive disclosure** for documentation - load only what you need, when you need it.

### Reading Documentation

1. **Use the doc-reader subagent**: `@doc-reader <query>` - returns summaries, not full files
2. **Manual lookup**: Start at `docs/INDEX.md`, then section `INDEX.md`, then specific files
3. **Never read entire large files** - use progressive disclosure

### Documentation Structure

```
docs/
├── INDEX.md
├── architecture/
├── frontend-experience/
├── convex-backend/
├── ai-whop-integrations/
├── testing-ci/
├── operations-release/
└── sop/
```

### Key Sections

| Section | Description |
|---------|-------------|
| `architecture/` | System-level architecture, data flow, and design decisions |
| `frontend-experience/` | Member/admin app routes and UI component structure |
| `convex-backend/` | Convex schema, mutations/queries, and metrics projection logic |
| `ai-whop-integrations/` | Whop auth/access integration and AI request-type generation |
| `testing-ci/` | Vitest + convex-test setup and test strategy |
| `operations-release/` | Branching workflow, release process, and deployment operations |
| `sop/` | Repeatable operating procedures and checklists |

### Documentation Commands

- `@doc-reader <query>` - Ask questions about the codebase (isolated context)
- `/check-docs` - Review what documentation needs updating after changes

### Documentation Standards

When implementing features or fixing bugs:
1. **New Features**: Add to relevant section, update INDEX.md
2. **Bug Fixes**: Add to `troubleshooting.md` with: symptom -> cause -> fix
3. **Architecture Changes**: Update section overview and INDEX.md
4. **Issues Encountered**: Document in troubleshooting with prevention tips

### File Size Limits

- **Target**: 200-300 lines per file
- **Maximum**: 500 lines (split if larger)
- **INDEX.md**: ~50-100 lines

### User-Stated Facts

- Tests are organized under root `__tests__/`.
- CI currently runs unit tests as an interim safety gate.
- Team process currently relies on manually pushing to `dev` before merging to `main`.

## Architecture Overview

The app uses Next.js App Router for frontend rendering and route handlers, while Convex provides the backend domain model and state transitions. The member experience and admin experience are route-scoped pages under `app/experiences/[experienceId]/...`, with larger UI blocks extracted into `components/experiences/...` for maintainability.

Business logic for paid submissions lives in Convex mutations and queries (`convex/submissions.ts`, `convex/requestTypes.ts`). The data model stores request types, submissions, and a projection table (`creatorMetrics`) used for low-latency KPI reads. Projection updates happen synchronously inside write-path mutations, and a backfill internal mutation can rebuild metrics from `submissions`.

External integrations are handled in Next.js API routes. Whop access and identity checks gate both member/admin views and AI generation access. AI request-type generation uses schema-validated prompts and responses in `lib/inference/*`, with strict zod validation and centralized logging.

## Development Commands

**Package Manager**: This project uses pnpm exclusively. Do not use npm, yarn, or bun.

```bash
# Development
pnpm install
pnpm dev
pnpm exec tsc --noEmit

# Code Quality
pnpm lint

# Backend
pnpm convex:dev
pnpm convex:dev:local
pnpm convex:deploy

# Tests
pnpm test
pnpm test --run

# Build & Runtime
pnpm build
pnpm start
```

## Environment Variables

```env
# Required
NEXT_PUBLIC_CONVEX_URL="Convex deployment URL for browser client"
# or for local usage
NEXT_PUBLIC_CONVEX_URL_LOCAL="Local Convex URL"

WHOP_API_KEY="Whop API key"
NEXT_PUBLIC_WHOP_APP_ID="Whop app id (or use WHOP_APP_ID)"

INFERENCE_API_KEY="Inference provider API key"

# Optional
WHOP_APP_ID="Server-side fallback for Whop app id"
INFERENCE_MODEL="Override model id (default: google/gemma-3-27b-instruct/bf-16)"
NODE_ENV="production | development"
```

## Code Architecture

- `app/`: Next.js routes and API handlers.
  - `app/experiences/[experienceId]/page.tsx`: member surface
  - `app/experiences/[experienceId]/admin/page.tsx`: admin surface
  - `app/api/whop/user/route.ts`: user + access retrieval
  - `app/api/inference/request-types/route.ts`: AI generation endpoint
- `components/experiences/`: extracted feature UI components.
- `convex/`: backend schema + queries/mutations.
- `lib/`: integrations (Whop, inference client/prompt/schema), constants, logger.
- `__tests__/`: vitest suites using `convex-test`.

## Important Rules

1. Use `pnpm` only.
2. Keep functional changes scoped; avoid formatting-only edits unless requested.
3. Update docs when behavior, architecture, or ops workflow changes.
4. Preserve Convex projection invariants when touching metrics logic.
5. Keep API route auth/access checks explicit and logged.
6. Prefer `@/` imports for app-side code and relative imports inside `convex/`.
7. Run `pnpm test --run` after backend logic changes.
8. Keep `main` treated as production-ready; integrate via `dev` first.

## Deployment Checklist

1. Ensure `dev` branch is green (`pnpm test --run`, lint, and build as needed).
2. Confirm Convex migrations/schema/function changes are deployed appropriately.
3. Backfill projections if schema/projection logic changed (`backfillCreatorMetrics`).
4. Open PR from `dev` to `main` and validate CI.
5. Merge only after checks pass and manual smoke test is complete.
