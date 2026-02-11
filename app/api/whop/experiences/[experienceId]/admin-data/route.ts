import { NextRequest, NextResponse } from "next/server";
import { getAdminBootstrapData } from "@/lib/experiences/bootstrap-data";
import { getSafeErrorMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ experienceId: string }> },
) {
  const { experienceId } = await context.params;
  const route = "/api/whop/experiences/[experienceId]/admin-data";

  try {
    const devUserToken = request.nextUrl.searchParams.get("whop-dev-user-token") ?? "";
    const payload = await getAdminBootstrapData({
      experienceId,
      devUserToken,
      requestHeaders: request.headers,
    });

    return NextResponse.json(payload, { status: 200 });
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
