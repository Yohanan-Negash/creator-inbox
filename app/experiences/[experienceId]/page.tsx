"use client";

import { use, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

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

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Experience: {experienceId}</h1>

      <section className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <h2 className="mb-2 text-sm font-medium">API response</h2>
        {loading ? (
          <p className="text-sm">Loading...</p>
        ) : (
          <pre className="overflow-auto text-xs">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </section>
    </main>
  );
}
