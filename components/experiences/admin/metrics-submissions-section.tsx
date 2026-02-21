import type { Id } from "@/convex/_generated/dataModel";
import { CircleHelp, Download, Loader2, Paperclip } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  attachment?: {
    fileName: string;
    contentType: string;
    sizeBytes: number;
    downloadUrl: string | null;
  } | null;
};

type MetricsSubmissionsSectionProps = {
  experienceId: string;
  devUserToken: string;
  metrics: Metrics | undefined;
  dashboardSubmissions: DashboardSubmission[] | undefined;
  submissionsPage: number;
  submissionsPagePending: boolean;
  hasPreviousSubmissionsPage: boolean;
  hasNextSubmissionsPage: boolean;
  onOpenAnswerDialog: (submissionId: Id<"submissions">) => void;
  onRefundSubmission: (submissionId: Id<"submissions">) => void;
  onConfirmCashout: () => void;
  cashoutConfirmOpen: boolean;
  onSetCashoutConfirmOpen: (open: boolean) => void;
  cashoutPending: boolean;
  cashoutError: string | null;
  refundPendingId: Id<"submissions"> | null;
  onGoToPreviousSubmissionsPage: () => void;
  onGoToNextSubmissionsPage: () => void;
};

export function MetricsSubmissionsSection({
  experienceId,
  devUserToken,
  metrics,
  dashboardSubmissions,
  submissionsPage,
  submissionsPagePending,
  hasPreviousSubmissionsPage,
  hasNextSubmissionsPage,
  onOpenAnswerDialog,
  onRefundSubmission,
  onConfirmCashout,
  cashoutConfirmOpen,
  onSetCashoutConfirmOpen,
  cashoutPending,
  cashoutError,
  refundPendingId,
  onGoToPreviousSubmissionsPage,
  onGoToNextSubmissionsPage,
}: MetricsSubmissionsSectionProps) {
  const balanceAvailable = metrics?.balanceAvailable ?? metrics?.moneyEarned ?? 0;
  const cashoutBreakdown = calculateCashoutBreakdown(balanceAvailable);
  const getAttachmentDownloadHref = (submissionId: string) => {
    const path = `/api/whop/experiences/${encodeURIComponent(experienceId)}/submissions/${encodeURIComponent(
      submissionId,
    )}/attachment/download`;
    if (!devUserToken) {
      return path;
    }
    return `${path}?whop-dev-user-token=${encodeURIComponent(devUserToken)}`;
  };

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
            <CardDescription>Money Available</CardDescription>
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
            <CardDescription className="flex items-center gap-1.5">
              <span>Pending to Earn</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center text-muted-foreground"
                    aria-label="What pending to earn means"
                  >
                    <CircleHelp className="size-3.5" aria-hidden="true" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-64 text-balance" align="start">
                  Revenue from paid requests awaiting your response. Answer before each deadline to move this
                  amount into Money Available.
                </TooltipContent>
              </Tooltip>
            </CardDescription>
            <CardTitle className="text-foreground">
              ${(metrics?.moneyAvailable ?? 0).toFixed(2)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submissions</CardTitle>
          <CardDescription>
            Click a pending row to answer it before the deadline so the amount moves into Money Available. Click an answered row to view its response.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {dashboardSubmissions === undefined ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading submissions...
            </div>
          ) : null}

          {dashboardSubmissions !== undefined && dashboardSubmissions.length === 0 ? (
            <p className="text-xs text-muted-foreground">No submissions yet.</p>
          ) : null}

          {dashboardSubmissions && dashboardSubmissions.length > 0 ? (
            <>
              <div className="grid gap-2 md:hidden">
                {dashboardSubmissions.map((submission) => {
                  const canOpenResponse =
                    submission.status === "answered" ||
                    (submission.status === "pending" && submission.isWithinResponseWindow);
                  const canRefundSubmission =
                    submission.status === "pending" &&
                    !submission.isWithinResponseWindow &&
                    submission.amountUsd > 0;

                  return (
                    <div key={String(submission._id)} className="grid gap-2 rounded-lg border border-border p-3">
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
                        <p className="text-sm font-medium text-foreground">{submission.requestTypeLabel}</p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{submission.userName}</span>
                          <span
                            className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] ${getStatusPillClass(submission.status)}`}
                          >
                            {submission.status}
                          </span>
                          <span className="font-medium text-foreground">${submission.amountUsd.toFixed(2)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Created: {formatDateTime(submission.createdAt)}</p>
                        <p className="text-xs text-muted-foreground">
                          Deadline:{" "}
                          {submission.status === "pending" && !submission.isWithinResponseWindow
                            ? "Expired window"
                            : formatDateTime(submission.deadlineAt)}
                        </p>
                        {submission.attachment ? (
                          <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Paperclip className="size-3" />
                            {submission.attachment.downloadUrl ? (
                              <a
                                href={getAttachmentDownloadHref(String(submission._id))}
                                className="inline-flex items-center gap-1 text-primary hover:underline"
                                onClick={(event) => event.stopPropagation()}
                              >
                                {submission.attachment.fileName}
                                <Download className="size-3" />
                              </a>
                            ) : (
                              <span>{submission.attachment.fileName}</span>
                            )}
                          </div>
                        ) : null}
                      </button>

                      {canRefundSubmission ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            disabled={refundPendingId === submission._id}
                            onClick={() => onRefundSubmission(submission._id)}
                          >
                            {refundPendingId === submission._id ? "Refunding..." : "Refund"}
                          </Button>
                        </div>
                      ) : null}
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboardSubmissions.map((submission) => {
                      const canOpenResponse =
                        submission.status === "answered" ||
                        (submission.status === "pending" && submission.isWithinResponseWindow);
                      const canRefundSubmission =
                        submission.status === "pending" &&
                        !submission.isWithinResponseWindow &&
                        submission.amountUsd > 0;
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
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span>{submission.requestTypeLabel}</span>
                              {submission.attachment?.downloadUrl ? (
                                <a
                                  href={getAttachmentDownloadHref(String(submission._id))}
                                  className="text-primary hover:underline"
                                  onClick={(event) => event.stopPropagation()}
                                  aria-label={`Download ${submission.attachment.fileName}`}
                                >
                                  <Download className="size-3.5" />
                                </a>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] ${getStatusPillClass(submission.status)}`}
                            >
                              {submission.status}
                            </span>
                          </TableCell>
                          <TableCell>{formatDateTime(submission.createdAt)}</TableCell>
                          <TableCell>
                            {canRefundSubmission ? (
                              <div className="flex items-center gap-2">
                                <span className="text-destructive">Expired window</span>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
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
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : null}

          {dashboardSubmissions !== undefined && (hasPreviousSubmissionsPage || hasNextSubmissionsPage) ? (
            <Pagination>
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

          <AlertDialog open={cashoutConfirmOpen} onOpenChange={onSetCashoutConfirmOpen}>
            <AlertDialogContent size="sm">
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm cash out?</AlertDialogTitle>
                <AlertDialogDescription>
                  You are cashing out your available balance with a transparent payout breakdown.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="grid gap-2 rounded-md border border-border bg-muted/40 p-3 text-xs text-foreground">
                <div className="flex items-center justify-between">
                  <span>Available balance</span>
                  <span className="font-medium text-foreground">
                    ${cashoutBreakdown.grossAmountUsd.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>App fee ({APP_FEE_PERCENT}%)</span>
                  <span className="font-medium text-foreground">
                    -${cashoutBreakdown.appFeeUsd.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Payment fees</span>
                  <span>Included in app fee</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">You receive ({CREATOR_PAYOUT_PERCENT}%)</span>
                  <span className="font-semibold text-primary">
                    ${cashoutBreakdown.creatorAmountUsd.toFixed(2)}
                  </span>
                </div>
              </div>
              {cashoutError ? <p className="text-xs text-destructive">{cashoutError}</p> : null}
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

        </CardContent>
      </Card>
    </section>
  );
}
