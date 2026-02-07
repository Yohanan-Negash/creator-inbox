"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type WhopResponse = {
  access?: {
    access_level: string;
    has_access: boolean;
  };
  error?: string;
};

export default function AdminPage({
  params,
}: {
  params: Promise<{ experienceId: string }>;
}) {
  const { experienceId } = use(params);
  const searchParams = useSearchParams();
  const devUserToken = searchParams.get("whop-dev-user-token") ?? "";

  const [data, setData] = useState<WhopResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch(
          `/api/whop/user?experienceId=${encodeURIComponent(experienceId)}&whop-dev-user-token=${encodeURIComponent(devUserToken)}`,
        );
        const payload = (await response.json()) as WhopResponse;
        if (!active) {
          return;
        }
        setData(payload);
      } catch {
        if (!active) {
          return;
        }
        setData({ error: "Failed to load access details." });
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [devUserToken, experienceId]);

  const homeHref = `/experiences/${encodeURIComponent(experienceId)}${devUserToken ? `?whop-dev-user-token=${encodeURIComponent(devUserToken)}` : ""}`;

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-zinc-500">Loading admin access...</p>
        </div>
      </main>
    );
  }

  if (data?.error || data?.access?.access_level !== "admin") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-4 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Unauthorized</CardTitle>
            <CardDescription>
              Only experience admins can view this page.
            </CardDescription>
          </CardHeader>
        </Card>
        <div>
          <Button
            nativeButton={false}
            render={<Link href={homeHref} />}
            variant="outline"
            size="sm"
          >
            Back to Experience
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-4 p-6">
      <header className="flex items-center justify-between border-b border-zinc-200 pb-3">
        <div>
          <h1 className="text-xl font-semibold">Admin</h1>
          <p className="text-xs text-zinc-500">Experience: {experienceId}</p>
        </div>
        <Button
          nativeButton={false}
          render={<Link href={homeHref} />}
          variant="outline"
          size="sm"
        >
          Back
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Admin tools</CardTitle>
          <CardDescription>
            This page is ready for request type management.
          </CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}
