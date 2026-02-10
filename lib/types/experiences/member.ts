import type { Id } from "@/convex/_generated/dataModel";

export type HomeView = "request-types" | "submissions";

export type MemberRequestType = {
  _id: Id<"requestTypes">;
  title: string;
  description: string;
  price: number;
  responseWindowHours: number;
};

export type MemberSubmission = {
  _id: Id<"submissions">;
  requestTypeLabel: string;
  status: "pending" | "answered" | "expired" | "refunded";
  createdAt: number;
  amountUsd: number;
  submissionText: string;
  responseText?: string;
};
