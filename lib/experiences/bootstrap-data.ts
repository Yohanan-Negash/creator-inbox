import "server-only";

import { api } from "@/convex/_generated/api";
import { getConvexServerClient } from "@/lib/convex-server";
import type { AdminBootstrapData, MemberBootstrapData } from "@/lib/types/experiences/bootstrap";
import { getWhopSdk } from "@/lib/whop";

type BootstrapInput = {
  experienceId: string;
  devUserToken: string;
  requestHeaders: Headers;
};

export async function getMemberBootstrapData({
  experienceId,
  devUserToken,
  requestHeaders,
}: BootstrapInput): Promise<MemberBootstrapData> {
  const whopSdk = getWhopSdk();
  const convex = getConvexServerClient();
  const token = await whopSdk.verifyUserToken(devUserToken || requestHeaders);
  const viewerUserId = token.userId;

  const [user, access] = await Promise.all([
    whopSdk.users.retrieve(viewerUserId),
    whopSdk.users.checkAccess(experienceId, { id: viewerUserId }),
  ]);

  if (!access.has_access) {
    return {
      user,
      access,
      requestTypes: [],
      submissions: [],
    };
  }

  const [requestTypes, submissions] = await Promise.all([
    convex.query(api.requestTypes.listActiveByExperience, { experienceId }),
    convex.query(api.submissions.listVisibleForUser, {
      experienceId,
      viewerUserId,
    }),
  ]);

  return {
    user,
    access,
    requestTypes,
    submissions,
  };
}

export async function getAdminBootstrapData({
  experienceId,
  devUserToken,
  requestHeaders,
}: BootstrapInput): Promise<AdminBootstrapData> {
  const whopSdk = getWhopSdk();
  const convex = getConvexServerClient();
  const token = await whopSdk.verifyUserToken(devUserToken || requestHeaders);
  const viewerUserId = token.userId;

  const [user, access] = await Promise.all([
    whopSdk.users.retrieve(viewerUserId),
    whopSdk.users.checkAccess(experienceId, { id: viewerUserId }),
  ]);

  if (access.access_level !== "admin") {
    return {
      user,
      access,
      requestTypes: [],
      dashboardSubmissions: [],
      metrics: null,
    };
  }

  const [requestTypes, dashboardSubmissions, metrics] = await Promise.all([
    convex.query(api.requestTypes.listByExperienceCreator, {
      experienceId,
      viewerUserId,
    }),
    convex.query(api.submissions.listForAdminDashboard, {
      experienceId,
      viewerUserId,
    }),
    convex.query(api.submissions.getAdminMetrics, {
      experienceId,
      viewerUserId,
    }),
  ]);

  return {
    user,
    access,
    requestTypes,
    dashboardSubmissions,
    metrics,
  };
}
