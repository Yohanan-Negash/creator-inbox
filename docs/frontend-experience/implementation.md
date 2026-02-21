# Frontend Implementation

## Member Components

- `app/experiences/[experienceId]/experience-page-client.tsx`
  - client-side interaction layer for submission flow, pagination, free-submit handling, and webhook-first checkout confirmation by immutable payment `attemptId`
- `components/experiences/member/member-header.tsx`
  - view toggle and admin navigation button
- `components/experiences/member/request-types-view.tsx`
  - request type listing and submit CTA
- `components/experiences/member/submissions-view.tsx`
  - submissions table, details card, pagination
- `components/experiences/member/submit-request-dialog.tsx`
  - submission form dialog and validation display

## Admin Components

- `app/experiences/[experienceId]/admin/admin-page-client.tsx`
  - client-side interaction layer for request-type CRUD, AI generation, and submission actions
- `components/experiences/admin/request-type-form-dialog.tsx`
  - create/edit dialog with AI generation action and quick "Make this free" price helper
- `components/experiences/admin/request-types-management.tsx`
  - request type rows, status toggle, delete confirmation, pagination
- `components/experiences/admin/metrics-submissions-section.tsx`
  - KPI cards + submissions table
  - cashout confirmation with fee breakdown (10% app fee, 90% creator payout)
  - explicit note that payment processing fees are included in app fee (no extra deduction)
- `components/experiences/admin/answer-submission-dialog.tsx`
  - read-only answered response viewer

## Shared Frontend Helpers

- `components/experiences/shared/formatters.ts`
  - `formatDateTime`
  - `getStatusPillClass`
- `components/experiences/shared/page-loading-state.tsx`
  - reusable route transition loading spinner UI

## Theme Inheritance (Light/Dark)

- Root layout wraps app content with `next-themes` via `components/theme-provider.tsx`.
- `ThemeProvider` is configured with `attribute="class"`, `defaultTheme="system"`, `enableSystem`.
- `<html>` in `app/layout.tsx` must keep `suppressHydrationWarning` to avoid class mismatch warnings.
- Experience/admin/member surfaces should use semantic Tailwind tokens (`bg-background`, `text-foreground`, `border-border`, `text-muted-foreground`) instead of hardcoded `zinc` or `white` classes.
- Embedded Whop checkout in `submit-request-dialog.tsx` uses `theme="system"` so checkout follows user preference.
- Theme controls are rendered in both member/admin headers through `components/experiences/shared/theme-toggle.tsx` as a single cycling control (System -> Light -> Dark) with active theme icon/label.

## Route Responsibilities (Do Not Drift)

- Route files should continue owning:
  - access/user bootstrap state and initial data loading
  - redirect rules for access-level gating
- Route segments expose navigation loading boundaries:
  - `app/experiences/[experienceId]/loading.tsx`
  - `app/experiences/[experienceId]/admin/loading.tsx`
- Member and admin route pages load in a single bootstrap fetch each:
  - first render calls shared server loaders in `lib/experiences/bootstrap-data.ts`
  - route handlers reuse the same loader functions for client-side refreshes
  - bootstrap payloads include `user` + `access` plus first-page data.
- Admin submissions pagination is server-driven:
  - first page loads from `admin-data` bootstrap payload
  - next/previous pages load via `/api/whop/experiences/[experienceId]/admin-submissions`
  - cursor state is owned in `admin-page-client.tsx` and rendered by `metrics-submissions-section.tsx`
- Member submissions pagination is server-driven:
  - first page loads from `member-data` bootstrap payload
  - next/previous pages load via `/api/whop/experiences/[experienceId]/member-submissions`
  - cursor state is owned in `experience-page-client.tsx` and rendered by `submissions-view.tsx`
- Client page components should continue owning:
  - orchestration of selected IDs, pages, dialog open states, and mutation-side refreshes
- Feature components should remain presentational-first with explicit props.
