import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { getConvexServerClient } from "@/lib/convex-server";
import { getSafeErrorMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getWhopSdk } from "@/lib/whop";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ experienceId: string }> },
) {
  const { experienceId } = await context.params;
  const route = "/api/whop/experiences/[experienceId]/admin-data";

  try {
    const whopSdk = getWhopSdk();
    const convex = getConvexServerClient();
    const devUserToken = request.nextUrl.searchParams.get("whop-dev-user-token") ?? "";

    const token = await whopSdk.verifyUserToken(devUserToken || request.headers);
    const viewerUserId = token.userId;

    const access = await whopSdk.users.checkAccess(experienceId, { id: viewerUserId });
    if (access.access_level !== "admin") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
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

    return NextResponse.json(
      {
        requestTypes,
        dashboardSubmissions,
        metrics,
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error("Admin data route failed", {
      route,
      method: "GET",
      event: "whop.admin_data.failed",
      status: 500,
      experienceId,
      errorMessage: getSafeErrorMessage(error),
    });

    return NextResponse.json({ error: "Please try again." }, { status: 500 });
  }
}
