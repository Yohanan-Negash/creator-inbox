"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import type { SubmitEvent } from "react";
import Link from "next/link";
import { Loader2, Shield } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Id } from "@/convex/_generated/dataModel";
import {
  REQUEST_TYPE_DESCRIPTION_MAX_LENGTH,
  REQUEST_TYPE_TITLE_MAX_LENGTH,
} from "@/lib/request-types/constants";
import type { WhopResponse } from "@/lib/types/experiences/common";
import type { AdminBootstrapData } from "@/lib/types/experiences/bootstrap";
import type {
  AdminMetrics,
  AdminRequestType,
  AdminSubmission,
  AdminView,
  GenerateRequestTypesResponse,
  RequestTypeFieldErrors,
  RequestTypeFormValues,
} from "@/lib/types/experiences/admin";
import { RequestTypeFormDialog } from "@/components/experiences/admin/request-type-form-dialog";
import { RequestTypesManagement } from "@/components/experiences/admin/request-types-management";
import { MetricsSubmissionsSection } from "@/components/experiences/admin/metrics-submissions-section";
import { AnswerSubmissionDialog } from "@/components/experiences/admin/answer-submission-dialog";
import {
  fetchAdminData,
  postRequestTypeAction,
  postSubmissionAction,
} from "./_lib/api";

const requestTypeFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required.")
    .max(
      REQUEST_TYPE_TITLE_MAX_LENGTH,
      `Title must be at most ${REQUEST_TYPE_TITLE_MAX_LENGTH} characters.`,
    ),
  description: z
    .string()
    .trim()
    .min(1, "Description is required.")
    .max(
      REQUEST_TYPE_DESCRIPTION_MAX_LENGTH,
      `Description must be at most ${REQUEST_TYPE_DESCRIPTION_MAX_LENGTH} characters.`,
    ),
  price: z.coerce
    .number()
    .int("Price must be a whole number.")
    .min(0, "Price must be 0 or greater."),
  responseWindowHours: z.coerce
    .number()
    .int("Response window must be a whole number.")
    .positive("Response window must be greater than 0."),
});

