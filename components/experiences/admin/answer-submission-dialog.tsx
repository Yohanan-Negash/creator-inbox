import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type SelectedSubmission = {
  userName: string;
  requestTypeLabel: string;
  responseText?: string;
} | null;

type AnswerSubmissionDialogProps = {
  open: boolean;
  selectedSubmission: SelectedSubmission;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
};

export function AnswerSubmissionDialog({
  open,
  selectedSubmission,
  onOpenChange,
  onClose,
}: AnswerSubmissionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <div className="grid gap-3">
          <DialogHeader>
            <DialogTitle>Submission response</DialogTitle>
            <DialogDescription>
              {selectedSubmission
                ? `${selectedSubmission.userName} · ${selectedSubmission.requestTypeLabel}`
                : "View the response for this submission."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <p className="text-xs font-medium">Creator response</p>
            <div className="min-h-28 whitespace-pre-wrap rounded-none border border-zinc-200 p-3 text-xs text-zinc-700">
              {selectedSubmission?.responseText?.trim() || "No response available."}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
