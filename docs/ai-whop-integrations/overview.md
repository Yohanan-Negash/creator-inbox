# AI + Whop Integrations Overview

## Whop Integration

Whop handles user identity and experience access verification.

- `getWhopSdk()` reads app ID and API key from env, then initializes SDK.
- `/api/whop/user` verifies token from dev token or request headers.
- If `experienceId` is present, route also returns access-level info.

This route is the gatekeeper for member/admin page entry behavior.

## AI Request-Type Generation

- `/api/inference/request-types` validates request body with zod.
- Verifies Whop token and checks admin access before generation.
- Uses prompt builders + OpenAI SDK client pointed to Inference.net.
- Response is schema-validated and trimmed to one generated request type.

## Logging Pattern

Both routes emit structured logs via `lib/logger.ts` with event names and status metadata for observability.
