---
name: Convex Backend
description: Schema, domain functions, and KPI projection behavior
keywords: [convex, schema, mutation, query, metrics]
related: [architecture, frontend-experience, testing-ci]
---

# Convex Backend

**Version:** 1.0 | **Last Updated:** 2026-02-08

## Quick Reference

| Resource | Value |
|----------|-------|
| **Schema file** | `convex/schema.ts` |
| **Submission domain** | `convex/submissions.ts` |
| **Request type domain** | `convex/requestTypes.ts` |
| **KPI projection** | `creatorMetrics` table |

## Files in This Section

| File | Purpose | When to Read |
|------|---------|--------------|
| [overview.md](./overview.md) | Core backend model and data lifecycle | Before data model edits |
| [implementation.md](./implementation.md) | Mutation/query behavior and projection deltas | During backend feature updates |
| [troubleshooting.md](./troubleshooting.md) | Common backend and projection failures | During incidents and debugging |

## Common Tasks

| I want to... | Go to... |
|--------------|----------|
| Add a new submission status transition | [implementation.md](./implementation.md) |
| Add KPI counters or money fields | [implementation.md](./implementation.md) |
| Rebuild projections from history | [implementation.md](./implementation.md) |

## Key Implementation Files

| File | Purpose |
|------|---------|
| `convex/schema.ts` | Table definitions and indexes |
| `convex/submissions.ts` | Submission lifecycle + metrics updates + backfill |
| `convex/requestTypes.ts` | Request type CRUD/state toggles |

## Related Documentation

- [Testing + CI](../testing-ci/) - unit tests covering backend flows
- [Operations + Release](../operations-release/) - deploy and backfill checklist
