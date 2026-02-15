import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import { getConvexServerClient } from "@/lib/convex-server";
import { getSafeErrorMessage } from "@/lib/errors";
import { MEMBER_SUBMISSIONS_PAGE_SIZE } from "@/lib/experiences/constants";
import { AppHttpError, toAppHttpError } from "@/lib/http-errors";
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
  const route = "/api/whop/experiences/[experienceId]/member-submissions";

  try {
    const parsed = querySchema.safeParse({
      cursor: request.nextUrl.searchParams.get("cursor") || null,
      whopDevUserToken: request.nextUrl.searchParams.get("whop-dev-user-token") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query params." }, { status: 400 });
    }

    let whopSdk;
    try {
      whopSdk = getWhopSdk();
    } catch (error) {
      throw new AppHttpError("INTERNAL", 500, "Whop SDK initialization failed", { cause: error });
    }

    let convex;
    try {
      convex = getConvexServerClient();
    } catch (error) {
      throw new AppHttpError("INTERNAL", 500, "Convex client initialization failed", {
        cause: error,
      });
    }

    let token;
    try {
      token = await whopSdk.verifyUserToken(parsed.data.whopDevUserToken || request.headers);
    } catch (error) {
      throw new AppHttpError("UNAUTHORIZED", 401, "User token verification failed", {
        cause: error,
      });
    }
    const viewerUserId = token.userId;

    let access;
    try {
      access = await whopSdk.users.checkAccess(experienceId, {
        id: viewerUserId,
      });
    } catch (error) {
      throw new AppHttpError("UPSTREAM_FAILURE", 502, "Whop access check failed", {
        cause: error,
      });
    }

    if (!access.has_access) {
      return NextResponse.json({ error: "Access required." }, { status: 403 });
    }

    let submissionsPage;
    try {
      submissionsPage = await convex.query(api.submissions.listVisibleForUserPaginated, {
        experienceId,
        viewerUserId,
        paginationOpts: {
          numItems: MEMBER_SUBMISSIONS_PAGE_SIZE,
          cursor: parsed.data.cursor,
        },
      });
    } catch (error) {
      throw new AppHttpError("INTERNAL", 500, "Member submissions query failed", {
        cause: error,
      });
    }

    return NextResponse.json(
      {
        submissions: submissionsPage.page,
        submissionsContinueCursor: submissionsPage.isDone ? null : submissionsPage.continueCursor,
        submissionsIsDone: submissionsPage.isDone,
      },
      { status: 200 },
    );
  } catch (error) {
    const classifiedError = toAppHttpError(error);
    logger.error("Member submissions route failed", {
      route,
      method: "GET",
      event: "whop.member_submissions.failed",
      status: classifiedError.status,
      errorCode: classifiedError.code,
      experienceId,
      errorMessage: getSafeErrorMessage(error),
    });

    return NextResponse.json({ error: "Please try again." }, { status: classifiedError.status });
  }
}
