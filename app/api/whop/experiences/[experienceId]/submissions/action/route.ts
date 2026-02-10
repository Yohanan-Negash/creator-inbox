import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import { getConvexServerClient } from "@/lib/convex-server";
import { getSafeErrorMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getWhopSdk } from "@/lib/whop";

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("answer"),
    submissionId: z.string().min(1),
    responseText: z.string().min(1),
    whopDevUserToken: z.string().optional(),
  }),
  z.object({
    action: z.literal("delete"),
    submissionId: z.string().min(1),
    whopDevUserToken: z.string().optional(),
  }),
]);

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ experienceId: string }> },
) {
  const { experienceId } = await context.params;
  const route = "/api/whop/experiences/[experienceId]/submissions/action";

  try {
    const body = actionSchema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    const whopSdk = getWhopSdk();
    const convex = getConvexServerClient();
    const token = await whopSdk.verifyUserToken(body.data.whopDevUserToken || request.headers);
    const viewerUserId = token.userId;

    const access = await whopSdk.users.checkAccess(experienceId, { id: viewerUserId });
    if (access.access_level !== "admin") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    if (body.data.action === "answer") {
      await convex.mutation(api.submissions.answerSubmission, {
        submissionId: body.data.submissionId as never,
        viewerUserId,
        responseText: body.data.responseText,
      });
    } else {
      await convex.mutation(api.submissions.deleteSubmissionForCreator, {
        submissionId: body.data.submissionId as never,
        viewerUserId,
      });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error("Submission action route failed", {
      route,
      method: "POST",
      event: "whop.submission_action.failed",
      status: 500,
      experienceId,
      errorMessage: getSafeErrorMessage(error),
    });

    return NextResponse.json({ error: getSafeErrorMessage(error) }, { status: 500 });
  }
}
