import Link from "next/link";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type MemberHeaderProps = {
  experienceId: string;
  devUserToken: string;
  activeView: "request-types" | "submissions";
  isAdmin: boolean;
  togglePending: boolean;
  onToggleView: () => void;
};

export function MemberHeader({
  experienceId,
  devUserToken,
  activeView,
  isAdmin,
  togglePending,
  onToggleView,
}: MemberHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-zinc-200 pb-3">
      <div>
        <p className="inline-flex items-center gap-2 border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-primary">
          <Sparkles className="size-4" />
          Creator Inbox
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className={
            activeView === "submissions"
              ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
              : ""
          }
          disabled={togglePending}
          onClick={onToggleView}
        >
          {togglePending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Loading...
            </>
          ) : activeView === "submissions" ? (
            "Requests"
          ) : (
            "My Submissions"
          )}
        </Button>
        {isAdmin ? (
          <Button
            nativeButton={false}
            render={
              <Link
                href={`/experiences/${encodeURIComponent(experienceId)}/admin${devUserToken ? `?whop-dev-user-token=${encodeURIComponent(devUserToken)}` : ""}`}
              />
            }
            variant="outline"
            size="sm"
            className="border-primary/30 text-primary hover:bg-primary/5 hover:text-primary"
          >
            Admin Page
          </Button>
        ) : null}
      </div>
    </header>
  );
}
