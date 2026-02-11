# Frontend Implementation

## Member Components

- `app/experiences/[experienceId]/experience-page-client.tsx`
  - client-side interaction layer for submission flow, pagination, and checkout polling
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
- `components/experiences/shared/page-loading-state.tsx`
  - reusable route transition loading spinner UI

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
  - both payloads include `user` + `access` plus page data to avoid client-side waterfall fetches.
- Client page components should continue owning:
  - orchestration of selected IDs, pages, dialog open states, and mutation-side refreshes
- Feature components should remain presentational-first with explicit props.
