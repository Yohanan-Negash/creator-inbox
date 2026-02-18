import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import { getConvexServerClient } from "@/lib/convex-server";
import { getSafeErrorMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getWhopSdk } from "@/lib/whop";

const bodySchema = z.object({
  requestTypeId: z.string().min(1),
  whopDevUserToken: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ experienceId: string }> },
) {
  const { experienceId } = await context.params;
  const route = "/api/whop/experiences/[experienceId]/submission-attachments/upload-url";

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

    const quote = await convex.query(api.payments.getRequestTypeQuote, {
      experienceId,
      requestTypeId: parsed.data.requestTypeId as never,
    });

    if (!quote.allowAttachments) {
      return NextResponse.json(
        { error: "Attachments are not enabled for this request." },
        { status: 400 },
      );
    }

    const uploadUrl = await convex.mutation(
      (api as any).submissions.generateSubmissionAttachmentUploadUrl,
      { viewerUserId },
    );

    return NextResponse.json({ uploadUrl }, { status: 200 });
  } catch (error) {
    logger.error("Submission attachment upload URL route failed", {
      route,
      method: "POST",
      event: "whop.submission_attachment.upload_url.failed",
      status: 500,
      experienceId,
      errorMessage: getSafeErrorMessage(error),
    });

    return NextResponse.json({ error: "Please try again." }, { status: 500 });
  }
}
