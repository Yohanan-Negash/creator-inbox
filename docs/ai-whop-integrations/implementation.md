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

## Payment Routes

### `/api/whop/payments/create-submission-payment`

1. Validates payload (`experienceId`, `requestTypeId`, `submissionText`).
2. Verifies Whop user token and experience access.
3. Reads request-type quote from Convex.
4. Resolves Whop company and product context from `experiences.retrieve`.
5. Creates a Whop checkout link (`checkoutConfigurations.create`) for a one-time USD charge.
6. Stores pending submission payment context in Convex keyed by checkout configuration id.
7. Returns `purchaseUrl` so frontend redirects user to hosted checkout.

### `/api/whop/payments/submission-status`

1. Verifies token + access for the experience.
2. Reads user-scoped payment row from Convex.
3. Reconciles with Whop `payments.retrieve` and finalizes or fails if terminal.
4. Returns submission creation status for client polling.

### `/api/whop/payments/webhook`

1. Accepts Whop payment webhook payloads (optionally guarded by `WHOP_WEBHOOK_SECRET`).
2. Resolves payment id from payload.
3. Retrieves canonical payment status from Whop.
4. Maps `paymentId` back to pending checkout context using metadata checkout configuration id.
5. Finalizes pending submission or marks payment failed idempotently.

### `/api/whop/payments/refund-submission`

1. Verifies admin access for the experience.
2. Loads refund context from Convex.
3. Calls Whop `payments.refund` when a provider payment exists.
4. Marks submission/payment as refunded in Convex.

## Environment Requirements

- `WHOP_API_KEY`
- `NEXT_PUBLIC_WHOP_APP_ID` or `WHOP_APP_ID`
- `WHOP_COMPANY_ID` (required for payment creation fallback)
- `INFERENCE_API_KEY`
- Optional `INFERENCE_MODEL`
- Optional `WHOP_WEBHOOK_SECRET` (recommended for webhook hardening)

## Contract Guidance

- Keep route-level validation strict to prevent malformed prompts and bad downstream calls.
- Preserve 401/403 distinctions for easier auth debugging.
- Prefer adding new fields to zod schemas and parse outputs before use.
