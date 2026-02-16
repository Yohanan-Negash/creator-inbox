---
name: Operations + Release
description: Branching strategy, release flow, and operational checks
keywords: [operations, release, dev, main, deployment]
related: [testing-ci, convex-backend]
---

# Operations + Release

**Version:** 1.1 | **Last Updated:** 2026-02-16

## Quick Reference

| Resource | Value |
|----------|-------|
| **Integration branch** | `dev` |
| **Production branch** | `main` |
| **Safety gate** | Unit tests + PR label policy before merge |
| **Release automation** | Changesets + GitHub Releases on `main` |
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
| Understand release label rules | [implementation.md](./implementation.md) |
| Ship backend changes safely | [implementation.md](./implementation.md) |
| Rebuild creator metrics after schema logic change | [implementation.md](./implementation.md) |
| Recover from failing release validation | [troubleshooting.md](./troubleshooting.md) |

## Key Implementation Files

| File | Purpose |
|------|---------|
| `convex/submissions.ts` | Backfill mutation and projection logic |
| `convex/schema.ts` | Schema that must be deployed with backend changes |
| `package.json` | Canonical dev/test/build scripts |
| `.github/workflows/release.yml` | Main-branch versioning and GitHub release automation |
| `.github/workflows/create-changeset-on-dev-merge.yml` | Label-driven changeset generation on merge to `dev` |

## Related Documentation

- [Testing + CI](../testing-ci/) - pre-merge unit test gate
- [Convex Backend](../convex-backend/) - projection and migration-sensitive code
