import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "reconcile-stale-pending-payments",
  { minutes: 5 },
  internal.paymentsReconcile.reconcileStalePendingPaymentAttempts,
  {
    olderThanMs: 5 * 60 * 1000,
    limit: 50,
    maxListScan: 1000,
  },
);

export default crons;
