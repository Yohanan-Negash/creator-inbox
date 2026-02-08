# Frontend Implementation

## Member Components

- `components/experiences/member/member-header.tsx`
  - view toggle and admin navigation button
- `components/experiences/member/request-types-view.tsx`
  - request type listing and submit CTA
- `components/experiences/member/submissions-view.tsx`
  - submissions table, details card, pagination
- `components/experiences/member/submit-request-dialog.tsx`
  - submission form dialog and validation display

## Admin Components

- `components/experiences/admin/request-type-form-dialog.tsx`
  - create/edit dialog with AI generation action
- `components/experiences/admin/request-types-management.tsx`
  - request type rows, status toggle, delete confirmation, pagination
- `components/experiences/admin/metrics-submissions-section.tsx`
  - KPI cards + submissions table
- `components/experiences/admin/answer-submission-dialog.tsx`
  - read-only answered response viewer

## Shared Frontend Helpers

- `components/experiences/shared/formatters.ts`
  - `formatDateTime`
  - `getStatusPillClass`

## Route Responsibilities (Do Not Drift)

- Route files should continue owning:
  - Convex query/mutation calls
  - access/user bootstrap state
  - orchestration of selected IDs, pages, and dialog open states
- Feature components should remain presentational-first with explicit props.
