# Convex Backend Overview

## Data Model

- `requestTypes`
  - creator offers for paid requests
  - active/archived and soft-delete behavior
- `submissions`
  - member submissions and creator responses
  - tracks status (`pending`, `answered`, `expired`, `refunded`) and payment status
- `creatorMetrics`
  - denormalized KPI projection used for admin cards
  - keyed by `creatorId + experienceId`

## Domain Boundaries

- `convex/requestTypes.ts`
  - list, create, update, archive/unarchive, soft delete
- `convex/submissions.ts`
  - create submission, answer submission, admin/member listing queries
  - KPI projection query (`getAdminMetrics`)
  - projection maintenance internal mutation (`backfillCreatorMetrics`)

## Projection Strategy

KPI reads are projection-backed for speed. Write-path mutations update `creatorMetrics` synchronously so admin cards do not scan all submissions on every render.

Current semantics:

- `moneyEarned`: sum of answered submissions
- `moneyAvailable`: sum of pending submissions (time-based expiry filtering to be handled separately)
