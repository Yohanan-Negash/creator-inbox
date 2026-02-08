import type { SubmitEvent } from "react";
import { Loader2 } from "lucide-react";
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
} | null;

type AnswerSubmissionDialogProps = {
  open: boolean;
  answerPending: boolean;
  selectedSubmission: SelectedSubmission;
  answerResponseText: string;
  answerError: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
  onAnswerResponseTextChange: (value: string) => void;
  onCancel: () => void;
};

export function AnswerSubmissionDialog({
  open,
  answerPending,
  selectedSubmission,
  answerResponseText,
  answerError,
  onOpenChange,
  onSubmit,
  onAnswerResponseTextChange,
  onCancel,
}: AnswerSubmissionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form className="grid gap-3" onSubmit={onSubmit}>
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
              onChange={(event) => onAnswerResponseTextChange(event.target.value)}
              placeholder="Write a helpful and specific response..."
              disabled={answerPending}
              className="min-h-28"
            />
            {answerError ? <p className="text-xs text-red-600">{answerError}</p> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel} disabled={answerPending}>
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
  );
}
