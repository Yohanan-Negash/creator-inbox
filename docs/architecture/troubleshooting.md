# Architecture Troubleshooting

## KPI cards show zero unexpectedly

- **Symptom**: Admin cards return zeros despite historical submissions.
- **Likely cause**: `creatorMetrics` row missing for creator/experience.
- **Fix**: Run Convex internal backfill (`backfillCreatorMetrics`) and verify `creatorMetrics` row exists.

## Admin/member page loads but access errors occur

- **Symptom**: UI displays unauthorized/no access despite valid URL.
- **Likely cause**: Whop token invalid/missing, app ID/API key misconfigured.
- **Fix**: Verify `WHOP_API_KEY` and `NEXT_PUBLIC_WHOP_APP_ID` (or `WHOP_APP_ID`) and test `/api/whop/user` route directly.

## Route renders but Convex provider crashes

- **Symptom**: Runtime error about missing Convex URL.
- **Likely cause**: `NEXT_PUBLIC_CONVEX_URL` and `NEXT_PUBLIC_CONVEX_URL_LOCAL` both unset.
- **Fix**: Set one of the Convex URL env vars and restart Next.js dev server.
