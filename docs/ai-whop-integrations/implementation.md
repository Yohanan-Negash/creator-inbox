# AI + Whop Integrations Implementation

## `/api/whop/user` Route Behavior

1. Read `experienceId` and optional `whop-dev-user-token` from request.
2. Verify user token with Whop SDK (`verifyUserToken`).
3. Fetch user profile.
4. If `experienceId` exists, run `checkAccess` and return access metadata.
5. Log success/failure with structured event payloads.

## `/api/inference/request-types` Route Behavior

1. Parse JSON body and validate via `GenerateRequestTypesRouteInputSchema`.
2. Verify Whop token from dev token or request headers.
3. Enforce admin access for the experience.
4. Build prompt context from existing request type titles.
5. Call `generateRequestTypes` and return the top suggestion.

## Environment Requirements

- `WHOP_API_KEY`
- `NEXT_PUBLIC_WHOP_APP_ID` or `WHOP_APP_ID`
- `INFERENCE_API_KEY`
- Optional `INFERENCE_MODEL`

## Contract Guidance

- Keep route-level validation strict to prevent malformed prompts and bad downstream calls.
- Preserve 401/403 distinctions for easier auth debugging.
- Prefer adding new fields to zod schemas and parse outputs before use.
