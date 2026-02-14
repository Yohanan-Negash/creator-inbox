"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import type { SubmitEvent } from "react";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MemberHeader } from "@/components/experiences/member/member-header";
import { RequestTypesView } from "@/components/experiences/member/request-types-view";
import { SubmissionsView } from "@/components/experiences/member/submissions-view";
import { SubmitRequestDialog } from "@/components/experiences/member/submit-request-dialog";
import type { WhopResponse } from "@/lib/types/experiences/common";
import type { MemberBootstrapData } from "@/lib/types/experiences/bootstrap";
import type {
  HomeView,
  MemberRequestType,
  MemberSubmission,
} from "@/lib/types/experiences/member";

const submissionSchema = z.object({
  submissionText: z
    .string()
    .trim()
    .min(5, "Please share a few details (at least 5 characters).")
    .max(2000, "Submission must be at most 2000 characters."),
});

function normalizeSubmissions(
  entries: Array<MemberSubmission & { responseText?: string | null }> = [],
) {
  return entries.map((item) => ({
    ...item,
    responseText: item.responseText ?? undefined,
  }));
}

function toWhopResponse(initialData: MemberBootstrapData): WhopResponse | null {
  if (!initialData.user && !initialData.access && !initialData.error) {
    return null;
  }

  return {
    user: initialData.user,
    access: initialData.access,
    error: initialData.error,
  };
}

