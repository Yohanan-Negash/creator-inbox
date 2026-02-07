"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type WhopResponse = {
  user?: {
    id: string;
    username: string;
    name: string | null;
  };
  access?: {
    access_level: string;
    has_access: boolean;
  };
  error?: string;
};

export default function ExperiencePage({
  params,
}: {
  params: Promise<{ experienceId: string }>;
}) {
  const { experienceId } = use(params);
  const searchParams = useSearchParams();
  const devUserToken = searchParams.get("whop-dev-user-token") ?? "";
  const [data, setData] = useState<WhopResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const requestTypes = useQuery(api.requestTypes.listActiveByExperience, {
    experienceId,
  });

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
        setData({ error: "Failed to fetch Whop data." });
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

  const hasAccess = data?.access?.has_access === true;
  const isRequestTypesLoading = hasAccess && requestTypes === undefined;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between border-b border-zinc-200 pb-3">
        <div>
          <h1 className="text-xl font-semibold">Creator Inbox</h1>
          <p className="text-xs text-zinc-500">Experience: {experienceId}</p>
        </div>
        {data?.access?.access_level === "admin" ? (
          <Button
            nativeButton={false}
            render={
              <Link
                href={`/experiences/${encodeURIComponent(experienceId)}/admin${devUserToken ? `?whop-dev-user-token=${encodeURIComponent(devUserToken)}` : ""}`}
              />
            }
            variant="outline"
            size="sm"
          >
            Admin
          </Button>
        ) : null}
      </header>

      {loading ? (
        <div className="flex min-h-[60vh] items-center justify-center p-6">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-zinc-500">Loading experience access...</p>
          </div>
        </div>
      ) : null}

      {!loading && data?.error ? (
        <Card>
          <CardHeader>
            <CardTitle>Access error</CardTitle>
            <CardDescription>{data.error}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {!loading && !data?.error && data?.access?.has_access === false ? (
        <Card>
          <CardHeader>
            <CardTitle>No access</CardTitle>
            <CardDescription>
              You do not have access to this experience.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {!loading && !data?.error && isRequestTypesLoading ? (
        <div className="flex min-h-[60vh] items-center justify-center p-6">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-zinc-500">Loading request types...</p>
          </div>
        </div>
      ) : null}

      {!loading && !data?.error && data?.access?.has_access && requestTypes !== undefined ? (
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-base font-medium">Available request types</h2>
            <p className="text-xs text-zinc-500">
              Pick one to submit a paid request.
            </p>
          </div>

          {requestTypes && requestTypes.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No request types yet</CardTitle>
                <CardDescription>
                  This creator has not published request types for this
                  experience yet.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          {requestTypes && requestTypes.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {requestTypes.map((item) => (
                <Card key={item._id}>
                  <CardHeader>
                    <CardTitle>{item.title}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">
                      ${item.price.toFixed(2)} · {item.responseWindowHours}h
                      response window
                    </p>
                  </CardContent>
                  <CardFooter>
                    <p className="text-xs text-zinc-500">Text response only</p>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
