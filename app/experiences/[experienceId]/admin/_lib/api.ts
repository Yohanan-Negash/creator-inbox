import type {
  AdminMetrics,
  AdminRequestType,
  AdminSubmission,
} from "@/lib/types/experiences/admin";

type ErrorPayload = { error?: string };

function getErrorMessage(payload: unknown, fallback: string) {
  const parsed = payload as ErrorPayload;
  return parsed?.error || fallback;
}

export async function fetchAdminData(
  origin: string,
  experienceId: string,
  devUserToken: string,
): Promise<{
  requestTypes: AdminRequestType[];
  dashboardSubmissions: AdminSubmission[];
  dashboardSubmissionsContinueCursor: string | null;
  dashboardSubmissionsIsDone: boolean;
  metrics: AdminMetrics | null;
}> {
  const url = new URL(`/api/whop/experiences/${encodeURIComponent(experienceId)}/admin-data`, origin);
  if (devUserToken) {
    url.searchParams.set("whop-dev-user-token", devUserToken);
  }

  const response = await fetch(url.toString());
  const payload = (await response.json()) as {
    requestTypes?: AdminRequestType[];
    dashboardSubmissions?: Array<AdminSubmission & { responseText?: string | null }>;
    dashboardSubmissionsContinueCursor?: string | null;
    dashboardSubmissionsIsDone?: boolean;
    metrics?: AdminMetrics;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, "Failed to load admin data."));
  }

  return {
    requestTypes: payload.requestTypes ?? [],
    dashboardSubmissions: (payload.dashboardSubmissions ?? []).map((item) => ({
      ...item,
      responseText: item.responseText ?? undefined,
    })),
    dashboardSubmissionsContinueCursor: payload.dashboardSubmissionsContinueCursor ?? null,
    dashboardSubmissionsIsDone: payload.dashboardSubmissionsIsDone ?? true,
    metrics: payload.metrics ?? null,
  };
}

export async function fetchAdminSubmissionsPage(
  origin: string,
  experienceId: string,
  devUserToken: string,
  cursor: string | null,
): Promise<{
  dashboardSubmissions: AdminSubmission[];
  dashboardSubmissionsContinueCursor: string | null;
  dashboardSubmissionsIsDone: boolean;
}> {
  const url = new URL(
    `/api/whop/experiences/${encodeURIComponent(experienceId)}/admin-submissions`,
    origin,
  );

  if (devUserToken) {
    url.searchParams.set("whop-dev-user-token", devUserToken);
  }

  if (cursor) {
    url.searchParams.set("cursor", cursor);
  }

  const response = await fetch(url.toString());
  const payload = (await response.json()) as {
    dashboardSubmissions?: Array<AdminSubmission & { responseText?: string | null }>;
    dashboardSubmissionsContinueCursor?: string | null;
    dashboardSubmissionsIsDone?: boolean;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, "Failed to load admin submissions."));
  }

  return {
    dashboardSubmissions: (payload.dashboardSubmissions ?? []).map((item) => ({
      ...item,
      responseText: item.responseText ?? undefined,
    })),
    dashboardSubmissionsContinueCursor: payload.dashboardSubmissionsContinueCursor ?? null,
    dashboardSubmissionsIsDone: payload.dashboardSubmissionsIsDone ?? true,
  };
}

export async function postRequestTypeAction(
  experienceId: string,
  body: Record<string, unknown>,
) {
  const response = await fetch(
    `/api/whop/experiences/${encodeURIComponent(experienceId)}/request-types/action`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  const payload = (await response.json()) as ErrorPayload;
  if (!response.ok) {
    throw new Error(getErrorMessage(payload, "Request action failed."));
  }
}

export async function postSubmissionAction(
  experienceId: string,
  body: Record<string, unknown>,
) {
  const response = await fetch(
    `/api/whop/experiences/${encodeURIComponent(experienceId)}/submissions/action`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  const payload = (await response.json()) as ErrorPayload;
  if (!response.ok) {
    throw new Error(getErrorMessage(payload, "Submission action failed."));
  }
}
