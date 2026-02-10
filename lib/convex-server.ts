import { ConvexHttpClient } from "convex/browser";

export function getConvexServerClient() {
  const convexUrl =
    process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL_LOCAL ?? "";

  if (!convexUrl) {
    throw new Error("Missing Convex URL. Set NEXT_PUBLIC_CONVEX_URL or NEXT_PUBLIC_CONVEX_URL_LOCAL.");
  }

  return new ConvexHttpClient(convexUrl);
}
