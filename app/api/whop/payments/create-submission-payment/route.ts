import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import { getSafeErrorMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getWhopSdk } from "@/lib/whop";
import { notifyAdminSubmissionCreated } from "@/lib/whop-notifications";
import { getConvexServerClient } from "@/lib/convex-server";

const createSubmissionPaymentSchema = z.object({
  experienceId: z.string().min(1),
  requestTypeId: z.string().min(1),
  submissionText: z.string().min(5).max(2000),
  attachmentToken: z.string().uuid().optional(),
  whopDevUserToken: z.string().optional(),
});

const PENDING_CHECKOUT_TTL_MS = 30 * 60 * 1000;

function clampWhopTitle(value: string) {
  return value.trim().slice(0, 40);
}

function getPlatformIds() {
  const companyId = process.env.WHOP_COMPANY_ID?.trim() ?? "";
  const productId = process.env.WHOP_PRODUCT_ID?.trim() ?? "";

  if (!companyId || !companyId.startsWith("biz_")) {
    throw new Error("Missing or invalid WHOP_COMPANY_ID env var.");
  }

  if (!productId || !productId.startsWith("prod_")) {
    throw new Error("Missing or invalid WHOP_PRODUCT_ID env var.");
  }

  return { companyId, productId };
}

async function getExperienceDetails(whopSdk: unknown, experienceId: string) {
  const experience = await (whopSdk as {
    experiences: { retrieve: (id: string) => Promise<unknown> };
  }).experiences.retrieve(experienceId);

  const creatorCompanyId =
    (experience as { company?: { id?: string } }).company?.id?.trim() ?? "";

  // Whop API returns `products` as an array of attached products
  const products =
    (experience as { products?: Array<{ id?: string }> }).products ?? [];
  const creatorProductId = products[0]?.id?.trim() ?? "";

  return {
    creatorCompanyId,
    creatorProductId,
  };
}

function buildRedirectUrl(
  request: NextRequest,
  experienceId: string,
  devUserToken: string | undefined,
) {
  const url = new URL(`/experiences/${encodeURIComponent(experienceId)}`, request.nextUrl.origin);
  url.searchParams.set("checkout", "pending");
  if (devUserToken) {
    url.searchParams.set("whop-dev-user-token", devUserToken);
  }
  return url.toString();
}

