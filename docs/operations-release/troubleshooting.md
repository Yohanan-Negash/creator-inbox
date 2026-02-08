# Operations + Release Troubleshooting

## KPI values wrong after deploy

- **Symptom**: admin cards do not match expected totals.
- **Cause**: projection row data still reflects old logic.
- **Fix**: run `submissions:backfillCreatorMetrics` on target deployment.

## Convex function errors after schema change

- **Symptom**: mutations/queries fail immediately after release.
- **Cause**: schema/functions not deployed in matching state.
- **Fix**: re-run `pnpm convex:deploy` and verify latest schema/function bundle is active.

## Unit tests green locally but regressions in runtime

- **Symptom**: behavior mismatch despite passing tests.
- **Cause**: integration/env/runtime differences not covered by unit tests.
- **Fix**: run targeted manual smoke tests for Whop access and inference routes before merge to `main`.
