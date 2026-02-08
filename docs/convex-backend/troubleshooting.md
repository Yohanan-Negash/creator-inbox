# Convex Backend Troubleshooting

## KPI mismatch after deploying projection changes

- **Symptom**: `getAdminMetrics` values look stale or inconsistent.
- **Cause**: Existing rows were built with previous delta logic.
- **Fix**: Run `submissions:backfillCreatorMetrics` once on target deployment.

## Answer mutation rejects pending submission

- **Symptom**: `Submission is not pending.` or `Response window has expired` errors.
- **Cause**: Submission status changed concurrently, or `createdAt` passed deadline.
- **Fix**: Re-query current submission state before retrying; do not bypass deadline guard.

## Projection row duplication

- **Symptom**: KPI totals unexpectedly inflate.
- **Cause**: More than one `creatorMetrics` row exists for same key.
- **Fix**: Use `applyCreatorMetricsDelta` path (it deduplicates); run backfill if corruption remains.

## Unauthorized errors in request type mutations

- **Symptom**: archive/update/delete throws unauthorized.
- **Cause**: `viewerUserId` differs from request type `creatorId`.
- **Fix**: Ensure correct user identity is passed from validated Whop access context.
