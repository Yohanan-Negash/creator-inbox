# Architecture Implementation Notes

## Layer Responsibilities

- **Next.js routes (`app/`)**
  - render member/admin pages
  - orchestrate client-side query/mutation calls
  - host HTTP handlers for external integrations
- **Convex functions (`convex/`)**
  - enforce business rules and authorization invariants
  - mutate durable state and update projection tables
- **Integration utilities (`lib/`)**
  - isolate Whop and Inference client setup and schema logic

## Major Design Decisions

1. **Projection-first KPI reads**
   - `getAdminMetrics` reads `creatorMetrics` instead of scanning `submissions`.
   - Write paths apply deltas synchronously in the same mutation.

2. **Route-level integration boundaries**
   - Whop token verification and access checks live in API routes.
   - AI generation route performs both input validation and access checks before inference calls.

3. **Experience-scoped surfaces**
   - Both member and admin pages are namespaced under `experiences/[experienceId]`.
   - URL param + access checks define visible data.

## Invariants to Preserve

- `submissions.status` and `submissions.paymentStatus` must transition consistently.
- `creatorMetrics` deltas must match submission transitions to avoid KPI drift.
- Unauthorized users must not be able to create/administer resources.
- Admin answer submissions only while pending and inside response window.

## Where to Extend Safely

- Add new KPI fields in `creatorMetrics` and update all write deltas + backfill logic together.
- Add new API routes under `app/api/*` and keep logging + zod validation patterns consistent.
- Add UI variants under `components/experiences/*` instead of expanding route files.
