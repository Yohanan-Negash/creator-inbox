import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import { getConvexServerClient } from "@/lib/convex-server";
import { getSafeErrorMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getWhopSdk } from "@/lib/whop";

const querySchema = z.object({
  whopDevUserToken: z.string().optional(),
});

function buildAttachmentDisposition(fileName: string) {
  const asciiFallback = fileName.replace(/[^\x20-\x7E]/g, "_").replace(/\"/g, "").trim() || "attachment";
  const encoded = encodeURIComponent(fileName);
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ experienceId: string; submissionId: string }> },
) {
  const { experienceId, submissionId } = await context.params;
  const route = "/api/whop/experiences/[experienceId]/submissions/[submissionId]/attachment/download";

  try {
    const parsed = querySchema.safeParse({
      whopDevUserToken: request.nextUrl.searchParams.get("whop-dev-user-token") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query params." }, { status: 400 });
    }

    const whopSdk = getWhopSdk();
    const convex = getConvexServerClient();
    const token = await whopSdk.verifyUserToken(parsed.data.whopDevUserToken || request.headers);
    const viewerUserId = token.userId;

    const access = await whopSdk.users.checkAccess(experienceId, { id: viewerUserId });
    if (!access.has_access) {
      return NextResponse.json({ error: "Access required." }, { status: 403 });
    }

    const attachment = await convex.query(api.submissions.getAttachmentDownloadForViewer, {
      experienceId,
      submissionId: submissionId as never,
      viewerUserId,
    });

    const upstream = await fetch(attachment.downloadUrl);
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: "Attachment unavailable." }, { status: 502 });
    }

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": attachment.contentType || upstream.headers.get("Content-Type") || "application/octet-stream",
        "Content-Disposition": buildAttachmentDisposition(attachment.fileName),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    logger.error("Submission attachment download route failed", {
      route,
      method: "GET",
      event: "whop.submission_attachment.download.failed",
      status: 500,
      experienceId,
      submissionId,
      errorMessage: getSafeErrorMessage(error),
    });

    return NextResponse.json({ error: "Please try again." }, { status: 500 });
  }
}
