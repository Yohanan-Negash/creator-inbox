import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  allowAttachments: boolean;
};

type RequestTypesViewProps = {
  requestTypes: RequestTypeItem[];
  onOpenSubmitDialog: (item: RequestTypeItem) => void;
};

export function RequestTypesView({ requestTypes, onOpenSubmitDialog }: RequestTypesViewProps) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-medium sm:text-base">Available requests</h2>
        <p className="text-xs text-zinc-500">Pick one to submit your request.</p>
      </div>

      {requestTypes.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No requests yet</CardTitle>
            <CardDescription>
              This creator has not published requests for this experience yet.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {requestTypes.map((item) => (
            <Card key={item._id} className="min-h-[220px]">
              <CardHeader className="gap-2">
                <CardTitle className="line-clamp-1">{item.title}</CardTitle>
                <CardDescription className="line-clamp-3 min-h-[60px]">
                  {item.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">
                  {item.price === 0 ? (
                    <Badge variant="secondary" className="mr-2 align-middle">
                      Free
                    </Badge>
                  ) : (
                    <span className="font-medium text-primary">${item.price.toFixed(2)}</span>
                  )}
                  <span className="text-zinc-400"> · </span>
                  <span className="text-amber-600">{item.responseWindowHours}h response window</span>
                </p>
              </CardContent>
              <CardFooter className="mt-auto flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-zinc-500">
                  {item.allowAttachments ? "Text response + optional attachment" : "Text response only"}
                </p>
                <Button size="sm" className="w-full sm:w-auto" onClick={() => onOpenSubmitDialog(item)}>
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
