import type { SubmitEvent } from "react";
import { Loader2 } from "lucide-react";
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
} | null;

type SubmitRequestDialogProps = {
  open: boolean;
  submissionPending: boolean;
  selectedRequestType: SelectedRequestType;
  submissionText: string;
  submissionError: string | null;
  checkoutSessionId: string | null;
  checkoutReturnUrl: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmissionTextChange: (value: string) => void;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  onCheckoutComplete: (planId: string, receiptId?: string) => void;
  onCheckoutCancel: () => void;
};

export function SubmitRequestDialog({
  open,
  submissionPending,
  selectedRequestType,
  submissionText,
  submissionError,
  checkoutSessionId,
  checkoutReturnUrl,
  onOpenChange,
  onSubmissionTextChange,
  onSubmit,
  onCancel,
  onCheckoutComplete,
  onCheckoutCancel,
}: SubmitRequestDialogProps) {
  const isCheckoutPhase = Boolean(checkoutSessionId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={isCheckoutPhase ? "sm:max-w-md max-h-[90vh] overflow-y-auto" : "sm:max-w-md"}>
        {isCheckoutPhase ? (
          <div className="grid gap-3">
            <DialogHeader>
              <DialogTitle>Complete payment</DialogTitle>
              <DialogDescription>
                {selectedRequestType
                  ? `${selectedRequestType.title} — $${selectedRequestType.price.toFixed(2)}`
                  : "Complete your payment to submit your request."}
              </DialogDescription>
            </DialogHeader>

            {submissionPending ? (
              <div className="flex min-h-[200px] items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="size-6 animate-spin text-primary" />
                  <p className="text-sm text-zinc-500">Confirming payment...</p>
                </div>
              </div>
            ) : (
              <div className="min-h-[300px]">
                <WhopCheckoutEmbed
                  sessionId={checkoutSessionId!}
                  theme="dark"
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

            {submissionError ? <p className="text-xs text-red-600">{submissionError}</p> : null}

            {!submissionPending ? (
              <DialogFooter>
                <Button type="button" variant="outline" onClick={onCheckoutCancel}>
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
                Payment is required before submission is created. Add clear details so the creator
                can help quickly.
              </DialogDescription>
            </DialogHeader>

            {selectedRequestType ? (
              <div className="rounded-none border border-zinc-200 p-2 text-xs text-zinc-600">
                <p className="font-medium text-zinc-800">{selectedRequestType.title}</p>
                <p>${selectedRequestType.price.toFixed(2)} charge will be processed on submit</p>
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
        )}
      </DialogContent>
    </Dialog>
  );
}
