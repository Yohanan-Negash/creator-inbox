---
name: Testing + CI
description: Unit testing conventions and CI strategy
keywords: [vitest, convex-test, ci, github-actions, unit-tests]
related: [convex-backend, operations-release]
---

# Testing + CI

**Version:** 1.1 | **Last Updated:** 2026-02-16

## Quick Reference

| Resource | Value |
|----------|-------|
| **Test runner** | Vitest |
| **Backend test harness** | `convex-test` |
| **Test root** | `__tests__/` |
| **Primary command** | `pnpm test --run` |
| **Release label gate** | `PR Label Policy` workflow on `main` PRs |

## Files in This Section

| File | Purpose | When to Read |
|------|---------|--------------|
| [overview.md](./overview.md) | Test philosophy and scope | Before adding new tests |
| [implementation.md](./implementation.md) | Config and file-level test patterns | While writing/modifying tests |
| [troubleshooting.md](./troubleshooting.md) | Setup and runtime test issues | During failing CI/local runs |

## Common Tasks

| I want to... | Go to... |
|--------------|----------|
| Add a Convex mutation test | [implementation.md](./implementation.md) |
| Understand existing metric tests | [implementation.md](./implementation.md) |
| Fix failing test environment setup | [troubleshooting.md](./troubleshooting.md) |

## Key Implementation Files

| File | Purpose |
|------|---------|
| `vitest.config.ts` | Vitest runtime config |
| `__tests__/convex.setup.ts` | Convex test harness initialization |
| `__tests__/submissions.*.test.ts` | Submission lifecycle + metrics + admin pagination coverage |
| `__tests__/payments.*.test.ts` | Payment/cashout domain logic + HTTP route behavior |
| `__tests__/inference.schemas.test.ts` | AI schema contract coverage |
| `.github/workflows/pr-label-policy.yml` | Enforces required release labels on PRs targeting `main` |
| `.github/workflows/release.yml` | Merged-PR release automation on `main` |

## Related Documentation

- [Convex Backend](../convex-backend/) - domain behavior under test
- [Operations + Release](../operations-release/) - CI gate and release workflow
