---
name: Operations + Release
description: Branching strategy, release flow, and operational checks
keywords: [operations, release, dev, main, deployment]
related: [testing-ci, convex-backend]
---

# Operations + Release

**Version:** 1.0 | **Last Updated:** 2026-02-08

## Quick Reference

| Resource | Value |
|----------|-------|
| **Integration branch** | `dev` |
| **Production branch** | `main` |
| **Safety gate** | Unit tests green before `dev` -> `main` merge |
| **Projection rebuild tool** | `submissions:backfillCreatorMetrics` |

## Files in This Section

| File | Purpose | When to Read |
|------|---------|--------------|
| [overview.md](./overview.md) | Operational model and release policy | Before shipping changes |
| [implementation.md](./implementation.md) | Step-by-step release and deploy commands | During release execution |
| [troubleshooting.md](./troubleshooting.md) | Common release/runtime issues | During release incidents |

## Common Tasks

| I want to... | Go to... |
|--------------|----------|
| Ship backend changes safely | [implementation.md](./implementation.md) |
| Rebuild creator metrics after schema logic change | [implementation.md](./implementation.md) |
| Recover from failing release validation | [troubleshooting.md](./troubleshooting.md) |

## Key Implementation Files

| File | Purpose |
|------|---------|
| `convex/submissions.ts` | Backfill mutation and projection logic |
| `convex/schema.ts` | Schema that must be deployed with backend changes |
| `package.json` | Canonical dev/test/build scripts |

## Related Documentation

- [Testing + CI](../testing-ci/) - pre-merge unit test gate
- [Convex Backend](../convex-backend/) - projection and migration-sensitive code
