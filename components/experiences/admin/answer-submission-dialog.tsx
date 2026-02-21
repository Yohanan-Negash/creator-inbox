import type { SubmitEvent } from "react";
import { Download } from "lucide-react";
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

type SelectedSubmission = {
  _id: string;
  userName: string;
  requestTypeLabel: string;
  submissionText: string;
  status: "pending" | "answered" | "expired" | "refunded";
  isWithinResponseWindow: boolean;
  attachment?: {
    fileName: string;
    contentType: string;
    sizeBytes: number;
    downloadUrl: string | null;
  } | null;
  responseText?: string;
} | null;

type AnswerSubmissionDialogProps = {
  experienceId: string;
  devUserToken: string;
  open: boolean;
  selectedSubmission: SelectedSubmission;
  answerText: string;
  answerPending: boolean;
  answerError: string | null;
  onOpenChange: (open: boolean) => void;
  onAnswerTextChange: (value: string) => void;
  onSubmitAnswer: (event: SubmitEvent<HTMLFormElement>) => void;
  onClose: () => void;
};

const MIN_RESPONSE_CHARACTERS = 4;

export function AnswerSubmissionDialog({
  experienceId,
  devUserToken,
  open,
  selectedSubmission,
  answerText,
  answerPending,
  answerError,
  onOpenChange,
  onAnswerTextChange,
  onSubmitAnswer,
  onClose,
}: AnswerSubmissionDialogProps) {
  const canAnswer =
    selectedSubmission?.status === "pending" && selectedSubmission?.isWithinResponseWindow;
  const downloadHref = selectedSubmission
    ? `/api/whop/experiences/${encodeURIComponent(experienceId)}/submissions/${encodeURIComponent(
        selectedSubmission._id,
      )}/attachment/download${
        devUserToken ? `?whop-dev-user-token=${encodeURIComponent(devUserToken)}` : ""
      }`
    : "#";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <form className="grid gap-3" onSubmit={onSubmitAnswer}>
          <DialogHeader>
            <DialogTitle>{canAnswer ? "Answer submission" : "Submission response"}</DialogTitle>
            <DialogDescription>
              {selectedSubmission
                ? `${selectedSubmission.userName} · ${selectedSubmission.requestTypeLabel}`
                : "View the response for this submission."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-1.5">
            <p className="text-xs font-medium">Member request</p>
            <div className="min-h-20 whitespace-pre-wrap rounded-none border border-border p-3 text-xs text-foreground">
              {selectedSubmission?.submissionText?.trim() || "No submission text available."}
            </div>
            {selectedSubmission?.attachment ? (
              <div className="flex items-center justify-between gap-2 border border-border p-2 text-xs text-foreground">
                <div className="min-w-0">
                  <p className="truncate font-medium">{selectedSubmission.attachment.fileName}</p>
                  <p className="text-muted-foreground">Attachment</p>
                </div>
                {selectedSubmission.attachment.downloadUrl ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    nativeButton={false}
                    render={
                      <a
                        href={downloadHref}
                      />
                    }
                  >
                    <Download className="size-4" />
                    Download
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="grid gap-1.5">
            <p className="text-xs font-medium">Creator response</p>
            {canAnswer ? (
              <>
                <Textarea
                  value={answerText}
                  onChange={(event) => onAnswerTextChange(event.target.value)}
                  className="min-h-28"
                  placeholder="Write a clear response for this submission..."
                  disabled={answerPending}
                />
                <p className="text-[11px] text-muted-foreground">
                  Minimum {MIN_RESPONSE_CHARACTERS} characters.
                </p>
              </>
            ) : (
              <div className="min-h-28 whitespace-pre-wrap rounded-none border border-border p-3 text-xs text-foreground">
                {selectedSubmission?.responseText?.trim() || "No response available."}
              </div>
            )}
            {answerError ? <p className="text-xs text-destructive">{answerError}</p> : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onClose}>
              Close
            </Button>
            {canAnswer ? (
              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={answerPending || answerText.trim().length < MIN_RESPONSE_CHARACTERS}
              >
                {answerPending ? "Sending..." : "Send response"}
              </Button>
            ) : null}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
