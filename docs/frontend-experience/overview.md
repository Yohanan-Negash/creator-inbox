# Frontend Experience Overview

The frontend is organized around two route surfaces per experience: member and admin. Each route owns local view state, while larger JSX blocks are extracted into focused components for better maintenance.

## Member Surface

- Route: `app/experiences/[experienceId]/page.tsx`
- Primary capabilities:
  - view active request types
  - submit paid request text (submission is created only after Whop payment confirmation)
  - view personal submissions and creator responses
- Uses localStorage to persist read/unread response state by experience/user key.

## Marketing Surface

- Route: `app/page.tsx`
- Primary capabilities:
  - communicate Creator Inbox value proposition and product flow
  - present branded one-page sections with Three.js-powered visuals
  - hold launch CTA state before public app entry goes live

## Admin Surface

- Route: `app/experiences/[experienceId]/admin/page.tsx`
- Primary capabilities:
  - create/edit/archive/delete request types
  - view submission table and metrics cards
  - view answered submission responses
  - refund expired pending submissions from the submissions table
  - submission deletion is intentionally disabled to preserve payout metrics and cashout balances

## Componentization Pattern

Routes keep data-fetching and mutations, while visual sections are extracted under:

- `components/experiences/member/`
- `components/experiences/admin/`
- `components/experiences/shared/`

This pattern keeps interaction logic discoverable while avoiding 500+ line route files.
