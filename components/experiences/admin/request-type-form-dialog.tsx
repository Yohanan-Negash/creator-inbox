import type { SubmitEvent } from "react";
import { BotIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  REQUEST_TYPE_DESCRIPTION_MAX_LENGTH,
  REQUEST_TYPE_TITLE_MAX_LENGTH,
} from "@/lib/request-types/constants";

const responseWindowOptions = [1, 2, 4, 6, 12, 24, 48, 72, 168];

type RequestTypeFormValues = {
  title: string;
  description: string;
  price: string;
  responseWindowHours: string;
};

type RequestTypeFieldErrors = Partial<Record<keyof RequestTypeFormValues, string>>;

type RequestTypeFormDialogProps = {
  dialogOpen: boolean;
  editingRequestTypeId: string | null;
  formValues: RequestTypeFormValues;
  fieldErrors: RequestTypeFieldErrors;
  submitError: string | null;
  submitPending: boolean;
  generatePending: boolean;
  generateError: string | null;
  onOpenChange: (open: boolean) => void;
  onOpenCreateDialog: () => void;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
  onCloseDialog: () => void;
  onGenerateWithAi: () => void;
  onSetFreePrice: () => void;
  onFormChange: (next: RequestTypeFormValues) => void;
};

export function RequestTypeFormDialog({
  dialogOpen,
  editingRequestTypeId,
  formValues,
  fieldErrors,
  submitError,
  submitPending,
  generatePending,
  generateError,
  onOpenChange,
  onOpenCreateDialog,
  onSubmit,
  onCloseDialog,
  onGenerateWithAi,
  onSetFreePrice,
  onFormChange,
}: RequestTypeFormDialogProps) {
  return (
    <Dialog open={dialogOpen} onOpenChange={onOpenChange}>
        <DialogTrigger
          render={
            <Button
              size="sm"
              className="w-full bg-primary/90 text-primary-foreground hover:bg-primary hover:text-primary-foreground sm:w-auto"
            />
          }
          onClick={onOpenCreateDialog}
        >
          Create request
        </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
      >
        <form className="grid gap-4" onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>{editingRequestTypeId ? "Edit request" : "Create request"}</DialogTitle>
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
              maxLength={REQUEST_TYPE_TITLE_MAX_LENGTH}
              value={formValues.title}
              onChange={(event) =>
                onFormChange({
                  ...formValues,
                  title: event.target.value.slice(0, REQUEST_TYPE_TITLE_MAX_LENGTH),
                })
              }
              aria-invalid={Boolean(fieldErrors.title)}
              placeholder="Ask me Anything"
              disabled={submitPending || generatePending}
            />
            {fieldErrors.title ? <p className="text-xs text-red-600">{fieldErrors.title}</p> : null}
            <p className="text-right text-[11px] text-zinc-500">
              {formValues.title.length}/{REQUEST_TYPE_TITLE_MAX_LENGTH}
            </p>
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
                onFormChange({
                  ...formValues,
                  description: event.target.value.slice(0, REQUEST_TYPE_DESCRIPTION_MAX_LENGTH),
                })
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

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label className="text-xs font-medium" htmlFor="request-type-price">
                Price (USD)
              </label>
              <Input
                id="request-type-price"
                type="number"
                min="0"
                step="1"
                value={formValues.price}
                onChange={(event) =>
                  onFormChange({
                    ...formValues,
                    price: event.target.value,
                  })
                }
                aria-invalid={Boolean(fieldErrors.price)}
                placeholder="0 for free"
                disabled={submitPending || generatePending}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="justify-start"
                onClick={onSetFreePrice}
                disabled={submitPending || generatePending}
              >
                Make this free
              </Button>
              <p className="text-[11px] text-zinc-500">Set price to $0 so members can ask without payment.</p>
              {fieldErrors.price ? <p className="text-xs text-red-600">{fieldErrors.price}</p> : null}
            </div>

            <div className="grid gap-1.5">
              <label className="text-xs font-medium" htmlFor="request-type-window">
                Response window (hours)
              </label>
              <Select
                value={formValues.responseWindowHours}
                onValueChange={(value) =>
                  onFormChange({
                    ...formValues,
                    responseWindowHours: value ?? "",
                  })
                }
                disabled={submitPending || generatePending}
              >
                <SelectTrigger
                  id="request-type-window"
                  aria-invalid={Boolean(fieldErrors.responseWindowHours)}
                >
                  <SelectValue placeholder="Select response window" />
                </SelectTrigger>
                <SelectContent>
                  {responseWindowOptions.map((hours) => (
                    <SelectItem key={hours} value={String(hours)}>
                      {hours} hours
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                className="w-full border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary sm:w-auto"
                onClick={onGenerateWithAi}
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
              {generateError ? <p className="text-xs text-red-600">{generateError}</p> : null}
            </div>
            <div className="flex flex-col gap-1">
              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={submitPending || generatePending}
              >
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
              {submitError ? <p className="text-xs text-red-600">{submitError}</p> : null}
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full border-red-300 bg-white text-red-600 hover:bg-red-50 hover:text-red-700 sm:w-auto"
              onClick={onCloseDialog}
              disabled={submitPending}
            >
              Cancel
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
