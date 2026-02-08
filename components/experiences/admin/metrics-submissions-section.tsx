import type { Id } from "@/convex/_generated/dataModel";
import { Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { formatDateTime, getStatusPillClass } from "@/components/experiences/shared/formatters";

type Metrics = {
  totalSubmissions: number;
  totalPending: number;
  totalAnswered: number;
  moneyEarned: number;
  moneyAvailable: number;
} | null;

type DashboardSubmission = {
  _id: Id<"submissions">;
  userName: string;
  requestTypeLabel: string;
  status: "pending" | "answered" | "expired" | "refunded";
  createdAt: number;
  deadlineAt: number;
  isWithinResponseWindow: boolean;
  amountUsd: number;
};

type MetricsSubmissionsSectionProps = {
  metrics: Metrics | undefined;
  dashboardSubmissions: DashboardSubmission[] | undefined;
  pagedSubmissions: DashboardSubmission[];
  submissionsPageSize: number;
  submissionsPage: number;
  totalSubmissionPages: number;
  onOpenAnswerDialog: (submissionId: Id<"submissions">) => void;
  onSetSubmissionsPage: (page: number) => void;
};

export function MetricsSubmissionsSection({
  metrics,
  dashboardSubmissions,
  pagedSubmissions,
  submissionsPageSize,
  submissionsPage,
  totalSubmissionPages,
  onOpenAnswerDialog,
  onSetSubmissionsPage,
}: MetricsSubmissionsSectionProps) {
  return (
    <section className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader>
            <CardDescription>Total Submissions</CardDescription>
            <CardTitle>{metrics?.totalSubmissions ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total Pending</CardDescription>
            <CardTitle>{metrics?.totalPending ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total Answered</CardDescription>
            <CardTitle>{metrics?.totalAnswered ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Money Earned</CardDescription>
            <CardTitle className="text-primary">${(metrics?.moneyEarned ?? 0).toFixed(2)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Money Available</CardDescription>
            <CardTitle className="text-amber-600">
              ${(metrics?.moneyAvailable ?? 0).toFixed(2)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submissions</CardTitle>
          <CardDescription>Click an answered submission row to view the response.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {dashboardSubmissions === undefined ? (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Loader2 className="size-4 animate-spin" />
              Loading submissions...
            </div>
          ) : null}

          {dashboardSubmissions !== undefined && dashboardSubmissions.length === 0 ? (
            <p className="text-xs text-zinc-500">No submissions yet.</p>
          ) : null}

          {pagedSubmissions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Request Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedSubmissions.map((submission) => {
                  const canOpenResponse = submission.status === "answered";
                  return (
                    <TableRow
                      key={String(submission._id)}
                      className={canOpenResponse ? "cursor-pointer" : ""}
                      onClick={() => {
                        if (!canOpenResponse) {
                          return;
                        }
                        onOpenAnswerDialog(submission._id);
                      }}
                    >
                      <TableCell>{submission.userName}</TableCell>
                      <TableCell>{submission.requestTypeLabel}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-none border px-2 py-0.5 text-[11px] ${getStatusPillClass(submission.status)}`}
                        >
                          {submission.status}
                        </span>
                      </TableCell>
                      <TableCell>{formatDateTime(submission.createdAt)}</TableCell>
                      <TableCell>
                        {submission.status === "pending" && !submission.isWithinResponseWindow ? (
                          <span className="text-red-600">Expired window</span>
                        ) : (
                          formatDateTime(submission.deadlineAt)
                        )}
                      </TableCell>
                      <TableCell className="text-right">${submission.amountUsd.toFixed(2)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : null}

          {dashboardSubmissions && dashboardSubmissions.length > submissionsPageSize ? (
            <Pagination>
              <PaginationContent>
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
        </CardContent>
      </Card>
    </section>
  );
}
