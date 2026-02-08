import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getWhopSdk } from "@/lib/whop";

function getSafeErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

export async function GET(request: NextRequest) {
  const experienceId = request.nextUrl.searchParams.get("experienceId");
  const devUserToken = request.nextUrl.searchParams.get("whop-dev-user-token");
  const baseLog = {
    route: "/api/whop/user",
    method: "GET",
    experienceId,
    hasDevToken: Boolean(devUserToken),
  };

  try {
    const whopSdk = getWhopSdk();

    let userId = "";
    try {
      const token = await whopSdk.verifyUserToken(
        devUserToken || request.headers,
      );
      userId = token.userId;
    } catch {
      logger.error("Token verification failed", {
        ...baseLog,
        event: "auth.verify_token_failed",
        status: 401,
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await whopSdk.users.retrieve(userId);

    if (!experienceId) {
      logger.info("Whop user fetch succeeded", {
        ...baseLog,
        event: "whop.user.fetch_success",
        status: 200,
        userId,
      });
      return NextResponse.json({ user }, { status: 200 });
    }

    const access = await whopSdk.users.checkAccess(experienceId, { id: userId });

    logger.info("Whop access check succeeded", {
      ...baseLog,
      event: "whop.user.access_check_success",
      status: 200,
      userId,
      accessLevel: access.access_level,
      hasAccess: access.has_access,
    });

    return NextResponse.json(
      {
        user,
        experienceId,
        access,
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error("Whop user route failed", {
      ...baseLog,
      event: "whop.user.unhandled_error",
      status: 500,
      errorMessage: getSafeErrorMessage(error),
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
