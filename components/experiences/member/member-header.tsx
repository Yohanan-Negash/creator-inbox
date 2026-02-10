import Link from "next/link";
import { Button } from "@/components/ui/button";

type MemberHeaderProps = {
  experienceId: string;
  devUserToken: string;
  activeView: "request-types" | "submissions";
  isAdmin: boolean;
  onToggleView: () => void;
};

export function MemberHeader({
  experienceId,
  devUserToken,
  activeView,
  isAdmin,
  onToggleView,
}: MemberHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-zinc-200 pb-3">
      <div>
        <h1 className="text-xl font-semibold">Creator Inbox</h1>
        <p className="text-xs text-zinc-500">Experience: {experienceId}</p>
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
          onClick={onToggleView}
        >
          {activeView === "submissions" ? "Request Types" : "My Submissions"}
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
            className="border-indigo-300 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800"
          >
            Admin Page
          </Button>
        ) : null}
      </div>
    </header>
  );
}
