---
name: AI + Whop Integrations
description: Access control and AI request-type generation integration details
keywords: [whop, inference, ai, api-routes, auth]
related: [architecture, frontend-experience]
---

# AI + Whop Integrations

**Version:** 1.0 | **Last Updated:** 2026-02-08

## Quick Reference

| Resource | Value |
|----------|-------|
| **Whop route** | `app/api/whop/user/route.ts` |
| **AI route** | `app/api/inference/request-types/route.ts` |
| **Whop client helper** | `lib/whop.ts` |
| **Inference client helper** | `lib/inference/client.ts` |

## Files in This Section

| File | Purpose | When to Read |
|------|---------|--------------|
| [overview.md](./overview.md) | Integration boundaries and auth flow | Before integration changes |
| [implementation.md](./implementation.md) | Route-level behavior and validation | While updating API routes |
| [troubleshooting.md](./troubleshooting.md) | Common auth/inference failures | During API debugging |

## Common Tasks

| I want to... | Go to... |
|--------------|----------|
| Diagnose unauthorized responses | [troubleshooting.md](./troubleshooting.md) |
| Change AI request payload schema | [implementation.md](./implementation.md) |
| Add structured logs for integrations | [implementation.md](./implementation.md) |

## Key Implementation Files

| File | Purpose |
|------|---------|
| `app/api/whop/user/route.ts` | Identity + access retrieval endpoint |
| `app/api/inference/request-types/route.ts` | Admin-gated request type generation endpoint |
| `lib/whop.ts` | Whop SDK config and env validation |
| `lib/inference/generate-request-types.ts` | Inference request orchestration |
| `lib/inference/schemas.ts` | zod schemas for AI prompts/outputs |

## Related Documentation

- [Architecture](../architecture/) - integration position in full system
- [Frontend Experience](../frontend-experience/) - where route responses are consumed
