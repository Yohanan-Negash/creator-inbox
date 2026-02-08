"use client";

import { use, useEffect, useMemo, useState } from "react";
import type { SubmitEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { BotIcon, Loader2, Trash2Icon } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { REQUEST_TYPE_DESCRIPTION_MAX_LENGTH } from "@/lib/request-types/constants";

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
  price: z.coerce.number().positive("Price must be greater than 0."),
  responseWindowHours: z.coerce
    .number()
    .int("Response window must be a whole number.")
    .positive("Response window must be greater than 0."),
});

const answerSubmissionSchema = z.object({
  responseText: z
    .string()
    .trim()
    .min(8, "Response must be at least 8 characters.")
    .max(2000, "Response must be at most 2000 characters."),
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
  const [answerResponseText, setAnswerResponseText] = useState("");
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [answerPending, setAnswerPending] = useState(false);

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

  function openAnswerDialog(submissionId: Id<"submissions">) {
    setAnswerDialogSubmissionId(submissionId);
    setAnswerResponseText("");
    setAnswerError(null);
  }

  async function handleAnswerSubmissionSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!answerDialogSubmissionId) {
      return;
    }

    if (!viewerUserId) {
      setAnswerError("Unable to verify your user account. Please refresh and try again.");
      return;
    }

    const parsed = answerSubmissionSchema.safeParse({
      responseText: answerResponseText,
    });

    if (!parsed.success) {
      const flattened = z.flattenError(parsed.error);
      setAnswerError(flattened.fieldErrors.responseText?.[0] ?? "Invalid response.");
      return;
    }

    setAnswerPending(true);
    setAnswerError(null);

    try {
      await answerSubmission({
        submissionId: answerDialogSubmissionId,
        viewerUserId,
        responseText: parsed.data.responseText,
      });
      setAnswerDialogSubmissionId(null);
      setAnswerResponseText("");
    } catch (error) {
      setAnswerError(getErrorMessage(error, "Failed to submit response."));
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
            className={activeView === "metrics" ? "border-primary text-primary" : ""}
            onClick={() =>
              setActiveView((view) =>
                view === "metrics" ? "request-types" : "metrics",
              )
            }
          >
            {activeView === "metrics" ? "Manage Request Types" : "Submissions"}
          </Button>
          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              if (open) {
                setDialogOpen(true);
                return;
              }

              handleCloseDialog();
            }}
          >
            <DialogTrigger render={<Button size="sm" />} onClick={openCreateDialog}>
              Create request type
            </DialogTrigger>
            <DialogContent showCloseButton={false} className="sm:max-w-lg">
              <form className="grid gap-4" onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>
                    {editingRequestTypeId ? "Edit request type" : "Create request type"}
                  </DialogTitle>
                  <DialogDescription>
                    Keep it simple: title, short description, price, and response window.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-1.5">
                  <label className="text-xs font-medium" htmlFor="request-type-title">
                    Title
                  </label>
                  <Input
                    id="request-type-title"
                    value={formValues.title}
                    onChange={(event) =>
                      setFormValues((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    aria-invalid={Boolean(fieldErrors.title)}
                    placeholder="Ask me Anything"
                    disabled={submitPending || generatePending}
                  />
                  {fieldErrors.title ? (
                    <p className="text-xs text-red-600">{fieldErrors.title}</p>
                  ) : null}
                </div>

                <div className="grid gap-1.5">
                  <label className="text-xs font-medium" htmlFor="request-type-description">
                    Description
                  </label>
                  <Textarea
                    id="request-type-description"
                    className="min-h-24"
                    maxLength={REQUEST_TYPE_DESCRIPTION_MAX_LENGTH}
                    value={formValues.description}
                    onChange={(event) =>
                      setFormValues((current) => ({
                        ...current,
                        description: event.target.value.slice(
                          0,
                          REQUEST_TYPE_DESCRIPTION_MAX_LENGTH,
                        ),
                      }))
                    }
                    aria-invalid={Boolean(fieldErrors.description)}
                    placeholder="Ask any question and I will reply with a clear, practical answer."
                    disabled={submitPending || generatePending}
                  />
                  {fieldErrors.description ? (
                    <p className="text-xs text-red-600">{fieldErrors.description}</p>
                  ) : null}
                  <p
                    className={`text-right text-[11px] ${
                      formValues.description.length >= REQUEST_TYPE_DESCRIPTION_MAX_LENGTH
                        ? "text-red-600"
                        : "text-zinc-500"
                    }`}
                  >
                    {formValues.description.length}/{REQUEST_TYPE_DESCRIPTION_MAX_LENGTH}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1.5">
                    <label className="text-xs font-medium" htmlFor="request-type-price">
                      Price (USD)
                    </label>
                    <Input
                      id="request-type-price"
                      type="number"
                      min="1"
                      step="0.01"
                      value={formValues.price}
                      onChange={(event) =>
                        setFormValues((current) => ({
                          ...current,
                          price: event.target.value,
                        }))
                      }
                      aria-invalid={Boolean(fieldErrors.price)}
                      placeholder="5"
                      disabled={submitPending || generatePending}
                    />
                    {fieldErrors.price ? (
                      <p className="text-xs text-red-600">{fieldErrors.price}</p>
                    ) : null}
                  </div>

                  <div className="grid gap-1.5">
                    <label className="text-xs font-medium" htmlFor="request-type-window">
                      Response window (hours)
                    </label>
                    <Input
                      id="request-type-window"
                      type="number"
                      min="1"
                      step="1"
                      value={formValues.responseWindowHours}
                      onChange={(event) =>
                        setFormValues((current) => ({
                          ...current,
                          responseWindowHours: event.target.value,
                        }))
                      }
                      aria-invalid={Boolean(fieldErrors.responseWindowHours)}
                      placeholder="12"
                      disabled={submitPending || generatePending}
                    />
                    {fieldErrors.responseWindowHours ? (
                      <p className="text-xs text-red-600">{fieldErrors.responseWindowHours}</p>
                    ) : null}
                  </div>
                </div>

                <DialogFooter className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                  <div className="flex flex-col gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary"
                      onClick={handleGenerateWithAi}
                      disabled={submitPending || generatePending}
                    >
                      {generatePending ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <BotIcon className="size-4" />
                          Generate with AI
                        </>
                      )}
                    </Button>
                    {generateError ? (
                      <p className="text-xs text-red-600">{generateError}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button type="submit" disabled={submitPending || generatePending}>
                      {submitPending ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          {editingRequestTypeId ? "Saving..." : "Creating..."}
                        </>
                      ) : editingRequestTypeId ? (
                        "Save changes"
                      ) : (
                        "Create"
                      )}
                    </Button>
                    {submitError ? (
                      <p className="text-xs text-red-600">{submitError}</p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100 hover:text-zinc-800"
                    onClick={handleCloseDialog}
                    disabled={submitPending}
                  >
                    Cancel
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

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
        <Card>
          <CardHeader>
            <CardTitle>Request types</CardTitle>
            <CardDescription>
              Create and edit request types. Use the switch to control whether each
              request type is visible to members in your experience. Use the trash
              button to remove it from the list.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {requestTypes === undefined ? (
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Loader2 className="size-4 animate-spin" />
                Loading request types...
              </div>
            ) : null}

            {requestTypes !== undefined && requestTypes.length === 0 ? (
              <p className="text-xs text-zinc-500">No request types yet.</p>
            ) : null}

            {statusError ? <p className="text-xs text-red-600">{statusError}</p> : null}
            {deleteError ? <p className="text-xs text-red-600">{deleteError}</p> : null}

            {requestTypes && requestTypes.length > 0 ? (
              <div className="grid gap-3">
                {pagedRequestTypes.map((item) => {
                  const itemId = String(item._id);
                  const isUpdatingStatus = statusPendingId === itemId;
                  const isDeleting = deletePendingId === itemId;
                  const isRowBusy = isUpdatingStatus || isDeleting;

                  return (
                    <div
                      key={itemId}
                      className="flex flex-col gap-3 border border-zinc-200 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="text-xs text-zinc-500">{item.description}</p>
                        <p className="text-xs text-zinc-500">
                          ${item.price.toFixed(2)} · {item.responseWindowHours}h response
                          window · {item.isActive ? "Active" : "Archived"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            openEditDialog({
                              _id: item._id,
                              title: item.title,
                              description: item.description,
                              price: item.price,
                              responseWindowHours: item.responseWindowHours,
                            })
                          }
                          disabled={submitPending || isRowBusy}
                        >
                          Edit
                        </Button>
                        <div className="flex items-center gap-2">
                          {isRowBusy ? (
                            <Loader2 className="size-4 animate-spin text-zinc-500" />
                          ) : null}
                          <Button
                            size="icon-sm"
                            variant="outline"
                            className="border-primary bg-white text-red-600 hover:bg-primary/5 hover:text-red-700"
                            onClick={() => setDeleteConfirmId(item._id)}
                            disabled={isRowBusy}
                            aria-label={`Delete ${item.title}`}
                          >
                            <Trash2Icon className="size-4" />
                          </Button>
                          <Switch
                            checked={item.isActive}
                            disabled={isRowBusy}
                            onCheckedChange={(checked) =>
                              handleToggleRequestTypeStatus(item._id, checked)
                            }
                            aria-label={`Set ${item.title} visibility for members`}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {requestTypes && requestTypes.length > pageSize ? (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        setCurrentPage((page) => Math.max(1, page - 1));
                      }}
                      className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, index) => {
                    const pageNumber = index + 1;
                    return (
                      <PaginationItem key={pageNumber}>
                        <PaginationLink
                          href="#"
                          isActive={pageNumber === currentPage}
                          onClick={(event) => {
                            event.preventDefault();
                            setCurrentPage(pageNumber);
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
                        setCurrentPage((page) => Math.min(totalPages, page + 1));
                      }}
                      className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            ) : null}

            <AlertDialog open={Boolean(deleteConfirmId)} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
              <AlertDialogContent size="sm">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete request type?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove this request type from your list. This action cannot be undone and is non-recoverable.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={Boolean(deletePendingId)}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-white hover:bg-destructive/90"
                    onClick={handleConfirmDelete}
                    disabled={Boolean(deletePendingId)}
                  >
                    {deletePendingId ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      "Delete"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      ) : (
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
                <CardTitle className="text-amber-600">${(metrics?.moneyAvailable ?? 0).toFixed(2)}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Submissions</CardTitle>
              <CardDescription>
                Click a pending submission row to respond.
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
                      const isPending = submission.status === "pending";
                      return (
                        <TableRow
                          key={String(submission._id)}
                          className={isPending ? "cursor-pointer" : ""}
                          onClick={() => {
                            if (!isPending) {
                              return;
                            }
                            openAnswerDialog(submission._id);
                          }}
                        >
                          <TableCell>{submission.userName}</TableCell>
                          <TableCell>{submission.requestTypeLabel}</TableCell>
                          <TableCell>
                            <span className={`inline-flex rounded-none border px-2 py-0.5 text-[11px] ${getStatusPillClass(submission.status)}`}>
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
                          <TableCell className="text-right">
                            ${submission.amountUsd.toFixed(2)}
                          </TableCell>
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
            </CardContent>
          </Card>

          <Dialog
            open={Boolean(answerDialogSubmissionId)}
            onOpenChange={(open) => {
              if (answerPending) {
                return;
              }
              if (!open) {
                setAnswerDialogSubmissionId(null);
                setAnswerError(null);
                setAnswerResponseText("");
              }
            }}
          >
            <DialogContent className="sm:max-w-md">
              <form className="grid gap-3" onSubmit={handleAnswerSubmissionSubmit}>
                <DialogHeader>
                  <DialogTitle>Respond to submission</DialogTitle>
                  <DialogDescription>
                    {selectedSubmission
                      ? `Reply to ${selectedSubmission.userName} for ${selectedSubmission.requestTypeLabel}.`
                      : "Add a clear response for this submission."}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-1.5">
                  <label className="text-xs font-medium" htmlFor="submission-response-text">
                    Response
                  </label>
                  <Textarea
                    id="submission-response-text"
                    value={answerResponseText}
                    onChange={(event) => setAnswerResponseText(event.target.value)}
                    placeholder="Write a helpful and specific response..."
                    disabled={answerPending}
                    className="min-h-28"
                  />
                  {answerError ? (
                    <p className="text-xs text-red-600">{answerError}</p>
                  ) : null}
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (answerPending) {
                        return;
                      }
                      setAnswerDialogSubmissionId(null);
                      setAnswerError(null);
                      setAnswerResponseText("");
                    }}
                    disabled={answerPending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={answerPending}>
                    {answerPending ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Submit response"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </section>
      )}
    </main>
  );
}
