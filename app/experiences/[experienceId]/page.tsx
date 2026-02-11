import { headers } from "next/headers";
import { getMemberBootstrapData } from "@/lib/experiences/bootstrap-data";
import type { MemberBootstrapData } from "@/lib/types/experiences/bootstrap";
import ExperiencePageClient from "./experience-page-client";

function getSearchParamValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value : (value?.[0] ?? "");
}

async function fetchMemberBootstrapData(
  experienceId: string,
  devUserToken: string,
): Promise<MemberBootstrapData> {
  const requestHeaders = new Headers(await headers());

  try {
    return await getMemberBootstrapData({
      experienceId,
      devUserToken,
      requestHeaders,
    });
  } catch {
    return { error: "App is down, try again later." };
  }
}

export default async function ExperiencePage({
  params,
  searchParams,
}: {
  params: Promise<{ experienceId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { experienceId } = await params;
  const resolvedSearchParams = await searchParams;
  const devUserToken = getSearchParamValue(resolvedSearchParams["whop-dev-user-token"]);
  const initialData = await fetchMemberBootstrapData(experienceId, devUserToken);

  return (
    <ExperiencePageClient
      experienceId={experienceId}
      devUserToken={devUserToken}
      initialData={initialData}
    />
  );
}
