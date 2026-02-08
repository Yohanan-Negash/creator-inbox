---
name: Architecture
description: High-level system architecture, boundaries, and data flow
keywords: [architecture, system-design, data-flow, boundaries]
related: [frontend-experience, convex-backend, ai-whop-integrations]
---

# Architecture

**Version:** 1.0 | **Last Updated:** 2026-02-08

## Quick Reference

| Resource | Value |
|----------|-------|
| **Frontend Framework** | Next.js App Router |
| **Backend Runtime** | Convex functions |
| **Primary Data Store** | Convex document DB |
| **Auth/Access** | Whop SDK via API routes |
| **AI Generation** | Inference.net via OpenAI SDK |

## Files in This Section

| File | Purpose | When to Read |
|------|---------|--------------|
| [overview.md](./overview.md) | Architecture map and major runtime flow | Starting any significant feature change |
| [implementation.md](./implementation.md) | Conventions and design decisions | Before touching cross-layer behavior |
| [troubleshooting.md](./troubleshooting.md) | Cross-cutting issues | During production/debug incidents |

## Common Tasks

| I want to... | Go to... |
|--------------|----------|
| Understand request lifecycle | [overview.md](./overview.md) |
| Validate where auth happens | [implementation.md](./implementation.md) |
| Trace KPI source of truth | [implementation.md](./implementation.md) |

## Key Implementation Files

| File | Purpose |
|------|---------|
| `app/experiences/[experienceId]/page.tsx` | Member route entry point |
| `app/experiences/[experienceId]/admin/page.tsx` | Admin route entry point |
| `convex/submissions.ts` | Submission state transitions + metrics |
| `convex/schema.ts` | Convex table/index definitions |
| `app/api/whop/user/route.ts` | Auth/access retrieval route |
| `app/api/inference/request-types/route.ts` | AI generation route with access gating |

## Related Documentation

- [Frontend Experience](../frontend-experience/) - Route-level UX and extracted components
- [Convex Backend](../convex-backend/) - Schema and domain mutations/queries
- [AI + Whop Integrations](../ai-whop-integrations/) - Third-party integration details
