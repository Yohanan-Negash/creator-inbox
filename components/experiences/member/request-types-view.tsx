import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type RequestTypeItem = {
  _id: Id<"requestTypes">;
  title: string;
  description: string;
  price: number;
  responseWindowHours: number;
};

type RequestTypesViewProps = {
  requestTypes: RequestTypeItem[];
  onOpenSubmitDialog: (item: RequestTypeItem) => void;
};

export function RequestTypesView({ requestTypes, onOpenSubmitDialog }: RequestTypesViewProps) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-base font-medium">Available request types</h2>
        <p className="text-xs text-zinc-500">Pick one to submit a paid request.</p>
      </div>

      {requestTypes.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No request types yet</CardTitle>
            <CardDescription>
              This creator has not published request types for this experience yet.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {requestTypes.map((item) => (
            <Card key={item._id} className="h-full min-h-[220px]">
              <CardHeader className="gap-2">
                <CardTitle className="line-clamp-1">{item.title}</CardTitle>
                <CardDescription className="line-clamp-3 min-h-[60px]">
                  {item.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm line-clamp-1">
                  <span className="font-medium text-primary">${item.price.toFixed(2)}</span>
                  <span className="text-zinc-400"> · </span>
                  <span className="text-amber-600">{item.responseWindowHours}h response window</span>
                </p>
              </CardContent>
              <CardFooter className="mt-auto justify-between">
                <p className="text-xs text-zinc-500">Text response only</p>
                <Button size="sm" onClick={() => onOpenSubmitDialog(item)}>
                  Submit Request
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
