import type { WhopResponse } from "@/lib/types/experiences/common";
import type { MemberRequestType, MemberSubmission } from "@/lib/types/experiences/member";
import type { AdminMetrics, AdminRequestType, AdminSubmission } from "@/lib/types/experiences/admin";

export type MemberBootstrapData = {
  user?: WhopResponse["user"];
  access?: WhopResponse["access"];
  requestTypes?: MemberRequestType[];
  submissions?: Array<MemberSubmission & { responseText?: string | null }>;
  submissionsContinueCursor?: string | null;
  submissionsIsDone?: boolean;
  error?: string;
};

export type AdminBootstrapData = {
  user?: WhopResponse["user"];
  access?: WhopResponse["access"];
  requestTypes?: AdminRequestType[];
  dashboardSubmissions?: Array<AdminSubmission & { responseText?: string | null }>;
  dashboardSubmissionsContinueCursor?: string | null;
  dashboardSubmissionsIsDone?: boolean;
  metrics?: AdminMetrics | null;
  error?: string;
};
