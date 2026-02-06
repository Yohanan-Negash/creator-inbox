"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";

const convexUrl =
  process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL_LOCAL;

if (!convexUrl) {
  throw new Error(
    "Missing NEXT_PUBLIC_CONVEX_URL (or NEXT_PUBLIC_CONVEX_URL_LOCAL) for Convex client.",
  );
}

const convex = new ConvexReactClient(convexUrl);

export function ConvexClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
