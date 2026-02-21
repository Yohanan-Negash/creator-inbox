import Link from "next/link";
import { Loader2, MessageSquare } from "lucide-react";
import { ThemeToggle } from "@/components/experiences/shared/theme-toggle";
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
    <header className="flex flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-primary">
          <MessageSquare className="size-4" />
          Creator Inbox
        </p>
      </div>
      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
        <Button
          variant="outline"
          size="sm"
          className={`w-full sm:w-auto ${
            activeView === "submissions"
              ? "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary dark:bg-primary/15 dark:hover:bg-primary/20"
              : "border-border text-foreground hover:bg-muted"
          }`}
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
            className="w-full border-primary/30 text-primary hover:bg-primary/5 hover:text-primary sm:w-auto"
          >
            Admin Page
          </Button>
        ) : null}
        <ThemeToggle />
      </div>
    </header>
  );
}