export default function ExperiencePageClient({
  experienceId,
  devUserToken,
  initialData,
}: {
  experienceId: string;
  devUserToken: string;
  initialData: MemberBootstrapData;
}) {
  const [data, setData] = useState<WhopResponse | null>(() => toWhopResponse(initialData));
  const [activeView, setActiveView] = useState<HomeView>("request-types");
  const [viewTransitionPending, startViewTransition] = useTransition();

  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [selectedRequestType, setSelectedRequestType] = useState<{
    id: Id<"requestTypes">;
    title: string;
    price: number;
  } | null>(null);
  const [submissionText, setSubmissionText] = useState("");
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submissionPending, setSubmissionPending] = useState(false);
  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(null);
  const [checkoutPaymentId, setCheckoutPaymentId] = useState<string | null>(null);
  const [checkoutReturnUrl, setCheckoutReturnUrl] = useState<string | null>(null);
  const [submissionsPage, setSubmissionsPage] = useState(1);
  const [submissionsPagePending, setSubmissionsPagePending] = useState(false);
  const [submissionsPageError, setSubmissionsPageError] = useState<string | null>(null);
  const [submissionsCursor, setSubmissionsCursor] = useState<string | null>(null);
  const [submissionsNextCursor, setSubmissionsNextCursor] = useState<string | null>(() =>
    initialData.access?.has_access && initialData.submissionsIsDone !== true
      ? (initialData.submissionsContinueCursor ?? null)
      : null,
  );
  const [submissionsCursorHistory, setSubmissionsCursorHistory] = useState<Array<string | null>>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<Id<"submissions"> | null>(null);
  const [readSubmissionIds, setReadSubmissionIds] = useState<string[]>([]);
  const [requestTypes, setRequestTypes] = useState<MemberRequestType[] | undefined>(() =>
    initialData.access?.has_access ? (initialData.requestTypes ?? []) : undefined,
  );
  const [submissions, setSubmissions] = useState<MemberSubmission[] | undefined>(() =>
    initialData.access?.has_access ? normalizeSubmissions(initialData.submissions) : undefined,
  );
  const [memberDataLoading, setMemberDataLoading] = useState(false);

  const viewerUserId = data?.user?.id ?? "";
  const readSubmissionIdSet = useMemo(() => new Set(readSubmissionIds), [readSubmissionIds]);

  const selectedSubmission = useMemo(() => {
    if (!submissions || !selectedSubmissionId) {
      return null;
    }

    return submissions.find((item) => item._id === selectedSubmissionId) ?? null;
  }, [selectedSubmissionId, submissions]);

  const unreadAnsweredCount = useMemo(() => {
    if (!submissions) {
      return 0;
    }

    return submissions.filter(
      (item) =>
        item.status === "answered" &&
        Boolean(item.responseText) &&
        !readSubmissionIdSet.has(String(item._id)),
    ).length;
  }, [readSubmissionIdSet, submissions]);

  useEffect(() => {
    setData(toWhopResponse(initialData));

    if (initialData.access?.has_access) {
      setRequestTypes(initialData.requestTypes ?? []);
      setSubmissions(normalizeSubmissions(initialData.submissions));
      setSubmissionsPage(1);
      setSubmissionsCursor(null);
      setSubmissionsCursorHistory([]);
      setSubmissionsPageError(null);
      setSubmissionsNextCursor(
        initialData.submissionsIsDone === true ? null : (initialData.submissionsContinueCursor ?? null),
      );
      return;
    }

    setRequestTypes(undefined);
    setSubmissions(undefined);
    setSubmissionsPage(1);
    setSubmissionsCursor(null);
    setSubmissionsCursorHistory([]);
    setSubmissionsPageError(null);
    setSubmissionsNextCursor(null);
  }, [initialData]);

  useEffect(() => {
    if (!viewerUserId) {
      return;
    }

    const storageKey = `submission-reads:${experienceId}:${viewerUserId}`;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as string[];
      if (Array.isArray(parsed)) {
        setReadSubmissionIds(parsed);
      }
    } catch {
      // no-op
    }
  }, [experienceId, viewerUserId]);

  useEffect(() => {
    if (!viewerUserId) {
      return;
    }

    const storageKey = `submission-reads:${experienceId}:${viewerUserId}`;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(readSubmissionIds));
    } catch {
      // no-op
    }
  }, [experienceId, readSubmissionIds, viewerUserId]);

  useEffect(() => {
    if (!submissions?.length) {
      setSelectedSubmissionId(null);
      return;
    }

    const isSelectedOnPage = submissions.some(
      (item) => item._id === selectedSubmissionId,
    );

    if (!selectedSubmissionId || !isSelectedOnPage) {
      setSelectedSubmissionId(submissions[0]._id);
    }
  }, [submissions, selectedSubmissionId]);

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

    setSubmissionPending(true);
    setSubmissionError(null);

    try {
      const createResponse = await fetch("/api/whop/payments/create-submission-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          experienceId,
          requestTypeId: selectedRequestType.id,
          submissionText: parsed.data.submissionText,
          whopDevUserToken: devUserToken || undefined,
        }),
      });

      const createPayload = (await createResponse.json()) as {
        checkoutConfigurationId?: string;
        planId?: string;
        paymentId?: string;
        purchaseUrl?: string;
        redirectUrl?: string;
        status?: string;
        submissionCreated?: boolean;
        error?: string;
      };

      if (!createResponse.ok) {
        throw new Error(createPayload.error || "Failed to process payment.");
      }

      if (createPayload.submissionCreated) {
        setSubmitDialogOpen(false);
        resetCheckoutState();
        setSubmissionPending(false);
        setActiveView("submissions");
        await refreshMemberData();
        return;
      }

      if (!createPayload.checkoutConfigurationId) {
        throw new Error("Missing checkout details.");
      }

      setCheckoutSessionId(createPayload.checkoutConfigurationId);
      setCheckoutPaymentId(createPayload.paymentId ?? null);
      setCheckoutReturnUrl(createPayload.redirectUrl ?? null);
      setSubmissionPending(false);
      return;
    } catch {
      setSubmissionError("Please try again.");
      setSubmissionPending(false);
    }
  }

  function resetCheckoutState() {
    setCheckoutSessionId(null);
    setCheckoutPaymentId(null);
    setCheckoutReturnUrl(null);
  }

  async function refreshMemberData() {
    setMemberDataLoading(true);
    try {
      const url = new URL(
        `/api/whop/experiences/${encodeURIComponent(experienceId)}/member-data`,
        window.location.origin,
      );
      if (devUserToken) {
        url.searchParams.set("whop-dev-user-token", devUserToken);
      }
      const refreshResponse = await fetch(url.toString());
      const refreshPayload = (await refreshResponse.json()) as {
        requestTypes?: MemberRequestType[];
        submissions?: Array<MemberSubmission & { responseText?: string | null }>;
        submissionsContinueCursor?: string | null;
        submissionsIsDone?: boolean;
      };
      if (refreshResponse.ok) {
        setRequestTypes(refreshPayload.requestTypes ?? []);
        setSubmissions(normalizeSubmissions(refreshPayload.submissions));
        setSubmissionsPage(1);
        setSubmissionsCursor(null);
        setSubmissionsCursorHistory([]);
        setSubmissionsPageError(null);
        setSubmissionsNextCursor(
          refreshPayload.submissionsIsDone === true ? null : (refreshPayload.submissionsContinueCursor ?? null),
        );
      }
    } catch {
      // no-op
    } finally {
      setMemberDataLoading(false);
    }
  }

  const hasPreviousSubmissionsPage = submissionsCursorHistory.length > 0;
  const hasNextSubmissionsPage = Boolean(submissionsNextCursor);

  const fetchMemberSubmissionsPage = useCallback(
    async (cursor: string | null) => {
      const url = new URL(
        `/api/whop/experiences/${encodeURIComponent(experienceId)}/member-submissions`,
        window.location.origin,
      );

      if (devUserToken) {
        url.searchParams.set("whop-dev-user-token", devUserToken);
      }

      if (cursor) {
        url.searchParams.set("cursor", cursor);
      }

      const response = await fetch(url.toString());
      const payload = (await response.json()) as {
        submissions?: Array<MemberSubmission & { responseText?: string | null }>;
        submissionsContinueCursor?: string | null;
        submissionsIsDone?: boolean;
      };

      if (!response.ok) {
        throw new Error("Failed to load submissions.");
      }

      return {
        submissions: normalizeSubmissions(payload.submissions),
        submissionsContinueCursor:
          payload.submissionsIsDone === true ? null : (payload.submissionsContinueCursor ?? null),
      };
    },
    [devUserToken, experienceId],
  );

  const handleGoToNextSubmissionsPage = useCallback(async () => {
    if (!submissionsNextCursor || submissionsPagePending) {
      return;
    }

    setSubmissionsPagePending(true);
    setSubmissionsPageError(null);
    try {
      const payload = await fetchMemberSubmissionsPage(submissionsNextCursor);
      setSubmissions(payload.submissions);
      setSubmissionsCursorHistory((history) => [...history, submissionsCursor]);
      setSubmissionsCursor(submissionsNextCursor);
      setSubmissionsNextCursor(payload.submissionsContinueCursor);
      setSubmissionsPage((page) => page + 1);
    } catch {
      setSubmissionsPageError("Failed to load submissions.");
    } finally {
      setSubmissionsPagePending(false);
    }
  }, [
    fetchMemberSubmissionsPage,
    submissionsCursor,
    submissionsNextCursor,
    submissionsPagePending,
  ]);

  const handleGoToPreviousSubmissionsPage = useCallback(async () => {
    if (submissionsCursorHistory.length === 0 || submissionsPagePending) {
      return;
    }

    const previousCursor = submissionsCursorHistory[submissionsCursorHistory.length - 1] ?? null;

    setSubmissionsPagePending(true);
    setSubmissionsPageError(null);
    try {
      const payload = await fetchMemberSubmissionsPage(previousCursor);
      setSubmissions(payload.submissions);
      setSubmissionsCursor(previousCursor);
      setSubmissionsCursorHistory((history) => history.slice(0, -1));
      setSubmissionsNextCursor(payload.submissionsContinueCursor);
      setSubmissionsPage((page) => Math.max(1, page - 1));
    } catch {
      setSubmissionsPageError("Failed to load submissions.");
    } finally {
      setSubmissionsPagePending(false);
    }
  }, [fetchMemberSubmissionsPage, submissionsCursorHistory, submissionsPagePending]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function handleCheckoutComplete(_planId: string, _receiptId?: string) {
    if (!checkoutPaymentId) {
      setSubmitDialogOpen(false);
      resetCheckoutState();
      setActiveView("submissions");
      return;
    }

    setSubmissionPending(true);
    setSubmissionError(null);

    const maxAttempts = 10;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const statusUrl = new URL("/api/whop/payments/submission-status", window.location.origin);
        statusUrl.searchParams.set("experienceId", experienceId);
        statusUrl.searchParams.set("paymentId", checkoutPaymentId);
        if (devUserToken) {
          statusUrl.searchParams.set("whop-dev-user-token", devUserToken);
        }

        const response = await fetch(statusUrl.toString());
        const statusPayload = (await response.json()) as {
          status?: string;
          submissionCreated?: boolean;
        };

        if (statusPayload.status === "paid" && statusPayload.submissionCreated) {
          setSubmitDialogOpen(false);
          resetCheckoutState();
          setSubmissionPending(false);
          setActiveView("submissions");
          await refreshMemberData();
          return;
        }

        if (statusPayload.status === "failed") {
          setSubmissionError("Payment failed. Please try again.");
          resetCheckoutState();
          setSubmissionPending(false);
          return;
        }
      } catch {
        // continue polling
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // Timed out but payment may still be processing
    setSubmitDialogOpen(false);
    resetCheckoutState();
    setSubmissionPending(false);
    setActiveView("submissions");
  }

  function handleCheckoutCancel() {
    resetCheckoutState();
    setSubmissionError(null);
  }

  function openSubmissionDetails(submissionId: Id<"submissions">) {
    setSelectedSubmissionId(submissionId);
    const submission = submissions?.find((item) => item._id === submissionId);
    if (
      submission &&
      submission.status === "answered" &&
      submission.responseText &&
      !readSubmissionIdSet.has(String(submissionId))
    ) {
      setReadSubmissionIds((current) => [...current, String(submissionId)]);
    }
  }

  const hasAccess = data?.access?.has_access === true;
  const isRequestTypesLoading = hasAccess && (requestTypes === undefined || memberDataLoading);
  const loading = false;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-4 p-4 sm:gap-6 sm:p-6">
      <MemberHeader
        experienceId={experienceId}
        devUserToken={devUserToken}
        activeView={activeView}
        isAdmin={data?.access?.access_level === "admin"}
        togglePending={viewTransitionPending}
        onToggleView={() => {
          startViewTransition(() => {
            setActiveView((view) => (view === "submissions" ? "request-types" : "submissions"));
          });
        }}
      />

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
            <p className="text-sm text-zinc-500">Loading requests...</p>
          </div>
        </div>
      ) : null}

      {!loading && !data?.error && !isRequestTypesLoading && data?.access?.has_access && requestTypes !== undefined ? (
        activeView === "request-types" ? (
          <RequestTypesView requestTypes={requestTypes} onOpenSubmitDialog={openSubmitDialog} />
        ) : (
          <SubmissionsView
            username={data.user?.username}
            name={data.user?.name}
            isLoading={memberDataLoading}
            submissions={submissions}
            selectedSubmissionId={selectedSubmissionId}
            selectedSubmission={selectedSubmission}
            readSubmissionIds={readSubmissionIds}
            unreadAnsweredCount={unreadAnsweredCount}
            submissionsPage={submissionsPage}
            submissionsPagePending={submissionsPagePending}
            submissionsPageError={submissionsPageError}
            hasPreviousSubmissionsPage={hasPreviousSubmissionsPage}
            hasNextSubmissionsPage={hasNextSubmissionsPage}
            onOpenSubmissionDetails={openSubmissionDetails}
            onGoToPreviousSubmissionsPage={handleGoToPreviousSubmissionsPage}
            onGoToNextSubmissionsPage={handleGoToNextSubmissionsPage}
          />
        )
      ) : null}

      <SubmitRequestDialog
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
            resetCheckoutState();
          }
        }}
        submissionPending={submissionPending}
        selectedRequestType={selectedRequestType}
        submissionText={submissionText}
        submissionError={submissionError}
        onSubmissionTextChange={setSubmissionText}
        onSubmit={handleSubmitRequest}
        onCancel={() => {
          if (submissionPending) {
            return;
          }
          setSubmitDialogOpen(false);
        }}
        checkoutSessionId={checkoutSessionId}
        checkoutReturnUrl={checkoutReturnUrl}
        onCheckoutComplete={handleCheckoutComplete}
        onCheckoutCancel={handleCheckoutCancel}
      />
    </main>
  );
}
