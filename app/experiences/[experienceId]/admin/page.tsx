"use client";

import { use, useEffect, useMemo, useState } from "react";
import type { SubmitEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { REQUEST_TYPE_DESCRIPTION_MAX_LENGTH } from "@/lib/request-types/constants";
import { RequestTypeFormDialog } from "@/components/experiences/admin/request-type-form-dialog";
import { RequestTypesManagement } from "@/components/experiences/admin/request-types-management";
import { MetricsSubmissionsSection } from "@/components/experiences/admin/metrics-submissions-section";
import { AnswerSubmissionDialog } from "@/components/experiences/admin/answer-submission-dialog";

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

type RequestTypeFormValues = {
  title: string;
  description: string;
  price: string;
  responseWindowHours: string;
};

type RequestTypeFieldErrors = Partial<Record<keyof RequestTypeFormValues, string>>;

type GenerateRequestTypesResponse = {
  rejected: boolean;
  rejectionReason: string;
  requestTypes: Array<{
    title: string;
    description: string;
    price: number;
    responseWindowHours: number;
  }>;
  error?: string;
};

type AdminView = "request-types" | "metrics";

const requestTypeFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
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
    .positive("Price must be greater than 0."),
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

export default function AdminPage({
  params,
}: {
  params: Promise<{ experienceId: string }>;
}) {
  const { experienceId } = use(params);
  const searchParams = useSearchParams();
  const devUserToken = searchParams.get("whop-dev-user-token") ?? "";

  const [data, setData] = useState<WhopResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<AdminView>("metrics");
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
  const [cashoutPending, setCashoutPending] = useState(false);
  const [cashoutError, setCashoutError] = useState<string | null>(null);

  const viewerUserId = data?.user?.id ?? "";

  const requestTypes = useQuery(
    api.requestTypes.listByExperienceCreator,
    data?.access?.access_level === "admin" && viewerUserId
      ? { experienceId, viewerUserId }
      : "skip",
  );

  const dashboardSubmissions = useQuery(
    api.submissions.listForAdminDashboard,
    data?.access?.access_level === "admin" && viewerUserId
      ? { experienceId, viewerUserId }
      : "skip",
  );

  const metrics = useQuery(
    api.submissions.getAdminMetrics,
    data?.access?.access_level === "admin" && viewerUserId
      ? { experienceId, viewerUserId }
      : "skip",
  );

  const createRequestType = useMutation(api.requestTypes.createRequestType);
  const updateRequestType = useMutation(api.requestTypes.updateRequestType);
  const archiveRequestType = useMutation(api.requestTypes.archiveRequestType);
  const unarchiveRequestType = useMutation(api.requestTypes.unarchiveRequestType);
  const softDeleteRequestType = useMutation(api.requestTypes.softDeleteRequestType);
  const answerSubmission = useMutation(api.submissions.answerSubmission);
  const deleteSubmissionForCreator = useMutation(api.submissions.deleteSubmissionForCreator);

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

  const submissionsPageSize = 8;
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
        setData({ error: "Failed to load access details." });
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
          price: Number(formValues.price) > 0 ? Number(formValues.price) : undefined,
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
          intent: "Generate a valuable paid request type for this creator.",
          existingRequestTypes: draftExisting,
          whopDevUserToken: devUserToken || undefined,
        }),
      });

      const payload = (await response.json()) as GenerateRequestTypesResponse;

      if (!response.ok) {
        throw new Error(payload.error || "Failed to generate request type.");
      }

      if (payload.rejected || payload.requestTypes.length === 0) {
        throw new Error(payload.rejectionReason || "Could not generate request type.");
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

      setGenerateError(getErrorMessage(error, "Failed to generate request type."));
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
      if (editingRequestTypeId) {
        await updateRequestType({
          requestTypeId: editingRequestTypeId,
          viewerUserId,
          title: parsed.data.title,
          description: parsed.data.description,
          price: parsed.data.price,
          responseWindowHours: parsed.data.responseWindowHours,
        });
      } else {
        await createRequestType({
          experienceId,
          viewerUserId,
          title: parsed.data.title,
          description: parsed.data.description,
          price: parsed.data.price,
          responseWindowHours: parsed.data.responseWindowHours,
        });
      }

      setDialogOpen(false);
      resetFormState();
    } catch (error) {
      setSubmitError(
        getErrorMessage(
          error,
          editingRequestTypeId
            ? "Failed to update request type."
            : "Failed to create request type.",
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
      if (nextIsActive) {
        await unarchiveRequestType({
          requestTypeId,
          viewerUserId,
        });
      } else {
        await archiveRequestType({
          requestTypeId,
          viewerUserId,
        });
      }
    } catch (error) {
      setStatusError(getErrorMessage(error, "Failed to update request type status."));
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
      await softDeleteRequestType({ requestTypeId, viewerUserId });
      return true;
    } catch (error) {
      setDeleteError(getErrorMessage(error, "Failed to delete request type."));
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
      return;
    }

    setSubmissionDeleteError(null);
    setSubmissionDeletePendingId(submissionId);

    try {
      await deleteSubmissionForCreator({
        submissionId,
        viewerUserId,
      });
    } catch (error) {
      setSubmissionDeleteError(getErrorMessage(error, "Failed to delete submission."));
    } finally {
      setSubmissionDeletePendingId(null);
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
      await answerSubmission({
        submissionId: answerDialogSubmissionId,
        viewerUserId,
        responseText: answerText.trim(),
      });
      setAnswerDialogSubmissionId(null);
      setAnswerText("");
    } catch (error) {
      setAnswerError(getErrorMessage(error, "Failed to answer submission."));
    } finally {
      setAnswerPending(false);
    }
  }

  const homeHref = `/experiences/${encodeURIComponent(experienceId)}${devUserToken ? `?whop-dev-user-token=${encodeURIComponent(devUserToken)}` : ""}`;

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-zinc-500">Loading admin access...</p>
        </div>
      </main>
    );
  }

  if (data?.error || data?.access?.access_level !== "admin") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-4 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Unauthorized</CardTitle>
            <CardDescription>
              Only experience admins can view this page.
            </CardDescription>
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
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-4 p-6">
      <header className="flex items-center justify-between border-b border-zinc-200 pb-3">
        <div>
          <h1 className="text-xl font-semibold">Admin</h1>
          <p className="text-xs text-zinc-500">Experience: {experienceId}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className={
              activeView === "metrics"
                ? "border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800"
                : "border-zinc-300 text-zinc-700 hover:bg-zinc-100"
            }
            onClick={() =>
              setActiveView((view) =>
                view === "metrics" ? "request-types" : "metrics",
              )
            }
          >
            {activeView === "metrics" ? "Manage Request Types" : "Submissions"}
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
            onFormChange={setFormValues}
          />

          <Button
            nativeButton={false}
            render={<Link href={homeHref} />}
            variant="outline"
            size="sm"
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
            onDeleteSubmission={handleDeleteSubmission}
            onCashout={handleCashout}
            cashoutPending={cashoutPending}
            refundPendingId={refundPendingId}
            deletePendingId={submissionDeletePendingId}
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
