# Frontend Troubleshooting

## Dialog opens but submit action should not happen

- **Symptom**: Dialog appears for rows that should be read-only or non-interactive.
- **Cause**: Row click predicate mismatches current status behavior.
- **Fix**: Align row click gating with product rules in `metrics-submissions-section.tsx` and route handler guards.

## Validation messages differ between form and backend

- **Symptom**: UI allows a value but mutation rejects it.
- **Cause**: Frontend zod schema and backend validation constants diverged.
- **Fix**: Keep min/max constants and error strings aligned across route and Convex mutation.

## Read/unread states reset unexpectedly

- **Symptom**: previously read answered submissions show as unread after refresh.
- **Cause**: localStorage key changed (experience/user mismatch) or parse failure.
- **Fix**: preserve storage key shape `submission-reads:<experienceId>:<viewerUserId>` and maintain JSON array parsing guards.
