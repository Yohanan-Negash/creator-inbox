import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import { getConvexServerClient } from "@/lib/convex-server";
import { getSafeErrorMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getWhopSdk } from "@/lib/whop";

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    title: z.string().min(1),
    description: z.string().min(1),
    price: z.number(),
    responseWindowHours: z.number(),
    whopDevUserToken: z.string().optional(),
  }),
  z.object({
    action: z.literal("update"),
    requestTypeId: z.string().min(1),
    title: z.string().min(1),
    description: z.string().min(1),
    price: z.number(),
    responseWindowHours: z.number(),
    whopDevUserToken: z.string().optional(),
  }),
  z.object({
    action: z.literal("archive"),
    requestTypeId: z.string().min(1),
    whopDevUserToken: z.string().optional(),
  }),
  z.object({
    action: z.literal("unarchive"),
    requestTypeId: z.string().min(1),
    whopDevUserToken: z.string().optional(),
  }),
  z.object({
    action: z.literal("delete"),
    requestTypeId: z.string().min(1),
    whopDevUserToken: z.string().optional(),
  }),
]);

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ experienceId: string }> },
) {
  const { experienceId } = await context.params;
  const route = "/api/whop/experiences/[experienceId]/request-types/action";

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

    switch (body.data.action) {
      case "create":
        await convex.mutation(api.requestTypes.createRequestType, {
          experienceId,
          viewerUserId,
          title: body.data.title,
          description: body.data.description,
          price: body.data.price,
          responseWindowHours: body.data.responseWindowHours,
        });
        break;
      case "update":
        await convex.mutation(api.requestTypes.updateRequestType, {
          requestTypeId: body.data.requestTypeId as never,
          viewerUserId,
          title: body.data.title,
          description: body.data.description,
          price: body.data.price,
          responseWindowHours: body.data.responseWindowHours,
        });
        break;
      case "archive":
        await convex.mutation(api.requestTypes.archiveRequestType, {
          requestTypeId: body.data.requestTypeId as never,
          viewerUserId,
        });
        break;
      case "unarchive":
        await convex.mutation(api.requestTypes.unarchiveRequestType, {
          requestTypeId: body.data.requestTypeId as never,
          viewerUserId,
        });
        break;
      case "delete":
        await convex.mutation(api.requestTypes.softDeleteRequestType, {
          requestTypeId: body.data.requestTypeId as never,
          viewerUserId,
        });
        break;
      default:
        return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error("Request type action route failed", {
      route,
      method: "POST",
      event: "whop.request_type_action.failed",
      status: 500,
      experienceId,
      errorMessage: getSafeErrorMessage(error),
    });

    return NextResponse.json({ error: getSafeErrorMessage(error) }, { status: 500 });
  }
}
