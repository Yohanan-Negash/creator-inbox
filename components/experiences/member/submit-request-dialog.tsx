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

type SelectedRequestType = {
  title: string;
  price: number;
} | null;

type SubmitRequestDialogProps = {
  open: boolean;
  submissionPending: boolean;
  selectedRequestType: SelectedRequestType;
  submissionText: string;
  submissionError: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmissionTextChange: (value: string) => void;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

export function SubmitRequestDialog({
  open,
  submissionPending,
  selectedRequestType,
  submissionText,
  submissionError,
  onOpenChange,
  onSubmissionTextChange,
  onSubmit,
  onCancel,
}: SubmitRequestDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form className="grid gap-3" onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Submit request</DialogTitle>
            <DialogDescription>
              Payment successful (simulated). Add a clear description so the creator can help
              quickly.
            </DialogDescription>
          </DialogHeader>

          {selectedRequestType ? (
            <div className="rounded-none border border-zinc-200 p-2 text-xs text-zinc-600">
              <p className="font-medium text-zinc-800">{selectedRequestType.title}</p>
              <p>${selectedRequestType.price.toFixed(2)} charged (simulated)</p>
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
            {submissionError ? <p className="text-xs text-red-600">{submissionError}</p> : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={submissionPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submissionPending || submissionText.trim().length < 8}>
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
      </DialogContent>
    </Dialog>
  );
}
