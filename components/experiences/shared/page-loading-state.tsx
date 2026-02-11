import { Loader2 } from "lucide-react";

type PageLoadingStateProps = {
  message: string;
};

export function PageLoadingState({ message }: PageLoadingStateProps) {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm text-zinc-500">{message}</p>
      </div>
    </main>
  );
}
