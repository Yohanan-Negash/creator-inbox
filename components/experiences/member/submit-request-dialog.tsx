import type { SubmitEvent } from "react";
import { Download, Loader2, Paperclip, X } from "lucide-react";
import { WhopCheckoutEmbed } from "@whop/checkout/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type SelectedRequestType = {
  title: string;
  price: number;
  allowAttachments: boolean;
} | null;

type PendingAttachment = {
  token: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  downloadUrl: string | null;
} | null;

type SubmitRequestDialogProps = {
  open: boolean;
  submissionPending: boolean;
  selectedRequestType: SelectedRequestType;
  submissionText: string;
  submissionError: string | null;
  attachmentError: string | null;
  attachmentPending: boolean;
  pendingAttachment: PendingAttachment;
  checkoutSessionId: string | null;
  checkoutReturnUrl: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmissionTextChange: (value: string) => void;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  onAttachmentSelect: (file: File) => void;
  onAttachmentRemove: () => void;
  onCheckoutComplete: (planId: string, receiptId?: string) => void;
  onCheckoutCancel: () => void;
};

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  const kb = sizeBytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

export function SubmitRequestDialog({
  open,
  submissionPending,
  selectedRequestType,
  submissionText,
  submissionError,
  attachmentError,
  attachmentPending,
  pendingAttachment,
  checkoutSessionId,
  checkoutReturnUrl,
  onOpenChange,
  onSubmissionTextChange,
  onSubmit,
  onCancel,
  onAttachmentSelect,
  onAttachmentRemove,
  onCheckoutComplete,
  onCheckoutCancel,
}: SubmitRequestDialogProps) {
  const isCheckoutPhase = Boolean(checkoutSessionId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        {isCheckoutPhase ? (
          <div className="grid gap-3">
            <DialogHeader>
              <DialogTitle>Complete payment</DialogTitle>
              <DialogDescription>
                {selectedRequestType
                  ? `${selectedRequestType.title} — ${
                      selectedRequestType.price === 0
                        ? "Free"
                        : `$${selectedRequestType.price.toFixed(2)}`
                    }`
                  : "Complete your payment to submit your request."}
              </DialogDescription>
            </DialogHeader>

            {submissionPending ? (
                <div className="flex min-h-[200px] items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="size-6 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Confirming payment...</p>
                  </div>
                </div>
              ) : (
                <div className="min-h-[300px]">
                  <WhopCheckoutEmbed
                    sessionId={checkoutSessionId!}
                    theme="system"
                    returnUrl={checkoutReturnUrl ?? undefined}
                    onComplete={(planId, receiptId) => onCheckoutComplete(planId, receiptId)}
                  fallback={
                    <div className="flex min-h-[200px] items-center justify-center">
                      <Loader2 className="size-6 animate-spin text-primary" />
                    </div>
                  }
                />
              </div>
            )}

            {submissionError ? <p className="text-xs text-destructive">{submissionError}</p> : null}

            {!submissionPending ? (
              <DialogFooter>
                <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onCheckoutCancel}>
                  Back
                </Button>
              </DialogFooter>
            ) : null}
          </div>
        ) : (
          <form className="grid gap-3" onSubmit={onSubmit}>
            <DialogHeader>
              <DialogTitle>Submit request</DialogTitle>
              <DialogDescription>
                Add clear details so the creator can help quickly.
              </DialogDescription>
            </DialogHeader>

            {selectedRequestType ? (
              <div className="rounded-md border border-border p-2 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">{selectedRequestType.title}</p>
                <p>
                  {selectedRequestType.price === 0
                    ? "This request is free and will be submitted instantly."
                    : `$${selectedRequestType.price.toFixed(2)} charge will be processed on submit`}
                </p>
              </div>
            ) : null}

            <div className="grid gap-1.5">
              <label className="text-xs font-medium" htmlFor="submission-text">
                What do you need help with?
              </label>
              <Textarea
                id="submission-text"
                value={submissionText}
                onChange={(event) => onSubmissionTextChange(event.target.value)}
                placeholder="Share context, your goal, and any constraints..."
                className="min-h-28"
                disabled={submissionPending}
              />
              <p className="text-[11px] text-muted-foreground">Minimum 5 characters.</p>
              {submissionError ? <p className="text-xs text-destructive">{submissionError}</p> : null}
            </div>

            {selectedRequestType?.allowAttachments ? (
              <div className="grid gap-1.5">
                <label className="text-xs font-medium" htmlFor="submission-attachment">
                  Attachment (optional)
                </label>
                {!pendingAttachment ? (
                  <input
                    id="submission-attachment"
                    type="file"
                    accept=".pdf,image/jpeg,image/png"
                    disabled={submissionPending || attachmentPending}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        onAttachmentSelect(file);
                      }
                      event.currentTarget.value = "";
                    }}
                    className="text-xs file:mr-2 file:border file:border-border file:bg-background file:px-2 file:py-1 file:text-xs"
                  />
                ) : (
                  <div className="flex items-center justify-between gap-2 border border-border p-2 text-xs text-foreground">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{pendingAttachment.fileName}</p>
                      <p className="text-muted-foreground">{formatFileSize(pendingAttachment.sizeBytes)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {pendingAttachment.downloadUrl ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          nativeButton={false}
                          render={<a href={pendingAttachment.downloadUrl} target="_blank" rel="noreferrer" />}
                          aria-label="Download attachment"
                        >
                          <Download className="size-4" />
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={onAttachmentRemove}
                        disabled={submissionPending || attachmentPending}
                        aria-label="Remove attachment"
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground">PDF, JPG, PNG up to 10MB. 1 file max.</p>
                {attachmentPending ? (
                  <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Loader2 className="size-3 animate-spin" />
                    Uploading attachment...
                  </p>
                ) : null}
                {attachmentError ? <p className="text-xs text-destructive">{attachmentError}</p> : null}
              </div>
            ) : (
              <p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Paperclip className="size-3" />
                Attachments are disabled for this request type.
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={onCancel}
                disabled={submissionPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={submissionPending || submissionText.trim().length < 5}
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
        )}
      </DialogContent>
    </Dialog>
  );
}