const defaultFormValues: RequestTypeFormValues = {
  title: "",
  description: "",
  price: "",
  responseWindowHours: "",
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function normalizeAdminSubmissions(
  entries: Array<AdminSubmission & { responseText?: string | null }> = [],
) {
  return entries.map((item) => ({
    ...item,
    responseText: item.responseText ?? undefined,
  }));
}

function toWhopResponse(initialData: AdminBootstrapData): WhopResponse | null {
  if (!initialData.user && !initialData.access && !initialData.error) {
    return null;
  }

  return {
    user: initialData.user,
    access: initialData.access,
    error: initialData.error,
  };
}

export default function AdminPageClient({
  experienceId,
  devUserToken,
  initialData,
}: {
  experienceId: string;
  devUserToken: string;
  initialData: AdminBootstrapData;
}) {
  const [data, setData] = useState<WhopResponse | null>(() => toWhopResponse(initialData));
  const [activeView, setActiveView] = useState<AdminView>("metrics");
  const [viewTransitionPending, startViewTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRequestTypeId, setEditingRequestTypeId] = useState<Id<"requestTypes"> | null>(null);
  const [formValues, setFormValues] = useState<RequestTypeFormValues>(defaultFormValues);
  const [fieldErrors, setFieldErrors] = useState<RequestTypeFieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitPending, setSubmitPending] = useState(false);
  const [generatePending, setGeneratePending] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateController, setGenerateController] = useState<AbortController | null>(null);
  const [statusPendingId, setStatusPendingId] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [deletePendingId, setDeletePendingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<Id<"requestTypes"> | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [submissionsPage, setSubmissionsPage] = useState(1);
  const [answerDialogSubmissionId, setAnswerDialogSubmissionId] = useState<Id<"submissions"> | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [answerPending, setAnswerPending] = useState(false);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [refundPendingId, setRefundPendingId] = useState<Id<"submissions"> | null>(null);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [submissionDeletePendingId, setSubmissionDeletePendingId] = useState<
    Id<"submissions"> | null
  >(null);
  const [submissionDeleteError, setSubmissionDeleteError] = useState<string | null>(null);
  const [submissionDeleteConfirmId, setSubmissionDeleteConfirmId] = useState<
    Id<"submissions"> | null
  >(null);
  const [cashoutPending, setCashoutPending] = useState(false);
  const [cashoutError, setCashoutError] = useState<string | null>(null);
  const [cashoutConfirmOpen, setCashoutConfirmOpen] = useState(false);
  const [requestTypes, setRequestTypes] = useState<AdminRequestType[] | undefined>(() =>
    initialData.access?.access_level === "admin" ? (initialData.requestTypes ?? []) : undefined,
  );
  const [dashboardSubmissions, setDashboardSubmissions] = useState<AdminSubmission[] | undefined>(
    () =>
      initialData.access?.access_level === "admin"
        ? normalizeAdminSubmissions(initialData.dashboardSubmissions)
        : undefined,
  );
  const [metrics, setMetrics] = useState<AdminMetrics | null>(
    initialData.access?.access_level === "admin" ? (initialData.metrics ?? null) : null,
  );

  const viewerUserId = data?.user?.id ?? "";

  const refreshAdminData = useCallback(async () => {
    try {
      const payload = await fetchAdminData(window.location.origin, experienceId, devUserToken);
      setRequestTypes(payload.requestTypes);
      setDashboardSubmissions(payload.dashboardSubmissions);
      setMetrics(payload.metrics);
    } catch (error) {
      setStatusError(getErrorMessage(error, "Failed to load admin data."));
      setRequestTypes([]);
      setDashboardSubmissions([]);
      setMetrics(null);
    }
  }, [devUserToken, experienceId]);

  const pageSize = 4;
  const totalPages = useMemo(() => {
    const count = requestTypes?.length ?? 0;
    return Math.max(1, Math.ceil(count / pageSize));
  }, [requestTypes]);

  const pagedRequestTypes = useMemo(() => {
    if (!requestTypes) {
      return [];
    }

    const start = (currentPage - 1) * pageSize;
    return requestTypes.slice(start, start + pageSize);
  }, [currentPage, requestTypes]);

  const submissionsPageSize = 6;
  const totalSubmissionPages = useMemo(() => {
    const count = dashboardSubmissions?.length ?? 0;
    return Math.max(1, Math.ceil(count / submissionsPageSize));
  }, [dashboardSubmissions]);

  const pagedSubmissions = useMemo(() => {
    if (!dashboardSubmissions) {
      return [];
    }

    const start = (submissionsPage - 1) * submissionsPageSize;
    return dashboardSubmissions.slice(start, start + submissionsPageSize);
  }, [dashboardSubmissions, submissionsPage]);

  const selectedSubmission = useMemo(() => {
    if (!dashboardSubmissions || !answerDialogSubmissionId) {
      return null;
    }

    return (
      dashboardSubmissions.find((item) => item._id === answerDialogSubmissionId) ?? null
    );
  }, [answerDialogSubmissionId, dashboardSubmissions]);

  useEffect(() => {
    setData(toWhopResponse(initialData));

    if (initialData.access?.access_level === "admin") {
      setRequestTypes(initialData.requestTypes ?? []);
      setDashboardSubmissions(normalizeAdminSubmissions(initialData.dashboardSubmissions));
      setMetrics(initialData.metrics ?? null);
      return;
    }

    setRequestTypes(undefined);
    setDashboardSubmissions(undefined);
    setMetrics(null);
  }, [initialData]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  useEffect(() => {
    setSubmissionsPage((page) => Math.min(page, totalSubmissionPages));
  }, [totalSubmissionPages]);

  function resetFormState() {
    setFormValues(defaultFormValues);
    setFieldErrors({});
    setSubmitError(null);
    setGenerateError(null);
    setEditingRequestTypeId(null);
  }

  function openCreateDialog() {
    resetFormState();
    setDialogOpen(true);
  }

  function openEditDialog(item: {
    _id: Id<"requestTypes">;
    title: string;
    description: string;
    price: number;
    responseWindowHours: number;
  }) {
    setEditingRequestTypeId(item._id);
    setFieldErrors({});
    setSubmitError(null);
    setFormValues({
      title: item.title,
      description: item.description,
      price: String(item.price),
      responseWindowHours: String(item.responseWindowHours),
    });
    setDialogOpen(true);
  }

  function handleCloseDialog() {
    if (generateController) {
      generateController.abort();
      setGenerateController(null);
      setGeneratePending(false);
    }

    if (!submitPending) {
      resetFormState();
      setDialogOpen(false);
    }
  }

  async function handleGenerateWithAi() {
    setGenerateError(null);
    setSubmitError(null);

    const controller = new AbortController();
    setGenerateController(controller);
    setGeneratePending(true);

    try {
      const draftExisting: Array<{
        title: string;
        price?: number;
        responseWindowHours?: number;
      }> = requestTypes?.map((item) => ({
        title: item.title,
        price: item.price,
        responseWindowHours: item.responseWindowHours,
      })) ?? [];

      const pendingTitle = formValues.title.trim();
      if (pendingTitle.length > 0) {
        draftExisting.push({
          title: pendingTitle,
          price: Number(formValues.price) >= 0 ? Number(formValues.price) : undefined,
          responseWindowHours:
            Number(formValues.responseWindowHours) > 0
              ? Number(formValues.responseWindowHours)
              : undefined,
        });
      }

      const response = await fetch("/api/inference/request-types", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          experienceId,
          intent: "Generate a valuable paid request for this creator.",
          existingRequestTypes: draftExisting,
          whopDevUserToken: devUserToken || undefined,
        }),
      });

      const payload = (await response.json()) as GenerateRequestTypesResponse;

      if (!response.ok) {
        throw new Error(payload.error || "Failed to generate request.");
      }

      if (payload.rejected || payload.requestTypes.length === 0) {
        throw new Error(payload.rejectionReason || "Could not generate request.");
      }

      const suggestion = payload.requestTypes[0];
      setFieldErrors({});
      setFormValues({
        title: suggestion.title,
        description: suggestion.description,
        price: String(suggestion.price),
        responseWindowHours: String(suggestion.responseWindowHours),
      });
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }

      setGenerateError(getErrorMessage(error, "Failed to generate request."));
    } finally {
      setGeneratePending(false);
      setGenerateController(null);
    }
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!viewerUserId) {
      setSubmitError("Unable to verify your user account. Please refresh and try again.");
      return;
    }

    setSubmitError(null);
    setFieldErrors({});

    const parsed = requestTypeFormSchema.safeParse(formValues);
    if (!parsed.success) {
      const flattened = z.flattenError(parsed.error);
      setFieldErrors({
        title: flattened.fieldErrors.title?.[0],
        description: flattened.fieldErrors.description?.[0],
        price: flattened.fieldErrors.price?.[0],
        responseWindowHours: flattened.fieldErrors.responseWindowHours?.[0],
      });
      return;
    }

    setSubmitPending(true);

    try {
      await postRequestTypeAction(
        experienceId,
        editingRequestTypeId
          ? {
              action: "update",
              requestTypeId: editingRequestTypeId,
              title: parsed.data.title,
              description: parsed.data.description,
              price: parsed.data.price,
              responseWindowHours: parsed.data.responseWindowHours,
              whopDevUserToken: devUserToken || undefined,
            }
          : {
              action: "create",
              title: parsed.data.title,
              description: parsed.data.description,
              price: parsed.data.price,
              responseWindowHours: parsed.data.responseWindowHours,
              whopDevUserToken: devUserToken || undefined,
            },
      );

      await refreshAdminData();

      setDialogOpen(false);
      resetFormState();
    } catch (error) {
      setSubmitError(
        getErrorMessage(
          error,
          editingRequestTypeId
            ? "Failed to update request."
            : "Failed to create request.",
        ),
      );
    } finally {
      setSubmitPending(false);
    }
  }

  async function handleToggleRequestTypeStatus(
    requestTypeId: Id<"requestTypes">,
    nextIsActive: boolean,
  ) {
    if (!viewerUserId) {
      setStatusError("Unable to verify your user account. Please refresh and try again.");
      return;
    }

    setStatusError(null);
    setStatusPendingId(requestTypeId);

    try {
      await postRequestTypeAction(experienceId, {
        action: nextIsActive ? "unarchive" : "archive",
        requestTypeId,
        whopDevUserToken: devUserToken || undefined,
      });

      await refreshAdminData();
    } catch (error) {
      setStatusError(getErrorMessage(error, "Failed to update request status."));
    } finally {
      setStatusPendingId(null);
    }
  }

  async function handleSoftDeleteRequestType(requestTypeId: Id<"requestTypes">) {
    if (!viewerUserId) {
      setDeleteError("Unable to verify your user account. Please refresh and try again.");
      return false;
    }

    setDeleteError(null);
    setDeletePendingId(requestTypeId);

    try {
      await postRequestTypeAction(experienceId, {
        action: "delete",
        requestTypeId,
        whopDevUserToken: devUserToken || undefined,
      });

      await refreshAdminData();
      return true;
    } catch (error) {
      setDeleteError(getErrorMessage(error, "Failed to delete request."));
      return false;
    } finally {
      setDeletePendingId(null);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteConfirmId) {
      return;
    }

    const deleted = await handleSoftDeleteRequestType(deleteConfirmId);
    if (deleted) {
      setDeleteConfirmId(null);
    }
  }

  async function handleRefundSubmission(submissionId: Id<"submissions">) {
    setRefundError(null);
    setRefundPendingId(submissionId);

    try {
      const response = await fetch("/api/whop/payments/refund-submission", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          experienceId,
          submissionId,
          whopDevUserToken: devUserToken || undefined,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to refund submission.");
      }
    } catch (error) {
      setRefundError(getErrorMessage(error, "Failed to refund submission."));
    } finally {
      setRefundPendingId(null);
    }
  }

  async function handleDeleteSubmission(submissionId: Id<"submissions">) {
    if (!viewerUserId) {
      setSubmissionDeleteError("Unable to verify your user account. Please refresh and try again.");
      return false;
    }

    setSubmissionDeleteError(null);
    setSubmissionDeletePendingId(submissionId);

    try {
      await postSubmissionAction(experienceId, {
        action: "delete",
        submissionId,
        whopDevUserToken: devUserToken || undefined,
      });

      await refreshAdminData();
      return true;
    } catch (error) {
      setSubmissionDeleteError(getErrorMessage(error, "Failed to delete submission."));
      return false;
    } finally {
      setSubmissionDeletePendingId(null);
    }
  }

  async function handleConfirmDeleteSubmission() {
    if (!submissionDeleteConfirmId) {
      return;
    }

    const deleted = await handleDeleteSubmission(submissionDeleteConfirmId);
    if (deleted) {
      setSubmissionDeleteConfirmId(null);
    }
  }

  async function handleCashout() {
    setCashoutError(null);
    setCashoutPending(true);

    try {
      const response = await fetch("/api/whop/payments/cashout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          experienceId,
          whopDevUserToken: devUserToken || undefined,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to cash out.");
      }
      await refreshAdminData();
      setCashoutConfirmOpen(false);
    } catch (error) {
      setCashoutError(getErrorMessage(error, "Failed to cash out."));
    } finally {
      setCashoutPending(false);
    }
  }

  function openAnswerDialog(submissionId: Id<"submissions">) {
    const submission = dashboardSubmissions?.find((item) => item._id === submissionId);
    if (!submission) {
      return;
    }

    if (submission.status !== "answered" && submission.status !== "pending") {
      return;
    }

    if (submission.status === "pending" && !submission.isWithinResponseWindow) {
      return;
    }

    setAnswerError(null);
    setAnswerText(submission.responseText ?? "");
    setAnswerDialogSubmissionId(submissionId);
  }

  async function handleSubmitAnswer(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!viewerUserId || !answerDialogSubmissionId) {
      setAnswerError("Unable to verify your user account. Please refresh and try again.");
      return;
    }

    if (answerText.trim().length < 8) {
      setAnswerError("Response must be at least 8 characters.");
      return;
    }

    setAnswerError(null);
    setAnswerPending(true);

    try {
      await postSubmissionAction(experienceId, {
        action: "answer",
        submissionId: answerDialogSubmissionId,
        responseText: answerText.trim(),
        whopDevUserToken: devUserToken || undefined,
      });

      await refreshAdminData();
      setAnswerDialogSubmissionId(null);
      setAnswerText("");
    } catch (error) {
      setAnswerError(getErrorMessage(error, "Failed to answer submission."));
    } finally {
      setAnswerPending(false);
    }
  }

  const homeHref = `/experiences/${encodeURIComponent(experienceId)}${devUserToken ? `?whop-dev-user-token=${encodeURIComponent(devUserToken)}` : ""}`;

  if (data?.error) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-4 p-4 sm:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access error</CardTitle>
            <CardDescription>{data.error}</CardDescription>
          </CardHeader>
        </Card>
        <div>
          <Button
            nativeButton={false}
            render={<Link href={homeHref} />}
            variant="outline"
            size="sm"
          >
            Back to Experience
          </Button>
        </div>
      </main>
    );
  }

  if (data?.access?.access_level !== "admin") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-4 p-4 sm:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Admin access required</CardTitle>
            <CardDescription>You are being redirected to the experience home.</CardDescription>
          </CardHeader>
        </Card>
        <div>
          <Button
            nativeButton={false}
            render={<Link href={homeHref} />}
            variant="outline"
            size="sm"
          >
            Back to Experience
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-4 p-4 sm:p-6">
      <header className="flex flex-col gap-3 border-b border-zinc-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-1 inline-flex items-center gap-2 border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-primary">
            <Shield className="size-4" />
            Admin Page
          </p>
          {/*<p className="text-xs text-zinc-500">Experience: {experienceId}</p>*/}
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
          <Button
            size="sm"
            variant="outline"
            className={`w-full sm:w-auto ${
              activeView === "metrics"
                ? "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary"
                : "border-zinc-300 text-zinc-700 hover:bg-zinc-100"
            }`}
            disabled={viewTransitionPending}
            onClick={() => {
              startViewTransition(() => {
                setActiveView((view) => (view === "metrics" ? "request-types" : "metrics"));
              });
            }}
          >
            {viewTransitionPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Loading...
              </>
            ) : activeView === "metrics" ? (
              "Manage Requests"
            ) : (
              "Requests"
            )}
          </Button>
          <RequestTypeFormDialog
            dialogOpen={dialogOpen}
            editingRequestTypeId={editingRequestTypeId}
            formValues={formValues}
            fieldErrors={fieldErrors}
            submitError={submitError}
            submitPending={submitPending}
            generatePending={generatePending}
            generateError={generateError}
            onOpenChange={(open) => {
              if (open) {
                setDialogOpen(true);
                return;
              }

              handleCloseDialog();
            }}
            onOpenCreateDialog={openCreateDialog}
            onSubmit={handleSubmit}
            onCloseDialog={handleCloseDialog}
            onGenerateWithAi={handleGenerateWithAi}
            onSetFreePrice={() => {
              setFieldErrors((current) => ({
                ...current,
                price: undefined,
              }));
              setFormValues((current) => ({
                ...current,
                price: "0",
              }));
            }}
            onFormChange={setFormValues}
          />

          <Button
            nativeButton={false}
            render={<Link href={homeHref} />}
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
          >
            Home Page
          </Button>
        </div>
      </header>

      {activeView === "request-types" ? (
        <RequestTypesManagement
          requestTypes={requestTypes}
          pagedRequestTypes={pagedRequestTypes}
          pageSize={pageSize}
          totalPages={totalPages}
          currentPage={currentPage}
          statusError={statusError}
          deleteError={deleteError}
          submitPending={submitPending}
          statusPendingId={statusPendingId}
          deletePendingId={deletePendingId}
          deleteConfirmId={deleteConfirmId}
          onEdit={openEditDialog}
          onToggleStatus={handleToggleRequestTypeStatus}
          onSetDeleteConfirmId={setDeleteConfirmId}
          onSetCurrentPage={setCurrentPage}
          onConfirmDelete={handleConfirmDelete}
        />
      ) : (
        <section className="grid gap-4">
          <MetricsSubmissionsSection
            metrics={metrics}
            dashboardSubmissions={dashboardSubmissions}
            pagedSubmissions={pagedSubmissions}
            submissionsPageSize={submissionsPageSize}
            submissionsPage={submissionsPage}
            totalSubmissionPages={totalSubmissionPages}
            onOpenAnswerDialog={openAnswerDialog}
            onRefundSubmission={handleRefundSubmission}
            onSetSubmissionDeleteConfirmId={setSubmissionDeleteConfirmId}
            onConfirmDeleteSubmission={handleConfirmDeleteSubmission}
            onConfirmCashout={handleCashout}
            cashoutConfirmOpen={cashoutConfirmOpen}
            onSetCashoutConfirmOpen={setCashoutConfirmOpen}
            cashoutPending={cashoutPending}
            refundPendingId={refundPendingId}
            deletePendingId={submissionDeletePendingId}
            submissionDeleteConfirmId={submissionDeleteConfirmId}
            onSetSubmissionsPage={setSubmissionsPage}
          />

          {refundError ? <p className="text-xs text-red-600">{refundError}</p> : null}
          {submissionDeleteError ? (
            <p className="text-xs text-red-600">{submissionDeleteError}</p>
          ) : null}
          {cashoutError ? <p className="text-xs text-red-600">{cashoutError}</p> : null}

          <AnswerSubmissionDialog
            open={Boolean(answerDialogSubmissionId)}
            selectedSubmission={selectedSubmission}
            answerText={answerText}
            answerPending={answerPending}
            answerError={answerError}
            onOpenChange={(open) => {
              if (!open) {
                setAnswerDialogSubmissionId(null);
                setAnswerError(null);
                setAnswerText("");
              }
            }}
            onAnswerTextChange={setAnswerText}
            onSubmitAnswer={handleSubmitAnswer}
            onClose={() => {
              setAnswerDialogSubmissionId(null);
              setAnswerError(null);
              setAnswerText("");
            }}
          />
        </section>
      )}
    </main>
  );
}
