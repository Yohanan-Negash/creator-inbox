import type { Id } from "@/convex/_generated/dataModel";

export type RequestTypeFormValues = {
  title: string;
  description: string;
  price: string;
  responseWindowHours: string;
  allowAttachments: boolean;
};

export type RequestTypeFieldErrors = Partial<Record<keyof RequestTypeFormValues, string>>;

export type GenerateRequestTypesResponse = {
  rejected: boolean;
  rejectionReason: string;
  requestTypes: Array<{
    title: string;
    description: string;
    price: number;
    responseWindowHours: number;
  }>;
  error?: string;
};

export type AdminRequestType = {
  _id: Id<"requestTypes">;
  title: string;
  description: string;
  price: number;
  responseWindowHours: number;
  allowAttachments: boolean;
  isActive: boolean;
};

type SubmissionAttachment = {
  fileName: string;
  contentType: string;
  sizeBytes: number;
  downloadUrl: string | null;
};

export type AdminSubmission = {
  _id: Id<"submissions">;
  status: "pending" | "answered" | "expired" | "refunded";
  userName: string;
  requestTypeLabel: string;
  submissionText: string;
  responseText?: string;
  amountUsd: number;
  attachment?: SubmissionAttachment | null;
  createdAt: number;
  deadlineAt: number;
  isWithinResponseWindow: boolean;
};

export type AdminMetrics = {
  totalSubmissions: number;
  totalPending: number;
  totalAnswered: number;
  moneyEarned: number;
  balanceAvailable?: number;
  moneyAvailable: number;
};

export type AdminView = "request-types" | "metrics";
