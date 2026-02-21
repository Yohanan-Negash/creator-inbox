export type SubmissionStatus = "pending" | "answered" | "expired" | "refunded";

export function formatDateTime(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function getStatusPillClass(status: SubmissionStatus) {
  if (status === "pending") {
    return "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-400/40 dark:bg-amber-500/20 dark:text-amber-200";
  }
  if (status === "answered") {
    return "border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-400/40 dark:bg-emerald-500/20 dark:text-emerald-200";
  }
  if (status === "expired") {
    return "border-border bg-muted text-foreground/80";
  }
  return "border-red-300 bg-red-100 text-red-900 dark:border-red-400/40 dark:bg-red-500/20 dark:text-red-200";
}
