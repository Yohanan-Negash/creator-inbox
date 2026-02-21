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

## Error banners show technical/internal messages

- **Symptom**: users see stack-like or provider-specific text in admin/member error states.
- **Cause**: UI reads raw thrown errors instead of showing fallback copy.
- **Fix**: always render simple user-facing text (`Please try again.` or `Please try again later.`) in UI state handlers, and keep technical detail in server logs only.

## Light/dark mode contrast regressions (white-on-white, low-contrast text)

- **Symptom**: some cards, tables, or dialogs are hard to read in light or dark mode.
- **Cause**: hardcoded color classes (`bg-white`, `text-zinc-*`, `border-zinc-*`, etc.) bypass theme tokens.
- **Fix**: replace hardcoded colors with semantic tokens and dark variants where needed (`bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`), and verify `ThemeProvider` in `app/layout.tsx` is using system mode.
