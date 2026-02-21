import type { SubmitEvent } from "react";
// import { BotIcon } from "lucide-react";
import { Loader2 } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  REQUEST_TYPE_DESCRIPTION_MAX_LENGTH,
  REQUEST_TYPE_PRICE_MAX_USD,
  REQUEST_TYPE_TITLE_MAX_LENGTH,
} from "@/lib/request-types/constants";

const responseWindowOptions = [1, 2, 4, 6, 12, 24, 48, 72, 168];

function formatResponseWindowLabel(hours: number) {
  if (hours < 24) {
    return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  }

  const days = hours / 24;
  return `${days} ${days === 1 ? "day" : "days"}`;
}

type RequestTypeFormValues = {
  title: string;
  description: string;
  price: string;
  responseWindowHours: string;
  allowAttachments: boolean;
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
  // generateError,
  onOpenChange,
  onOpenCreateDialog,
  onSubmit,
  onCloseDialog,
  // onGenerateWithAi,
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
            {fieldErrors.title ? <p className="text-xs text-destructive">{fieldErrors.title}</p> : null}
            <p className="text-right text-[11px] text-muted-foreground">
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
              <p className="text-xs text-destructive">{fieldErrors.description}</p>
            ) : null}
            <p
              className={`text-right text-[11px] ${
                formValues.description.length >= REQUEST_TYPE_DESCRIPTION_MAX_LENGTH
                  ? "text-destructive"
                  : "text-muted-foreground"
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
                max={String(REQUEST_TYPE_PRICE_MAX_USD)}
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
              <p className="text-[11px] text-muted-foreground">
                Set price to $0 for free requests. {`Maximum price is $${REQUEST_TYPE_PRICE_MAX_USD}.`}
              </p>
            </div>

            <div className="grid gap-1.5">
              <label className="text-xs font-medium" htmlFor="request-type-window">
                Response time
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
                  className="h-10"
                  aria-invalid={Boolean(fieldErrors.responseWindowHours)}
                >
                  <SelectValue placeholder="Select response time" />
                </SelectTrigger>
                <SelectContent>
                  {responseWindowOptions.map((hours) => (
                    <SelectItem key={hours} value={String(hours)}>
                      {formatResponseWindowLabel(hours)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="justify-start"
                onClick={() =>
                  onFormChange({
                    ...formValues,
                    responseWindowHours: "24",
                  })
                }
                disabled={submitPending || generatePending}
              >
                Use 24-hour default
              </Button>
              <p className="text-[11px] text-muted-foreground">
                How long members should expect to wait for your reply.
              </p>
            </div>
          </div>

          <div className="min-h-4">
            {fieldErrors.responseWindowHours ? (
              <p className="text-xs text-destructive">{fieldErrors.responseWindowHours}</p>
            ) : fieldErrors.price ? (
              <p className="text-xs text-destructive">{fieldErrors.price}</p>
            ) : null}
          </div>

          <div className="grid gap-1.5 rounded-md border border-border p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="grid gap-1">
                <label className="text-xs font-medium" htmlFor="request-type-allow-attachments">
                  Allow attachments
                </label>
                <p className="text-[11px] text-muted-foreground">
                  Members can attach one file (PDF, JPG, PNG) up to 10MB.
                </p>
              </div>
              <Switch
                id="request-type-allow-attachments"
                checked={formValues.allowAttachments}
                disabled={submitPending || generatePending}
                onCheckedChange={(checked) =>
                  onFormChange({
                    ...formValues,
                    allowAttachments: checked,
                  })
                }
                aria-label="Allow submission attachments"
              />
            </div>
          </div>

          <DialogFooter className="grid gap-2 sm:grid-cols-[auto_auto] sm:justify-end sm:items-end">
            {/*
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
            */}
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
              {submitError ? <p className="text-xs text-destructive">{submitError}</p> : null}
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive sm:w-auto"
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
