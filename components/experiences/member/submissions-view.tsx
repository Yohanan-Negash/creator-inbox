import { useMemo } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
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
import { Loader2 } from "lucide-react";
import { formatDateTime, getStatusPillClass } from "@/components/experiences/shared/formatters";

type SubmissionItem = {
  _id: Id<"submissions">;
  requestTypeLabel: string;
  status: "pending" | "answered" | "expired" | "refunded";
  createdAt: number;
  amountUsd: number;
  submissionText: string;
  responseText?: string;
};

type SubmissionsViewProps = {
  username?: string;
  name?: string | null;
  submissions: SubmissionItem[] | undefined;
  pagedSubmissions: SubmissionItem[];
  selectedSubmissionId: Id<"submissions"> | null;
  selectedSubmission: SubmissionItem | null;
  readSubmissionIds: string[];
  unreadAnsweredCount: number;
  submissionsPage: number;
  totalSubmissionPages: number;
  submissionsPageSize: number;
  onOpenSubmissionDetails: (submissionId: Id<"submissions">) => void;
  onSetSubmissionsPage: (next: number) => void;
};

export function SubmissionsView({
  username,
  name,
  submissions,
  pagedSubmissions,
  selectedSubmissionId,
  selectedSubmission,
  readSubmissionIds,
  unreadAnsweredCount,
  submissionsPage,
  totalSubmissionPages,
  submissionsPageSize,
  onOpenSubmissionDetails,
  onSetSubmissionsPage,
}: SubmissionsViewProps) {
  const readSubmissionIdSet = useMemo(() => new Set(readSubmissionIds), [readSubmissionIds]);

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
            <span className="rounded-none border border-zinc-200 px-2 py-1 text-zinc-600">
              {submissions?.length ?? 0} total
            </span>
            <span className="rounded-none border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700">
              {unreadAnsweredCount} unread responses
            </span>
          </div>
        </CardContent>
      </Card>

      {submissions === undefined ? (
        <div className="flex min-h-[25vh] items-center justify-center p-6">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="text-sm text-zinc-500">Loading submissions...</p>
          </div>
        </div>
      ) : null}

      {submissions !== undefined && submissions.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No submissions yet</CardTitle>
            <CardDescription>
              Submit a request from the requests tab to get started.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {submissions && submissions.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="grid gap-3 lg:hidden">
            {pagedSubmissions.map((submission) => {
              const rowId = String(submission._id);
              const isUnread =
                submission.status === "answered" &&
                Boolean(submission.responseText) &&
                !readSubmissionIdSet.has(rowId);
              const isSelected = selectedSubmissionId === submission._id;

              return (
                <button
                  key={rowId}
                  type="button"
                  onClick={() => onOpenSubmissionDetails(submission._id)}
                  className={`grid gap-2 border p-3 text-left transition-colors ${
                    isSelected ? "border-primary/40 bg-primary/5" : "border-zinc-200"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-zinc-900">{submission.requestTypeLabel}</p>
                    {isUnread ? (
                      <span className="rounded-none border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-700">
                        Unread
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600">
                    <span
                      className={`inline-flex rounded-none border px-2 py-0.5 text-[11px] ${getStatusPillClass(submission.status)}`}
                    >
                      {submission.status}
                    </span>
                    <span>{formatDateTime(submission.createdAt)}</span>
                    <span className="font-medium text-zinc-900">${submission.amountUsd.toFixed(2)}</span>
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
                  {pagedSubmissions.map((submission) => {
                    const rowId = String(submission._id);
                    const isUnread =
                      submission.status === "answered" &&
                      Boolean(submission.responseText) &&
                      !readSubmissionIdSet.has(rowId);
                    return (
                      <TableRow
                        key={rowId}
                        className={`cursor-pointer ${
                          selectedSubmissionId === submission._id ? "bg-muted/50" : ""
                        } ${isUnread ? "font-medium" : ""}`}
                        onClick={() => onOpenSubmissionDetails(submission._id)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="line-clamp-1">{submission.requestTypeLabel}</span>
                            {isUnread ? (
                              <span className="rounded-none border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-700">
                                Unread
                              </span>
                            ) : null}
                          </div>
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
                    <p className="text-[11px] uppercase tracking-wide text-zinc-500">My request</p>
                    <p className="text-xs text-zinc-700 whitespace-pre-wrap">
                      {selectedSubmission.submissionText}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                      Creator response
                    </p>
                    {selectedSubmission.responseText ? (
                      <p className="text-xs text-zinc-700 whitespace-pre-wrap">
                        {selectedSubmission.responseText}
                      </p>
                    ) : (
                      <p className="text-xs text-zinc-500">Awaiting creator response.</p>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-xs text-zinc-500">No submission selected.</p>
              )}
            </CardContent>
          </Card>

          {submissions.length > submissionsPageSize ? (
            <Pagination className="lg:col-span-2">
              <PaginationContent className="flex-wrap justify-center">
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      onSetSubmissionsPage(Math.max(1, submissionsPage - 1));
                    }}
                    className={submissionsPage <= 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                {Array.from({ length: totalSubmissionPages }, (_, index) => {
                  const pageNumber = index + 1;
                  return (
                    <PaginationItem key={pageNumber}>
                      <PaginationLink
                        href="#"
                        isActive={pageNumber === submissionsPage}
                        onClick={(event) => {
                          event.preventDefault();
                          onSetSubmissionsPage(pageNumber);
                        }}
                      >
                        {pageNumber}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      onSetSubmissionsPage(Math.min(totalSubmissionPages, submissionsPage + 1));
                    }}
                    className={
                      submissionsPage >= totalSubmissionPages ? "pointer-events-none opacity-50" : ""
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
