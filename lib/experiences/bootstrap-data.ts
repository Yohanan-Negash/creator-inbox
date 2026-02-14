import "server-only";

import { api } from "@/convex/_generated/api";
import { getConvexServerClient } from "@/lib/convex-server";
import { getSafeErrorMessage } from "@/lib/errors";
import { ADMIN_SUBMISSIONS_PAGE_SIZE, MEMBER_SUBMISSIONS_PAGE_SIZE } from "@/lib/experiences/constants";
import { logger } from "@/lib/logger";
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
  const logContext = {
    fn: "getMemberBootstrapData",
    experienceId,
    hasDevUserToken: Boolean(devUserToken),
  };

  let whopSdk;
  try {
    whopSdk = getWhopSdk();
  } catch (error) {
    logger.error("Whop SDK initialization failed (env issue)", {
      ...logContext,
      step: "getWhopSdk",
      errorMessage: getSafeErrorMessage(error),
    });
    throw error;
  }

  let convex;
  try {
    convex = getConvexServerClient();
  } catch (error) {
    logger.error("Convex client initialization failed (env issue)", {
      ...logContext,
      step: "getConvexServerClient",
      errorMessage: getSafeErrorMessage(error),
    });
    throw error;
  }

  let viewerUserId: string;
  try {
    const token = await whopSdk.verifyUserToken(devUserToken || requestHeaders);
    viewerUserId = token.userId;
  } catch (error) {
    logger.error("Whop user token verification failed", {
      ...logContext,
      step: "verifyUserToken",
      errorMessage: getSafeErrorMessage(error),
    });
    throw error;
  }

  let user;
  let access;
  try {
    [user, access] = await Promise.all([
      whopSdk.users.retrieve(viewerUserId),
      whopSdk.users.checkAccess(experienceId, { id: viewerUserId }),
    ]);
  } catch (error) {
    logger.error("Whop API call failed (user retrieve or access check)", {
      ...logContext,
      step: "whopApiCalls",
      viewerUserId,
      errorMessage: getSafeErrorMessage(error),
    });
    throw error;
  }

  if (!access.has_access) {
    return {
      user,
      access,
      requestTypes: [],
      submissions: [],
      submissionsContinueCursor: null,
      submissionsIsDone: true,
    };
  }

  let requestTypes;
  let submissionsPage;
  try {
    [requestTypes, submissionsPage] = await Promise.all([
      convex.query(api.requestTypes.listActiveByExperience, { experienceId }),
      convex.query(api.submissions.listVisibleForUserPaginated, {
        experienceId,
        viewerUserId,
        paginationOpts: {
          numItems: MEMBER_SUBMISSIONS_PAGE_SIZE,
          cursor: null,
        },
      }),
    ]);
  } catch (error) {
    logger.error("Convex query failed (requestTypes or submissions)", {
      ...logContext,
      step: "convexQueries",
      viewerUserId,
      errorMessage: getSafeErrorMessage(error),
    });
    throw error;
  }

  return {
    user,
    access,
    requestTypes,
    submissions: submissionsPage.page,
    submissionsContinueCursor: submissionsPage.isDone ? null : submissionsPage.continueCursor,
    submissionsIsDone: submissionsPage.isDone,
  };
}

export async function getAdminBootstrapData({
  experienceId,
  devUserToken,
  requestHeaders,
}: BootstrapInput): Promise<AdminBootstrapData> {
  const logContext = {
    fn: "getAdminBootstrapData",
    experienceId,
    hasDevUserToken: Boolean(devUserToken),
  };

  let whopSdk;
  try {
    whopSdk = getWhopSdk();
  } catch (error) {
    logger.error("Whop SDK initialization failed (env issue)", {
      ...logContext,
      step: "getWhopSdk",
      errorMessage: getSafeErrorMessage(error),
    });
    throw error;
  }

  let convex;
  try {
    convex = getConvexServerClient();
  } catch (error) {
    logger.error("Convex client initialization failed (env issue)", {
      ...logContext,
      step: "getConvexServerClient",
      errorMessage: getSafeErrorMessage(error),
    });
    throw error;
  }

  let viewerUserId: string;
  try {
    const token = await whopSdk.verifyUserToken(devUserToken || requestHeaders);
    viewerUserId = token.userId;
  } catch (error) {
    logger.error("Whop user token verification failed", {
      ...logContext,
      step: "verifyUserToken",
      errorMessage: getSafeErrorMessage(error),
    });
    throw error;
  }

  let user;
  let access;
  try {
    [user, access] = await Promise.all([
      whopSdk.users.retrieve(viewerUserId),
      whopSdk.users.checkAccess(experienceId, { id: viewerUserId }),
    ]);
  } catch (error) {
    logger.error("Whop API call failed (user retrieve or access check)", {
      ...logContext,
      step: "whopApiCalls",
      viewerUserId,
      errorMessage: getSafeErrorMessage(error),
    });
    throw error;
  }

  if (access.access_level !== "admin") {
    return {
      user,
      access,
      requestTypes: [],
      dashboardSubmissions: [],
      dashboardSubmissionsContinueCursor: null,
      dashboardSubmissionsIsDone: true,
      metrics: null,
    };
  }

  let requestTypes;
  let dashboardSubmissionsPage;
  let metrics;
  try {
    [requestTypes, dashboardSubmissionsPage, metrics] = await Promise.all([
      convex.query(api.requestTypes.listByExperienceCreator, {
        experienceId,
        viewerUserId,
      }),
      convex.query(api.submissions.listForAdminDashboardPaginated, {
        experienceId,
        viewerUserId,
        paginationOpts: {
          numItems: ADMIN_SUBMISSIONS_PAGE_SIZE,
          cursor: null,
        },
      }),
      convex.query(api.submissions.getAdminMetrics, {
        experienceId,
        viewerUserId,
      }),
    ]);
  } catch (error) {
    logger.error("Convex query failed (requestTypes, submissions, or metrics)", {
      ...logContext,
      step: "convexQueries",
      viewerUserId,
      errorMessage: getSafeErrorMessage(error),
    });
    throw error;
  }

  return {
    user,
    access,
    requestTypes,
    dashboardSubmissions: dashboardSubmissionsPage.page,
    dashboardSubmissionsContinueCursor: dashboardSubmissionsPage.isDone
      ? null
      : dashboardSubmissionsPage.continueCursor,
    dashboardSubmissionsIsDone: dashboardSubmissionsPage.isDone,
    metrics,
  };
}
