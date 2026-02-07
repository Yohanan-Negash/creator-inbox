"use client";

import { FormEvent, use, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

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

const requestTypeFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  description: z.string().trim().min(1, "Description is required."),
  price: z.coerce.number().positive("Price must be greater than 0."),
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRequestTypeId, setEditingRequestTypeId] = useState<Id<"requestTypes"> | null>(null);
  const [formValues, setFormValues] = useState<RequestTypeFormValues>(defaultFormValues);
  const [fieldErrors, setFieldErrors] = useState<RequestTypeFieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitPending, setSubmitPending] = useState(false);
  const [statusPendingId, setStatusPendingId] = useState<string | null>(null);
  const [statusPendingAction, setStatusPendingAction] = useState<"archive" | "unarchive" | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const viewerUserId = data?.user?.id ?? "";

  const requestTypes = useQuery(
    api.requestTypes.listByExperienceCreator,
    data?.access?.access_level === "admin" && viewerUserId
      ? { experienceId, viewerUserId }
      : "skip",
  );

  const createRequestType = useMutation(api.requestTypes.createRequestType);
  const updateRequestType = useMutation(api.requestTypes.updateRequestType);
  const archiveRequestType = useMutation(api.requestTypes.archiveRequestType);
  const unarchiveRequestType = useMutation(api.requestTypes.unarchiveRequestType);

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

  function resetFormState() {
    setFormValues(defaultFormValues);
    setFieldErrors({});
    setSubmitError(null);
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!viewerUserId) {
      setSubmitError("Unable to verify your user account. Please refresh and try again.");
      return;
    }

    setSubmitError(null);
    setFieldErrors({});

    const parsed = requestTypeFormSchema.safeParse(formValues);
    if (!parsed.success) {
      setFieldErrors({
        title: parsed.error.flatten().fieldErrors.title?.[0],
        description: parsed.error.flatten().fieldErrors.description?.[0],
        price: parsed.error.flatten().fieldErrors.price?.[0],
        responseWindowHours: parsed.error.flatten().fieldErrors.responseWindowHours?.[0],
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
    isCurrentlyActive: boolean,
  ) {
    if (!viewerUserId) {
      setStatusError("Unable to verify your user account. Please refresh and try again.");
      return;
    }

    const action = isCurrentlyActive ? "archive" : "unarchive";
    setStatusError(null);
    setStatusPendingId(requestTypeId);
    setStatusPendingAction(action);

    try {
      if (isCurrentlyActive) {
        await archiveRequestType({
          requestTypeId,
          viewerUserId,
        });
      } else {
        await unarchiveRequestType({
          requestTypeId,
          viewerUserId,
        });
      }
    } catch (error) {
      setStatusError(getErrorMessage(error, "Failed to update request type status."));
    } finally {
      setStatusPendingId(null);
      setStatusPendingAction(null);
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
          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open && !submitPending) {
                resetFormState();
              }
            }}
          >
            <DialogTrigger render={<Button size="sm" />} onClick={openCreateDialog}>
              Create request type
            </DialogTrigger>
            <DialogContent>
              <form className="grid gap-3" onSubmit={handleSubmit}>
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
                    placeholder="1:1 Strategy Call"
                    disabled={submitPending}
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
                    value={formValues.description}
                    onChange={(event) =>
                      setFormValues((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    aria-invalid={Boolean(fieldErrors.description)}
                    placeholder="Recorded feedback with clear action items."
                    disabled={submitPending}
                  />
                  {fieldErrors.description ? (
                    <p className="text-xs text-red-600">{fieldErrors.description}</p>
                  ) : null}
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
                      placeholder="49"
                      disabled={submitPending}
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
                      placeholder="48"
                      disabled={submitPending}
                    />
                    {fieldErrors.responseWindowHours ? (
                      <p className="text-xs text-red-600">{fieldErrors.responseWindowHours}</p>
                    ) : null}
                  </div>
                </div>

                <DialogFooter className="items-end">
                  <DialogClose disabled={submitPending}>Cancel</DialogClose>
                  <div className="flex min-w-40 flex-col gap-1">
                    <Button type="submit" disabled={submitPending}>
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
            Go to Home
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Request types</CardTitle>
          <CardDescription>
            Create, edit, and archive the request types shown in your experience.
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

          {requestTypes && requestTypes.length > 0 ? (
            <div className="grid gap-3">
              {requestTypes.map((item) => {
                const itemId = String(item._id);
                const isUpdatingStatus = statusPendingId === itemId;

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
                        disabled={submitPending || isUpdatingStatus}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleToggleRequestTypeStatus(item._id, item.isActive)
                        }
                        disabled={isUpdatingStatus}
                      >
                        {isUpdatingStatus ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            {statusPendingAction === "archive"
                              ? "Archiving..."
                              : "Unarchiving..."}
                          </>
                        ) : (
                          item.isActive ? "Archive" : "Unarchive"
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
