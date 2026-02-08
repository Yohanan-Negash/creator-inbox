"use client";

import { use, useEffect, useMemo, useState } from "react";
import type { SubmitEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Textarea } from "@/components/ui/textarea";

type WhopResponse = {
  user?: {
    id: string;
    username: string;
    name: string | null;
  };
  access?: {
    access_level: string;
    has_access: boolean;
  };
  error?: string;
};

type HomeView = "request-types" | "submissions";

const submissionSchema = z.object({
  submissionText: z
    .string()
    .trim()
    .min(8, "Please share a few details (at least 8 characters).")
    .max(2000, "Submission must be at most 2000 characters."),
});

function formatDateTime(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function getStatusPillClass(status: "pending" | "answered" | "expired" | "refunded") {
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

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export default function ExperiencePage({
  params,
}: {
  params: Promise<{ experienceId: string }>;
}) {
  const { experienceId } = use(params);
  const searchParams = useSearchParams();
  const devUserToken = searchParams.get("whop-dev-user-token") ?? "";
  const [data, setData] = useState<WhopResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<HomeView>("request-types");

  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [selectedRequestType, setSelectedRequestType] = useState<{
    id: Id<"requestTypes">;
    title: string;
    price: number;
  } | null>(null);
  const [submissionText, setSubmissionText] = useState("");
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submissionPending, setSubmissionPending] = useState(false);
  const [submissionsPage, setSubmissionsPage] = useState(1);

  const requestTypes = useQuery(api.requestTypes.listActiveByExperience, {
    experienceId,
  });

  const viewerUserId = data?.user?.id ?? "";
  const submissions = useQuery(
    api.submissions.listVisibleForUser,
    data?.access?.has_access && viewerUserId
      ? { experienceId, viewerUserId }
      : "skip",
  );
  const createSubmission = useMutation(api.submissions.createSubmission);

  const submissionsPageSize = 6;
  const totalSubmissionPages = useMemo(() => {
    const count = submissions?.length ?? 0;
    return Math.max(1, Math.ceil(count / submissionsPageSize));
  }, [submissions]);

  const pagedSubmissions = useMemo(() => {
    if (!submissions) {
      return [];
    }
    const start = (submissionsPage - 1) * submissionsPageSize;
    return submissions.slice(start, start + submissionsPageSize);
  }, [submissions, submissionsPage]);

  useEffect(() => {
    setSubmissionsPage((page) => Math.min(page, totalSubmissionPages));
  }, [totalSubmissionPages]);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch(
          `/api/whop/user?experienceId=${encodeURIComponent(experienceId)}&whop-dev-user-token=${encodeURIComponent(devUserToken)}`,
        );
        const payload = (await response.json()) as WhopResponse;
        if (!active) {
          return;
        }
        setData(payload);
      } catch {
        if (!active) {
          return;
        }
        setData({ error: "Failed to fetch Whop data." });
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [devUserToken, experienceId]);

  function openSubmitDialog(item: { _id: Id<"requestTypes">; title: string; price: number }) {
    setSelectedRequestType({ id: item._id, title: item.title, price: item.price });
    setSubmissionText("");
    setSubmissionError(null);
    setSubmitDialogOpen(true);
  }

  async function handleSubmitRequest(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedRequestType || !viewerUserId) {
      setSubmissionError("Unable to verify your user account. Please refresh and try again.");
      return;
    }

    const parsed = submissionSchema.safeParse({ submissionText });
    if (!parsed.success) {
      const flattened = z.flattenError(parsed.error);
      setSubmissionError(flattened.fieldErrors.submissionText?.[0] ?? "Invalid submission.");
      return;
    }

    const viewerUserName =
      data?.user?.username?.trim() || data?.user?.name?.trim() || viewerUserId;

    setSubmissionPending(true);
    setSubmissionError(null);

    try {
      await createSubmission({
        experienceId,
        requestTypeId: selectedRequestType.id,
        viewerUserId,
        viewerUserName,
        submissionText: parsed.data.submissionText,
      });

      setSubmitDialogOpen(false);
      setSelectedRequestType(null);
      setSubmissionText("");
      setActiveView("submissions");
    } catch (error) {
      setSubmissionError(getErrorMessage(error, "Failed to submit request."));
    } finally {
      setSubmissionPending(false);
    }
  }

  const hasAccess = data?.access?.has_access === true;
  const isRequestTypesLoading = hasAccess && requestTypes === undefined;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between border-b border-zinc-200 pb-3">
        <div>
          <h1 className="text-xl font-semibold">Creator Inbox</h1>
          <p className="text-xs text-zinc-500">Experience: {experienceId}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className={activeView === "submissions" ? "border-primary text-primary" : ""}
            onClick={() =>
              setActiveView((view) =>
                view === "submissions" ? "request-types" : "submissions",
              )
            }
          >
            {activeView === "submissions" ? "Request Types" : "My Submissions"}
          </Button>
          {data?.access?.access_level === "admin" ? (
            <Button
              nativeButton={false}
              render={
                <Link
                  href={`/experiences/${encodeURIComponent(experienceId)}/admin${devUserToken ? `?whop-dev-user-token=${encodeURIComponent(devUserToken)}` : ""}`}
                />
              }
              variant="outline"
              size="sm"
            >
              Admin Page
            </Button>
          ) : null}
        </div>
      </header>

      {loading ? (
        <div className="flex min-h-[60vh] items-center justify-center p-6">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-zinc-500">Loading experience access...</p>
          </div>
        </div>
      ) : null}

      {!loading && data?.error ? (
        <Card>
          <CardHeader>
            <CardTitle>Access error</CardTitle>
            <CardDescription>{data.error}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {!loading && !data?.error && data?.access?.has_access === false ? (
        <Card>
          <CardHeader>
            <CardTitle>No access</CardTitle>
            <CardDescription>
              You do not have access to this experience.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {!loading && !data?.error && isRequestTypesLoading ? (
        <div className="flex min-h-[60vh] items-center justify-center p-6">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-zinc-500">Loading request types...</p>
          </div>
        </div>
      ) : null}

      {!loading && !data?.error && data?.access?.has_access && requestTypes !== undefined ? (
        activeView === "request-types" ? (
          <section className="flex flex-col gap-3">
            <div>
              <h2 className="text-base font-medium">Available request types</h2>
              <p className="text-xs text-zinc-500">
                Pick one to submit a paid request.
              </p>
            </div>

            {requestTypes.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>No request types yet</CardTitle>
                  <CardDescription>
                    This creator has not published request types for this
                    experience yet.
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {requestTypes.map((item) => (
                  <Card key={item._id} className="h-full min-h-[220px]">
                    <CardHeader className="gap-2">
                      <CardTitle className="line-clamp-1">{item.title}</CardTitle>
                      <CardDescription className="line-clamp-3 min-h-[60px]">
                        {item.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm line-clamp-1">
                        <span className="font-medium text-primary">${item.price.toFixed(2)}</span>
                        <span className="text-zinc-400"> · </span>
                        <span className="text-amber-600">{item.responseWindowHours}h response window</span>
                      </p>
                    </CardContent>
                    <CardFooter className="mt-auto justify-between">
                      <p className="text-xs text-zinc-500">Text response only</p>
                      <Button
                        size="sm"
                        onClick={() => openSubmitDialog(item)}
                      >
                        Submit Request
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </section>
        ) : (
          <section className="grid gap-3">
            <Card>
              <CardHeader>
                <CardTitle>My submissions</CardTitle>
                <CardDescription>
                  Signed in as {data.user?.username ?? "member"}
                  {data.user?.name ? ` (${data.user.name})` : ""}.
                </CardDescription>
              </CardHeader>
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
                    Submit a request from the request types tab to get started.
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : null}

            {submissions && submissions.length > 0 ? (
              <div className="grid gap-3">
                {pagedSubmissions.map((submission) => (
                  <Card key={String(submission._id)}>
                    <CardHeader>
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle>{submission.requestTypeLabel}</CardTitle>
                        <span className={`inline-flex rounded-none border px-2 py-0.5 text-[11px] ${getStatusPillClass(submission.status)}`}>
                          {submission.status}
                        </span>
                      </div>
                      <CardDescription>
                        Submitted {formatDateTime(submission.createdAt)} · ${submission.amountUsd.toFixed(2)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-2">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-zinc-500">My request</p>
                        <p className="text-xs text-zinc-700">{submission.submissionText}</p>
                      </div>
                      {submission.responseText ? (
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-zinc-500">Creator response</p>
                          <p className="text-xs text-zinc-700">{submission.responseText}</p>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                ))}

                {submissions.length > submissionsPageSize ? (
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(event) => {
                            event.preventDefault();
                            setSubmissionsPage((page) => Math.max(1, page - 1));
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
                                setSubmissionsPage(pageNumber);
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
                            setSubmissionsPage((page) =>
                              Math.min(totalSubmissionPages, page + 1),
                            );
                          }}
                          className={submissionsPage >= totalSubmissionPages ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                ) : null}
              </div>
            ) : null}
          </section>
        )
      ) : null}

      <Dialog
        open={submitDialogOpen}
        onOpenChange={(open) => {
          if (submissionPending) {
            return;
          }
          setSubmitDialogOpen(open);
          if (!open) {
            setSelectedRequestType(null);
            setSubmissionText("");
            setSubmissionError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <form className="grid gap-3" onSubmit={handleSubmitRequest}>
            <DialogHeader>
              <DialogTitle>Submit request</DialogTitle>
              <DialogDescription>
                Payment successful (simulated). Add a clear description so the creator can help quickly.
              </DialogDescription>
            </DialogHeader>

            {selectedRequestType ? (
              <div className="rounded-none border border-zinc-200 p-2 text-xs text-zinc-600">
                <p className="font-medium text-zinc-800">{selectedRequestType.title}</p>
                <p>${selectedRequestType.price.toFixed(2)} charged (simulated)</p>
              </div>
            ) : null}

            <div className="grid gap-1.5">
              <label className="text-xs font-medium" htmlFor="submission-text">
                What do you need help with?
              </label>
              <Textarea
                id="submission-text"
                value={submissionText}
                onChange={(event) => setSubmissionText(event.target.value)}
                placeholder="Share context, your goal, and any constraints..."
                className="min-h-28"
                disabled={submissionPending}
              />
              {submissionError ? <p className="text-xs text-red-600">{submissionError}</p> : null}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (submissionPending) {
                    return;
                  }
                  setSubmitDialogOpen(false);
                }}
                disabled={submissionPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submissionPending || submissionText.trim().length < 8}
              >
                {submissionPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
