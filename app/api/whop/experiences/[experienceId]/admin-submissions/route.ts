import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import { getConvexServerClient } from "@/lib/convex-server";
import { getSafeErrorMessage } from "@/lib/errors";
import { ADMIN_SUBMISSIONS_PAGE_SIZE } from "@/lib/experiences/constants";
import { logger } from "@/lib/logger";
import { getWhopSdk } from "@/lib/whop";

const querySchema = z.object({
  cursor: z.string().nullable(),
  whopDevUserToken: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ experienceId: string }> },
) {
  const { experienceId } = await context.params;
  const route = "/api/whop/experiences/[experienceId]/admin-submissions";

  try {
    const parsed = querySchema.safeParse({
      cursor: request.nextUrl.searchParams.get("cursor") || null,
      whopDevUserToken: request.nextUrl.searchParams.get("whop-dev-user-token") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query params." }, { status: 400 });
    }

    const whopSdk = getWhopSdk();
    const convex = getConvexServerClient();

    const token = await whopSdk.verifyUserToken(
      parsed.data.whopDevUserToken || request.headers,
    );
    const viewerUserId = token.userId;

    const access = await whopSdk.users.checkAccess(experienceId, {
      id: viewerUserId,
    });

    if (access.access_level !== "admin") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const submissionsPage = await convex.query(api.submissions.listForAdminDashboardPaginated, {
      experienceId,
      viewerUserId,
      paginationOpts: {
        numItems: ADMIN_SUBMISSIONS_PAGE_SIZE,
        cursor: parsed.data.cursor,
      },
    });

    return NextResponse.json(
      {
        dashboardSubmissions: submissionsPage.page,
        dashboardSubmissionsContinueCursor: submissionsPage.isDone
          ? null
          : submissionsPage.continueCursor,
        dashboardSubmissionsIsDone: submissionsPage.isDone,
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error("Admin submissions route failed", {
      route,
      method: "GET",
      event: "whop.admin_submissions.failed",
      status: 500,
      experienceId,
      errorMessage: getSafeErrorMessage(error),
    });

    return NextResponse.json({ error: "Please try again." }, { status: 500 });
  }
}
