import type { Id } from "@/convex/_generated/dataModel";
import { Download, Loader2, Paperclip } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime, getStatusPillClass } from "@/components/experiences/shared/formatters";

type SubmissionItem = {
  _id: Id<"submissions">;
  requestTypeLabel: string;
  status: "pending" | "answered" | "expired" | "refunded";
  createdAt: number;
  amountUsd: number;
  submissionText: string;
  attachment?: {
    fileName: string;
    contentType: string;
    sizeBytes: number;
    downloadUrl: string | null;
  } | null;
  responseText?: string;
};

type SubmissionsViewProps = {
  experienceId: string;
  devUserToken: string;
  username?: string;
  name?: string | null;
  isLoading: boolean;
  submissions: SubmissionItem[] | undefined;
  selectedSubmissionId: Id<"submissions"> | null;
  selectedSubmission: SubmissionItem | null;
  submissionsPage: number;
  submissionsPagePending: boolean;
  submissionsPageError: string | null;
  hasPreviousSubmissionsPage: boolean;
  hasNextSubmissionsPage: boolean;
  onOpenSubmissionDetails: (submissionId: Id<"submissions">) => void;
  onGoToPreviousSubmissionsPage: () => void;
  onGoToNextSubmissionsPage: () => void;
};

export function SubmissionsView({
  experienceId,
  devUserToken,
  username,
  name,
  isLoading,
  submissions,
  selectedSubmissionId,
  selectedSubmission,
  submissionsPage,
  submissionsPagePending,
  submissionsPageError,
  hasPreviousSubmissionsPage,
  hasNextSubmissionsPage,
  onOpenSubmissionDetails,
  onGoToPreviousSubmissionsPage,
  onGoToNextSubmissionsPage,
}: SubmissionsViewProps) {
  const getAttachmentDownloadHref = (submissionId: string) => {
    const path = `/api/whop/experiences/${encodeURIComponent(experienceId)}/submissions/${encodeURIComponent(
      submissionId,
    )}/attachment/download`;
    if (!devUserToken) {
      return path;
    }
    return `${path}?whop-dev-user-token=${encodeURIComponent(devUserToken)}`;
  };

  if (isLoading || submissions === undefined) {
    return (
      <section className="grid gap-3">
        <div className="flex min-h-[25vh] items-center justify-center p-6">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading submissions...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-3">
      <Card>
        <CardHeader>
          <CardTitle>My submissions</CardTitle>
          <CardDescription>
            Signed in as {username ?? "member"}
            {name ? ` (${name})` : ""}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-none border border-border px-2 py-1 text-muted-foreground">
              {submissions?.length ?? 0} on this page
            </span>
          </div>
        </CardContent>
      </Card>

      {submissions.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No submissions yet</CardTitle>
            <CardDescription>
              Submit a request from the requests tab to get started.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {submissions.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="grid gap-3 lg:hidden">
            {submissions.map((submission) => {
              const rowId = String(submission._id);
              const isSelected = selectedSubmissionId === submission._id;

              return (
                <button
                  key={rowId}
                  type="button"
                  onClick={() => onOpenSubmissionDetails(submission._id)}
                  className={`grid gap-2 border p-3 text-left transition-colors ${
                    isSelected ? "border-primary/40 bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{submission.requestTypeLabel}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span
                      className={`inline-flex rounded-none border px-2 py-0.5 text-[11px] ${getStatusPillClass(submission.status)}`}
                    >
                      {submission.status}
                    </span>
                    <span>{formatDateTime(submission.createdAt)}</span>
                    <span className="font-medium text-foreground">${submission.amountUsd.toFixed(2)}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <Card className="hidden lg:block">
            <CardContent className="pt-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((submission) => {
                    const rowId = String(submission._id);
                    return (
                      <TableRow
                        key={rowId}
                        className={`cursor-pointer ${
                          selectedSubmissionId === submission._id ? "bg-muted/50" : ""
                        }`}
                        onClick={() => onOpenSubmissionDetails(submission._id)}
                      >
                        <TableCell>
                          <span className="line-clamp-1">{submission.requestTypeLabel}</span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex rounded-none border px-2 py-0.5 text-[11px] ${getStatusPillClass(submission.status)}`}
                          >
                            {submission.status}
                          </span>
                        </TableCell>
                        <TableCell>{formatDateTime(submission.createdAt)}</TableCell>
                        <TableCell className="text-right">${submission.amountUsd.toFixed(2)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{selectedSubmission?.requestTypeLabel ?? "Submission details"}</CardTitle>
              <CardDescription>
                {selectedSubmission
                  ? `Submitted ${formatDateTime(selectedSubmission.createdAt)}`
                  : "Select a submission to view details."}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {selectedSubmission ? (
                <>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">My request</p>
                    <p className="text-xs text-foreground whitespace-pre-wrap">
                      {selectedSubmission.submissionText}
                    </p>
                    {selectedSubmission.attachment ? (
                      <div className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Paperclip className="size-3" />
                        {selectedSubmission.attachment.downloadUrl ? (
                          <a
                            href={getAttachmentDownloadHref(String(selectedSubmission._id))}
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            {selectedSubmission.attachment.fileName}
                            <Download className="size-3" />
                          </a>
                        ) : (
                          <span>{selectedSubmission.attachment.fileName}</span>
                        )}
                      </div>
                    ) : null}
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Creator response
                    </p>
                    {selectedSubmission.responseText ? (
                      <p className="text-xs text-foreground whitespace-pre-wrap">
                        {selectedSubmission.responseText}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Awaiting creator response.</p>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">No submission selected.</p>
              )}
            </CardContent>
          </Card>

          {(hasPreviousSubmissionsPage || hasNextSubmissionsPage) ? (
            <Pagination className="lg:col-span-2">
              <PaginationContent className="flex-wrap justify-center">
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      onGoToPreviousSubmissionsPage();
                    }}
                    className={
                      !hasPreviousSubmissionsPage || submissionsPagePending
                        ? "pointer-events-none opacity-50"
                        : ""
                    }
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="px-3 py-2 text-xs text-muted-foreground">
                    {submissionsPagePending ? "Loading page..." : `Page ${submissionsPage}`}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      onGoToNextSubmissionsPage();
                    }}
                    className={
                      !hasNextSubmissionsPage || submissionsPagePending
                        ? "pointer-events-none opacity-50"
                        : ""
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          ) : null}

          {submissionsPageError ? (
            <p className="text-xs text-destructive lg:col-span-2">{submissionsPageError}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