export async function POST(request: NextRequest) {
  const route = "/api/whop/payments/create-submission-payment";
  const baseLog = {
    route,
    method: "POST",
  };

  try {
    const parsed = createSubmissionPaymentSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    const whopSdk = getWhopSdk();
    const convex = getConvexServerClient();

    const token = await whopSdk.verifyUserToken(
      parsed.data.whopDevUserToken || request.headers,
    );
    const viewerUserId = token.userId;

    const access = await whopSdk.users.checkAccess(parsed.data.experienceId, {
      id: viewerUserId,
    });

    if (!access.has_access) {
      return NextResponse.json({ error: "You do not have access to this experience." }, { status: 403 });
    }

    const user = await whopSdk.users.retrieve(viewerUserId);
    const viewerUserName = user.username?.trim() || user.name?.trim() || viewerUserId;

    const quote = await convex.query(api.payments.getRequestTypeQuote, {
      experienceId: parsed.data.experienceId,
      requestTypeId: parsed.data.requestTypeId as never,
    });

    if (parsed.data.attachmentToken && !quote.allowAttachments) {
      return NextResponse.json(
        { error: "Attachments are not enabled for this request." },
        { status: 400 },
      );
    }

    if (quote.price === 0) {
      await convex.mutation(api.submissions.createSubmission, {
        experienceId: parsed.data.experienceId,
        requestTypeId: parsed.data.requestTypeId as never,
        viewerUserId,
        viewerUserName,
        submissionText: parsed.data.submissionText,
        attachmentToken: parsed.data.attachmentToken,
      });

      await notifyAdminSubmissionCreated({
        experienceId: parsed.data.experienceId,
        creatorUserId: quote.creatorId,
        requesterUserName: viewerUserName,
        requestTypeTitle: quote.title,
      });

      logger.info("Free submission created without checkout", {
        ...baseLog,
        event: "whop.payment.free_submission.created",
        viewerUserId,
        experienceId: parsed.data.experienceId,
        requestTypeId: String(quote.requestTypeId),
      });

      return NextResponse.json(
        {
          status: "paid",
          submissionCreated: true,
          attemptId: null,
          checkoutConfigurationId: null,
          planId: null,
          purchaseUrl: null,
          redirectUrl: null,
        },
        { status: 200 },
      );
    }

    // Idempotency: return existing pending checkout if one matches
    const existingPending = await convex.query(api.payments.findPendingPaymentForUser, {
      experienceId: parsed.data.experienceId,
      requestTypeId: parsed.data.requestTypeId as never,
      viewerUserId,
      submissionText: parsed.data.submissionText,
      attachmentToken: parsed.data.attachmentToken,
      maxAgeMs: PENDING_CHECKOUT_TTL_MS,
    });

    if (existingPending?.whopCheckoutConfigurationId) {
      logger.info("Returning existing pending checkout (idempotent)", {
        ...baseLog,
        event: "whop.payment.idempotent_hit",
        viewerUserId,
        experienceId: parsed.data.experienceId,
        checkoutConfigurationId: existingPending.whopCheckoutConfigurationId,
        submissionPaymentId: String(existingPending.submissionPaymentId),
      });

      return NextResponse.json(
        {
          attemptId: String(existingPending.submissionPaymentId),
          checkoutConfigurationId: existingPending.whopCheckoutConfigurationId,
          planId: "",
          purchaseUrl: "",
          redirectUrl: buildRedirectUrl(
            request,
            parsed.data.experienceId,
            parsed.data.whopDevUserToken,
          ),
          status: "pending",
          submissionCreated: false,
        },
        { status: 200 },
      );
    }

    const { companyId, productId } = getPlatformIds();
    const { creatorCompanyId, creatorProductId } = await getExperienceDetails(
      whopSdk,
      parsed.data.experienceId,
    );

    const checkoutContextId = crypto.randomUUID();
    logger.info("Whop experience checkout context resolved", {
      ...baseLog,
      event: "whop.payment.company_id_resolved",
      viewerUserId,
      experienceId: parsed.data.experienceId,
      platformCompanyId: `${companyId.slice(0, 7)}***`,
      creatorCompanyId: creatorCompanyId ? `${creatorCompanyId.slice(0, 7)}***` : "none",
    });

    const preCheckout = await convex.mutation(api.payments.upsertSubmissionPayment, {
      checkoutConfigurationId: checkoutContextId,
      experienceId: parsed.data.experienceId,
      requestTypeId: parsed.data.requestTypeId as never,
      viewerUserId,
      viewerUserName,
      submissionText: parsed.data.submissionText,
      amountUsd: quote.price,
      attachmentToken: parsed.data.attachmentToken,
      expiresAt: Date.now() + PENDING_CHECKOUT_TTL_MS,
    });

    const submissionPaymentId = String((preCheckout as { _id?: string } | null)?._id ?? "");
    if (!submissionPaymentId) {
      throw new Error("Failed to create a submission payment attempt.");
    }

    let checkoutConfiguration: unknown;
    try {
      checkoutConfiguration = await (whopSdk as {
        checkoutConfigurations: {
          create: (input: unknown) => Promise<unknown>;
        };
      }).checkoutConfigurations.create({
        mode: "payment",
        plan: {
          company_id: companyId,
          product_id: productId,
          currency: "usd",
          plan_type: "one_time",
          initial_price: quote.price,
          title: clampWhopTitle(`Submission: ${quote.title}`),
          payment_method_configuration: {
            include_platform_defaults: true,
            enabled: ["platform_balance", "customer_balance"],
            disabled: [],
          },
        },
        redirect_url: buildRedirectUrl(
          request,
          parsed.data.experienceId,
          parsed.data.whopDevUserToken,
        ),
        metadata: {
          source: "creator-inbox",
          checkoutFlow: "submission",
          submissionPaymentId,
          checkoutConfigurationId: checkoutContextId,
          experienceId: parsed.data.experienceId,
          requestTypeId: String(quote.requestTypeId),
          viewerUserId,
          creatorCompanyId,
          creatorProductId,
        },
      });
    } catch (error) {
      await convex.mutation(api.payments.markSubmissionPaymentFailed, {
        submissionPaymentId: submissionPaymentId as never,
        errorMessage: "Whop checkout creation failed.",
      }).catch(() => {
        // Best-effort cleanup.
      });

      const message = getSafeErrorMessage(error);

      if (message.toLowerCase().includes("not authorized")) {
        throw new Error(
          "Unauthorized on checkoutConfigurations.create. Required scopes include checkout_configuration:create, checkout_configuration:basic:read, plan:create, access_pass:create, access_pass:update.",
        );
      }

      throw new Error(message);
    }

    const checkoutConfigurationId =
      (checkoutConfiguration as { id?: string }).id ?? "";
    const planId =
      (checkoutConfiguration as { plan?: { id?: string } }).plan?.id ?? "";
    const purchaseUrl =
      (checkoutConfiguration as { purchase_url?: string; purchaseUrl?: string }).purchase_url ??
      (checkoutConfiguration as { purchase_url?: string; purchaseUrl?: string }).purchaseUrl ??
      "";
    if (!checkoutConfigurationId || !planId || !purchaseUrl) {
      throw new Error("Checkout link creation succeeded but id/planId/url is missing.");
    }

    const redirectUrl = buildRedirectUrl(
      request,
      parsed.data.experienceId,
      parsed.data.whopDevUserToken,
    );

    await convex.mutation(api.payments.finalizeCheckoutConfiguration, {
      submissionPaymentId: submissionPaymentId as never,
      whopCheckoutConfigurationId: checkoutConfigurationId,
    });

    logger.info("Submission checkout link created", {
      ...baseLog,
      event: "whop.checkout_link.created",
      checkoutConfigurationId,
      checkoutContextId,
      productId,
      viewerUserId,
    });

    return NextResponse.json(
      {
        attemptId: submissionPaymentId,
        checkoutConfigurationId,
        planId,
        purchaseUrl,
        redirectUrl,
        status: "pending",
        submissionCreated: false,
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error("Create submission payment route failed", {
      ...baseLog,
      event: "whop.payment.create_failed",
      status: 500,
      errorMessage: getSafeErrorMessage(error),
    });

    return NextResponse.json(
      {
        error: "Please try again.",
      },
      { status: 500 },
    );
  }
}
