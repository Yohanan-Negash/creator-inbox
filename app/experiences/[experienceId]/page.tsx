"use client";

import { use, useEffect, useMemo, useState } from "react";
import type { SubmitEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useQuery } from "convex/react";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MemberHeader } from "@/components/experiences/member/member-header";
import { RequestTypesView } from "@/components/experiences/member/request-types-view";
import { SubmissionsView } from "@/components/experiences/member/submissions-view";
import { SubmitRequestDialog } from "@/components/experiences/member/submit-request-dialog";

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
  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(null);
  const [checkoutPaymentId, setCheckoutPaymentId] = useState<string | null>(null);
  const [checkoutReturnUrl, setCheckoutReturnUrl] = useState<string | null>(null);
  const [submissionsPage, setSubmissionsPage] = useState(1);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<Id<"submissions"> | null>(null);
  const [readSubmissionIds, setReadSubmissionIds] = useState<string[]>([]);

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
        !readSubmissionIds.includes(String(item._id)),
    ).length;
  }, [readSubmissionIds, submissions]);

  useEffect(() => {
    setSubmissionsPage((page) => Math.min(page, totalSubmissionPages));
  }, [totalSubmissionPages]);

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
    if (!pagedSubmissions.length) {
      setSelectedSubmissionId(null);
      return;
    }

    const isSelectedOnPage = pagedSubmissions.some(
      (item) => item._id === selectedSubmissionId,
    );

    if (!selectedSubmissionId || !isSelectedOnPage) {
      setSelectedSubmissionId(pagedSubmissions[0]._id);
    }
  }, [pagedSubmissions, selectedSubmissionId]);

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
      !readSubmissionIds.includes(String(submissionId))
    ) {
      setReadSubmissionIds((current) => [...current, String(submissionId)]);
    }
  }

  const hasAccess = data?.access?.has_access === true;
  const isRequestTypesLoading = hasAccess && requestTypes === undefined;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 p-6">
      <MemberHeader
        experienceId={experienceId}
        devUserToken={devUserToken}
        activeView={activeView}
        isAdmin={data?.access?.access_level === "admin"}
        onToggleView={() =>
          setActiveView((view) => (view === "submissions" ? "request-types" : "submissions"))
        }
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
            <p className="text-sm text-zinc-500">Loading request types...</p>
          </div>
        </div>
      ) : null}

      {!loading && !data?.error && data?.access?.has_access && requestTypes !== undefined ? (
        activeView === "request-types" ? (
          <RequestTypesView requestTypes={requestTypes} onOpenSubmitDialog={openSubmitDialog} />
        ) : (
          <SubmissionsView
            username={data.user?.username}
            name={data.user?.name}
            submissions={submissions}
            pagedSubmissions={pagedSubmissions}
            selectedSubmissionId={selectedSubmissionId}
            selectedSubmission={selectedSubmission}
            readSubmissionIds={readSubmissionIds}
            unreadAnsweredCount={unreadAnsweredCount}
            submissionsPage={submissionsPage}
            totalSubmissionPages={totalSubmissionPages}
            submissionsPageSize={submissionsPageSize}
            onOpenSubmissionDetails={openSubmissionDetails}
            onSetSubmissionsPage={setSubmissionsPage}
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
