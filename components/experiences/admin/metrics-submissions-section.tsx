import type { Id } from "@/convex/_generated/dataModel";
import { Loader2, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Button } from "@/components/ui/button";
import { formatDateTime, getStatusPillClass } from "@/components/experiences/shared/formatters";
import { APP_FEE_PERCENT, CREATOR_PAYOUT_PERCENT, calculateCashoutBreakdown } from "@/lib/cashout";

type Metrics = {
  totalSubmissions: number;
  totalPending: number;
  totalAnswered: number;
  moneyEarned: number;
  balanceAvailable?: number;
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
  onRefundSubmission: (submissionId: Id<"submissions">) => void;
  onSetSubmissionDeleteConfirmId: (submissionId: Id<"submissions"> | null) => void;
  onConfirmDeleteSubmission: () => void;
  onConfirmCashout: () => void;
  cashoutConfirmOpen: boolean;
  onSetCashoutConfirmOpen: (open: boolean) => void;
  cashoutPending: boolean;
  refundPendingId: Id<"submissions"> | null;
  deletePendingId: Id<"submissions"> | null;
  submissionDeleteConfirmId: Id<"submissions"> | null;
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
  onRefundSubmission,
  onSetSubmissionDeleteConfirmId,
  onConfirmDeleteSubmission,
  onConfirmCashout,
  cashoutConfirmOpen,
  onSetCashoutConfirmOpen,
  cashoutPending,
  refundPendingId,
  deletePendingId,
  submissionDeleteConfirmId,
  onSetSubmissionsPage,
}: MetricsSubmissionsSectionProps) {
  const balanceAvailable = metrics?.balanceAvailable ?? metrics?.moneyEarned ?? 0;
  const cashoutBreakdown = calculateCashoutBreakdown(balanceAvailable);

  return (
    <section className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader>
            <CardDescription>Total Requests</CardDescription>
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
            <CardDescription>Balance Available</CardDescription>
            <CardTitle className="text-primary">${balanceAvailable.toFixed(2)}</CardTitle>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full"
              disabled={cashoutPending || balanceAvailable <= 0}
              onClick={() => onSetCashoutConfirmOpen(true)}
            >
              {cashoutPending ? "Cashing out..." : "Cash out"}
            </Button>
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
          <CardDescription>
            Click a pending row to answer it, or an answered row to view its response.
          </CardDescription>
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
            <>
              <div className="grid gap-2 md:hidden">
                {pagedSubmissions.map((submission) => {
                  const canOpenResponse =
                    submission.status === "answered" ||
                    (submission.status === "pending" && submission.isWithinResponseWindow);
                  const canRefundSubmission =
                    submission.status === "pending" &&
                    !submission.isWithinResponseWindow &&
                    submission.amountUsd > 1;

                  return (
                    <div key={String(submission._id)} className="grid gap-2 border border-zinc-200 p-3">
                      <button
                        type="button"
                        className={`grid gap-2 text-left ${canOpenResponse ? "cursor-pointer" : ""}`}
                        onClick={() => {
                          if (!canOpenResponse) {
                            return;
                          }
                          onOpenAnswerDialog(submission._id);
                        }}
                      >
                        <p className="text-sm font-medium text-zinc-900">{submission.requestTypeLabel}</p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600">
                          <span>{submission.userName}</span>
                          <span
                            className={`inline-flex rounded-none border px-2 py-0.5 text-[11px] ${getStatusPillClass(submission.status)}`}
                          >
                            {submission.status}
                          </span>
                          <span className="font-medium text-zinc-900">${submission.amountUsd.toFixed(2)}</span>
                        </div>
                        <p className="text-xs text-zinc-600">Created: {formatDateTime(submission.createdAt)}</p>
                        <p className="text-xs text-zinc-600">
                          Deadline:{" "}
                          {submission.status === "pending" && !submission.isWithinResponseWindow
                            ? "Expired window"
                            : formatDateTime(submission.deadlineAt)}
                        </p>
                      </button>

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        {canRefundSubmission ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                            disabled={refundPendingId === submission._id}
                            onClick={() => onRefundSubmission(submission._id)}
                          >
                            {refundPendingId === submission._id ? "Refunding..." : "Refund"}
                          </Button>
                        ) : (
                          <span className="text-xs text-zinc-500">&nbsp;</span>
                        )}

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={deletePendingId === submission._id}
                          onClick={() => onSetSubmissionDeleteConfirmId(submission._id)}
                        >
                          {deletePendingId === submission._id ? (
                            "Deleting..."
                          ) : (
                            <>
                              <Trash2 className="size-3.5" />
                              Delete
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Request</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Deadline</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedSubmissions.map((submission) => {
                      const canOpenResponse =
                        submission.status === "answered" ||
                        (submission.status === "pending" && submission.isWithinResponseWindow);
                      const canRefundSubmission =
                        submission.status === "pending" &&
                        !submission.isWithinResponseWindow &&
                        submission.amountUsd > 1;
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
                            {canRefundSubmission ? (
                              <div className="flex items-center gap-2">
                                <span className="text-red-600">Expired window</span>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                                  disabled={refundPendingId === submission._id}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    onRefundSubmission(submission._id);
                                  }}
                                >
                                  {refundPendingId === submission._id ? "Refunding..." : "Refund"}
                                </Button>
                              </div>
                            ) : (
                              formatDateTime(submission.deadlineAt)
                            )}
                          </TableCell>
                          <TableCell className="text-right">${submission.amountUsd.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={deletePendingId === submission._id}
                              onClick={(event) => {
                                event.stopPropagation();
                                onSetSubmissionDeleteConfirmId(submission._id);
                              }}
                            >
                              {deletePendingId === submission._id ? (
                                "Deleting..."
                              ) : (
                                <>
                                  <Trash2 className="size-3.5" />
                                  Delete
                                </>
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : null}

          {dashboardSubmissions && dashboardSubmissions.length > submissionsPageSize ? (
            <Pagination>
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

          <AlertDialog open={cashoutConfirmOpen} onOpenChange={onSetCashoutConfirmOpen}>
            <AlertDialogContent size="sm">
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm cash out?</AlertDialogTitle>
                <AlertDialogDescription>
                  You are cashing out your available balance with a transparent payout breakdown.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="grid gap-2 border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
                <div className="flex items-center justify-between">
                  <span>Available balance</span>
                  <span className="font-medium text-zinc-900">
                    ${cashoutBreakdown.grossAmountUsd.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>App fee ({APP_FEE_PERCENT}%)</span>
                  <span className="font-medium text-zinc-900">
                    -${cashoutBreakdown.appFeeUsd.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-zinc-500">
                  <span>Payment fees</span>
                  <span>Included in app fee</span>
                </div>
                <div className="h-px bg-zinc-200" />
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-zinc-900">You receive ({CREATOR_PAYOUT_PERCENT}%)</span>
                  <span className="font-semibold text-primary">
                    ${cashoutBreakdown.creatorAmountUsd.toFixed(2)}
                  </span>
                </div>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={cashoutPending}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onConfirmCashout}
                  disabled={cashoutPending || cashoutBreakdown.creatorAmountUsd <= 0}
                >
                  {cashoutPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Cashing out...
                    </>
                  ) : (
                    "Confirm cash out"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog
            open={Boolean(submissionDeleteConfirmId)}
            onOpenChange={(open) => {
              if (!open) {
                onSetSubmissionDeleteConfirmId(null);
              }
            }}
          >
            <AlertDialogContent size="sm">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete submission?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes the submission from both your admin dashboard and the
                  member&apos;s submissions list.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  disabled={
                    Boolean(submissionDeleteConfirmId) && deletePendingId === submissionDeleteConfirmId
                  }
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={onConfirmDeleteSubmission}
                  disabled={
                    !submissionDeleteConfirmId || deletePendingId === submissionDeleteConfirmId
                  }
                >
                  {deletePendingId === submissionDeleteConfirmId ? "Deleting..." : "Confirm delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </section>
  );
}
