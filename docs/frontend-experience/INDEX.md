---
name: Frontend Experience
description: Member/admin routes, UI composition, and interaction behavior
keywords: [frontend, nextjs, member, admin, components]
related: [architecture, convex-backend]
---

# Frontend Experience

**Version:** 1.0 | **Last Updated:** 2026-02-20

## Quick Reference

| Resource | Value |
|----------|-------|
| **Member Route** | `app/experiences/[experienceId]/page.tsx` |
| **Admin Route** | `app/experiences/[experienceId]/admin/page.tsx` |
| **Component Pattern** | Route orchestrator + extracted feature UI components |

## Files in This Section

| File | Purpose | When to Read |
|------|---------|--------------|
| [overview.md](./overview.md) | Surface-level UX and route responsibilities | Before UI or flow changes |
| [implementation.md](./implementation.md) | Component map and state patterns | While editing route/component code |
| [troubleshooting.md](./troubleshooting.md) | UI behavior and interaction edge cases | During bug triage |

## Common Tasks

| I want to... | Go to... |
|--------------|----------|
| Add a new admin table/card interaction | [implementation.md](./implementation.md) |
| Change member submission flow | [implementation.md](./implementation.md) |
| Diagnose dialog/validation behavior | [troubleshooting.md](./troubleshooting.md) |

## Key Implementation Files

| File | Purpose |
|------|---------|
| `app/experiences/[experienceId]/page.tsx` | Member page state and orchestration |
| `app/experiences/[experienceId]/admin/page.tsx` | Admin page state and orchestration |
| `components/experiences/member/*.tsx` | Member extracted UI blocks |
| `components/experiences/admin/*.tsx` | Admin extracted UI blocks |

## Related Documentation

- [Convex Backend](../convex-backend/) - source of data and state transitions
- [AI + Whop Integrations](../ai-whop-integrations/) - access checks and generation endpoints
