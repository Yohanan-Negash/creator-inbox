import type { SubmitEvent } from "react";
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
  userName: string;
  requestTypeLabel: string;
  submissionText: string;
  status: "pending" | "answered" | "expired" | "refunded";
  isWithinResponseWindow: boolean;
  responseText?: string;
} | null;

type AnswerSubmissionDialogProps = {
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

export function AnswerSubmissionDialog({
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
            <div className="min-h-20 whitespace-pre-wrap rounded-none border border-zinc-200 p-3 text-xs text-zinc-700">
              {selectedSubmission?.submissionText?.trim() || "No submission text available."}
            </div>
          </div>

          <div className="grid gap-1.5">
            <p className="text-xs font-medium">Creator response</p>
            {canAnswer ? (
              <Textarea
                value={answerText}
                onChange={(event) => onAnswerTextChange(event.target.value)}
                className="min-h-28"
                placeholder="Write a clear response for this submission..."
                disabled={answerPending}
              />
            ) : (
              <div className="min-h-28 whitespace-pre-wrap rounded-none border border-zinc-200 p-3 text-xs text-zinc-700">
                {selectedSubmission?.responseText?.trim() || "No response available."}
              </div>
            )}
            {answerError ? <p className="text-xs text-red-600">{answerError}</p> : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onClose}>
              Close
            </Button>
            {canAnswer ? (
              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={answerPending || answerText.trim().length < 8}
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
