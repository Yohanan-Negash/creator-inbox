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

## PR cannot merge to `dev` due to label policy

- **Symptom**: PR checks fail with release label validation.
- **Cause**: missing primary label, or multiple primary labels were added.
- **Fix**: keep exactly one of `feat`, `fix`, `enhancement`, `chore`, `docs`. Add `breaking` only as an optional override label.

## No version PR appears after merging to `main`

- **Symptom**: release workflow runs but no `chore: version packages` PR is created.
- **Cause**: there were no pending `.changeset/*.md` files in the merged `main` history.
- **Fix**: verify merged feature PRs into `dev` had valid labels and confirm the auto-generated changeset commits were included in `dev -> main`.

## Version PR merged but no GitHub release created

- **Symptom**: version bump commit exists on `main`, but no new repository release is visible.
- **Cause**: release creation failed in CI (commonly token permission or malformed changelog section).
- **Fix**: inspect `Release` workflow logs, ensure `contents: write` permission is present, and rerun the workflow after fixing the root cause.
