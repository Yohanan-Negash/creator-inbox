import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import { getConvexServerClient } from "@/lib/convex-server";
import { getSafeErrorMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getWhopSdk } from "@/lib/whop";

const bodySchema = z.object({
  requestTypeId: z.string().min(1),
  storageId: z.string().min(1),
  fileName: z.string().min(1).max(120),
  whopDevUserToken: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ experienceId: string }> },
) {
  const { experienceId } = await context.params;
  const route = "/api/whop/experiences/[experienceId]/submission-attachments/register";

  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    const whopSdk = getWhopSdk();
    const convex = getConvexServerClient();
    const token = await whopSdk.verifyUserToken(parsed.data.whopDevUserToken || request.headers);
    const viewerUserId = token.userId;

    const access = await whopSdk.users.checkAccess(experienceId, { id: viewerUserId });
    if (!access.has_access) {
      return NextResponse.json({ error: "Access required." }, { status: 403 });
    }

    const attachment = await convex.mutation(
      (api as any).submissions.registerPendingSubmissionAttachment,
      {
        viewerUserId,
        experienceId,
        requestTypeId: parsed.data.requestTypeId as never,
        storageId: parsed.data.storageId as never,
        fileName: parsed.data.fileName,
      },
    );

    return NextResponse.json({ attachment }, { status: 200 });
  } catch (error) {
    logger.error("Submission attachment register route failed", {
      route,
      method: "POST",
      event: "whop.submission_attachment.register.failed",
      status: 500,
      experienceId,
      errorMessage: getSafeErrorMessage(error),
    });

    return NextResponse.json({ error: "Please try again." }, { status: 500 });
  }
}
