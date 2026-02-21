import type { Id } from "@/convex/_generated/dataModel";
import { Loader2, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";

type RequestTypeItem = {
  _id: Id<"requestTypes">;
  title: string;
  description: string;
  price: number;
  responseWindowHours: number;
  allowAttachments: boolean;
  isActive: boolean;
};

type RequestTypesManagementProps = {
  requestTypes: RequestTypeItem[] | undefined;
  pagedRequestTypes: RequestTypeItem[];
  pageSize: number;
  totalPages: number;
  currentPage: number;
  statusError: string | null;
  deleteError: string | null;
  submitPending: boolean;
  statusPendingId: string | null;
  deletePendingId: string | null;
  deleteConfirmId: Id<"requestTypes"> | null;
  onEdit: (item: RequestTypeItem) => void;
  onToggleStatus: (requestTypeId: Id<"requestTypes">, checked: boolean) => void;
  onSetDeleteConfirmId: (id: Id<"requestTypes"> | null) => void;
  onSetCurrentPage: (page: number) => void;
  onConfirmDelete: () => void;
};

export function RequestTypesManagement({
  requestTypes,
  pagedRequestTypes,
  pageSize,
  totalPages,
  currentPage,
  statusError,
  deleteError,
  submitPending,
  statusPendingId,
  deletePendingId,
  deleteConfirmId,
  onEdit,
  onToggleStatus,
  onSetDeleteConfirmId,
  onSetCurrentPage,
  onConfirmDelete,
}: RequestTypesManagementProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Requests</CardTitle>
        <CardDescription>
          Create and edit requests. Use the switch to control whether each request is visible to
          members in your experience. Use the trash button to remove it from the list.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {requestTypes === undefined ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading requests...
          </div>
        ) : null}

        {requestTypes !== undefined && requestTypes.length === 0 ? (
          <p className="text-xs text-muted-foreground">No requests yet.</p>
        ) : null}

        {statusError ? <p className="text-xs text-destructive">{statusError}</p> : null}
        {deleteError ? <p className="text-xs text-destructive">{deleteError}</p> : null}

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
                  className="flex flex-col gap-3 border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.price === 0 ? (
                        <Badge variant="secondary" className="mr-1 align-middle">
                          Free
                        </Badge>
                      ) : (
                        `$${item.price.toFixed(2)}`
                      )} {item.responseWindowHours}h response window · {" "}
                      {item.isActive ? "Active" : "Archived"}
                      {item.allowAttachments ? " · Attachments enabled" : ""}
                    </p>
                  </div>

                  <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => onEdit(item)}
                      disabled={submitPending || isRowBusy}
                    >
                      Edit
                    </Button>
                    <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-start">
                      {isRowBusy ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon-sm"
                          variant="outline"
                          className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => onSetDeleteConfirmId(item._id)}
                          disabled={isRowBusy}
                          aria-label={`Delete ${item.title}`}
                        >
                          <Trash2Icon className="size-4" />
                        </Button>
                        <Switch
                          checked={item.isActive}
                          disabled={isRowBusy}
                          onCheckedChange={(checked) => onToggleStatus(item._id, checked)}
                          aria-label={`Set ${item.title} visibility for members`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {requestTypes && requestTypes.length > pageSize ? (
          <Pagination>
            <PaginationContent className="flex-wrap justify-center">
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    onSetCurrentPage(Math.max(1, currentPage - 1));
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
                        onSetCurrentPage(pageNumber);
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
                    onSetCurrentPage(Math.min(totalPages, currentPage + 1));
                  }}
                  className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        ) : null}

        <AlertDialog open={Boolean(deleteConfirmId)} onOpenChange={(open) => !open && onSetDeleteConfirmId(null)}>
          <AlertDialogContent size="sm">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete request?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove this request from your list. This action cannot be
                undone and is non-recoverable.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={Boolean(deletePendingId)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={onConfirmDelete}
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
  );
}
