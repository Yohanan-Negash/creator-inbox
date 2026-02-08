---
name: Testing + CI
description: Unit testing conventions and CI strategy
keywords: [vitest, convex-test, ci, github-actions, unit-tests]
related: [convex-backend, operations-release]
---

# Testing + CI

**Version:** 1.0 | **Last Updated:** 2026-02-08

## Quick Reference

| Resource | Value |
|----------|-------|
| **Test runner** | Vitest |
| **Backend test harness** | `convex-test` |
| **Test root** | `__tests__/` |
| **Primary command** | `pnpm test --run` |

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
| `__tests__/submissions.*.test.ts` | Submission + metrics coverage |

## Related Documentation

- [Convex Backend](../convex-backend/) - domain behavior under test
- [Operations + Release](../operations-release/) - CI gate and release workflow
