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
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  if (status === "answered") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (status === "expired") {
    return "bg-zinc-100 text-zinc-700 border-zinc-200";
  }
  return "bg-red-50 text-red-700 border-red-200";
}
