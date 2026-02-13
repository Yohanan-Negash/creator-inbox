---
name: User-Facing Error Sanitization Audit
description: Verify user-facing errors are simple while server logs keep technical detail
triggers: [api error handling changes, ui error state changes, integration route updates]
last_updated: 2026-02-13
---

# User-Facing Error Sanitization Audit

## Overview

Use this SOP when adding or changing frontend error states and API route catch paths. The goal is to prevent technical/internal errors from appearing in the UI while preserving enough server-side logs for debugging.

## Prerequisites

- [ ] Local repo is up to date
- [ ] You can run tests with `pnpm test --run`

## Procedure

### Step 1: Audit UI error rendering

1. Search frontend files for raw error usage (`error.message`, helper functions that return raw thrown messages).
2. Replace user-facing state copy with simple retry-oriented text where needed.
3. Keep validation copy specific only when it is user-actionable.

### Step 2: Audit API `500` responses

1. Search `app/api/**/route.ts` for `getSafeErrorMessage(error)` or internal error strings in `NextResponse.json` payloads.
2. For unexpected failures, return generic copy such as `Please try again later.`.
3. Keep `400/401/403` messages actionable and non-sensitive.

### Step 3: Verify structured server logging

1. Confirm each route `catch (error)` uses `logger.error(...)`.
2. Ensure logs include route context (`route`, `method`, `event`, `status`) and `errorMessage: getSafeErrorMessage(error)`.
3. Add targeted logging at known failure hotspots (provider calls, idempotent finalize paths) if missing.

### Step 4: Validate behavior

1. Run `pnpm test --run`.
2. Manually trigger at least one failure path in member/admin UI (or mock route tests) and confirm:
   - UI shows simple retry-oriented copy.
   - Server logs contain technical diagnostics.

## Verification

- No user-facing UI component displays raw thrown exception text for unexpected failures.
- API `500` payloads are generic and consistent.
- Server logs include enough context to debug failures.

## Troubleshooting

- If users still see technical text, check frontend helper functions that map thrown errors to UI state.
- If logs are insufficient, add missing structured fields (`event`, identifiers like `experienceId`, and `errorMessage`).
- If route tests fail after copy changes, update assertions that depended on prior internal error strings.

## Related Documentation

- `docs/ai-whop-integrations/implementation.md`
- `docs/ai-whop-integrations/troubleshooting.md`
- `docs/frontend-experience/troubleshooting.md`
