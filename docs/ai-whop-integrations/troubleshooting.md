# AI + Whop Integrations Troubleshooting

## `Unauthorized` from Whop user route

- **Symptom**: `/api/whop/user` returns 401.
- **Cause**: token verification failed (invalid dev token, missing headers, or bad app credentials).
- **Fix**: validate `WHOP_API_KEY`, `NEXT_PUBLIC_WHOP_APP_ID`/`WHOP_APP_ID`, and token source.

## `Only experience admins can generate request types`

- **Symptom**: AI generation route returns 403.
- **Cause**: user has access but not admin level, or lacks experience access.
- **Fix**: verify `checkAccess` response and test with admin identity.

## Inference route returns 500

- **Symptom**: generic internal server error from AI route.
- **Cause**: missing `INFERENCE_API_KEY`, model/provider errors, or schema mismatch.
- **Fix**: inspect structured logs (`inference.request_types.unhandled_error`) and validate inference env vars.

## Validation errors on AI request payload

- **Symptom**: route returns 400 with `fieldErrors`.
- **Cause**: request does not conform to route zod schema.
- **Fix**: update request body to match `GenerateRequestTypesRouteInputSchema` shape.

## UI shows technical error text from integration routes

- **Symptom**: users see internal provider/runtime language in error banners or dialogs.
- **Cause**: route returns raw exception messages or client uses thrown `Error.message` directly.
- **Fix**: return generic retry-oriented copy for `500` responses (for example, `Please try again later.`) and rely on structured server logs for technical diagnostics.
