import { NextResponse } from "next/server";
import { z } from "zod";
import { generateRequestTypes } from "@/lib/inference/generate-request-types";
import {
  GenerateRequestTypesInputSchema,
  GenerateRequestTypesRouteInputSchema,
} from "@/lib/inference/schemas";
import { getSafeErrorMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getWhopSdk } from "@/lib/whop";

export const dynamic = "force-dynamic";

function toFieldErrors(
  error: z.ZodError<z.infer<typeof GenerateRequestTypesRouteInputSchema>>,
) {
  return z.flattenError(error).fieldErrors;
}

export async function POST(request: Request) {
  const baseLog = {
    route: "/api/inference/request-types",
    method: "POST",
  };

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      logger.error("Invalid JSON body", {
        ...baseLog,
        event: "inference.request_types.invalid_json",
        status: 400,
      });
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = GenerateRequestTypesRouteInputSchema.safeParse(body);

    if (!parsed.success) {
      logger.error("Inference request validation failed", {
        ...baseLog,
        event: "inference.request_types.validation_failed",
        status: 400,
        fields: Object.keys(toFieldErrors(parsed.error)),
      });
      return NextResponse.json(
        {
          error: "Validation failed",
          fieldErrors: toFieldErrors(parsed.error),
        },
        { status: 400 },
      );
    }

    const whopSdk = getWhopSdk();

    let userId = "";
    try {
      const token = await whopSdk.verifyUserToken(
        parsed.data.whopDevUserToken || request.headers,
      );
      userId = token.userId;
    } catch {
      logger.error("Token verification failed", {
        ...baseLog,
        event: "inference.request_types.auth_failed",
        status: 401,
        experienceId: parsed.data.experienceId,
        hasDevToken: Boolean(parsed.data.whopDevUserToken),
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const access = await whopSdk.users.checkAccess(parsed.data.experienceId, {
      id: userId,
    });

    if (!access.has_access || access.access_level !== "admin") {
      logger.error("Inference request access denied", {
        ...baseLog,
        event: "inference.request_types.access_denied",
        status: 403,
        experienceId: parsed.data.experienceId,
        userId,
      });
      return NextResponse.json(
        { error: "Only experience admins can generate request types." },
        { status: 403 },
      );
    }

    const contextFromExisting = parsed.data.existingRequestTypes?.length
      ? `Existing types: ${parsed.data.existingRequestTypes.map((item) => item.title).join(", ")}. Build something distinct and complementary.`
      : "No existing request types yet. Propose a strong starter offer.";

    const generateInput = GenerateRequestTypesInputSchema.parse({
      experienceId: parsed.data.experienceId,
      prompt: `${parsed.data.intent}. Generate one fresh request type idea with clear value and a specific text-response deliverable.`,
      creatorContext: contextFromExisting,
      targetAudience: "Fans or clients buying creator support and personalized outcomes.",
      count: 1,
      existingRequestTypes: parsed.data.existingRequestTypes,
      whopDevUserToken: parsed.data.whopDevUserToken,
    });

    const generated = await generateRequestTypes(generateInput);
    const trimmed = {
      ...generated,
      requestTypes: generated.requestTypes.slice(0, 1),
    };

    logger.info("Request type generation succeeded", {
      ...baseLog,
      event: "inference.request_types.generated",
      status: 200,
      experienceId: parsed.data.experienceId,
      userId,
      generatedCount: trimmed.requestTypes.length,
      rejected: trimmed.rejected,
    });

    return NextResponse.json(trimmed, { status: 200 });
  } catch (error) {
    logger.error("Inference request types route failed", {
      ...baseLog,
      event: "inference.request_types.unhandled_error",
      status: 500,
      errorMessage: getSafeErrorMessage(error),
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
