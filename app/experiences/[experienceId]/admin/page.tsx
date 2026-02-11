import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminBootstrapData } from "@/lib/experiences/bootstrap-data";
import type { AdminBootstrapData } from "@/lib/types/experiences/bootstrap";
import AdminPageClient from "./admin-page-client";

function getSearchParamValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value : (value?.[0] ?? "");
}

async function fetchAdminBootstrapData(
  experienceId: string,
  devUserToken: string,
): Promise<AdminBootstrapData> {
  const requestHeaders = new Headers(await headers());

  try {
    return await getAdminBootstrapData({
      experienceId,
      devUserToken,
      requestHeaders,
    });
  } catch {
    return { error: "App is down, try again later." };
  }
}

export default async function AdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ experienceId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { experienceId } = await params;
  const resolvedSearchParams = await searchParams;
  const devUserToken = getSearchParamValue(resolvedSearchParams["whop-dev-user-token"]);
  const initialData = await fetchAdminBootstrapData(experienceId, devUserToken);

  if (!initialData.error && initialData.access?.access_level !== "admin") {
    const homeHref = `/experiences/${encodeURIComponent(experienceId)}${devUserToken ? `?whop-dev-user-token=${encodeURIComponent(devUserToken)}` : ""}`;
    redirect(homeHref);
  }

  return (
    <AdminPageClient
      experienceId={experienceId}
      devUserToken={devUserToken}
      initialData={initialData}
    />
  );
}
