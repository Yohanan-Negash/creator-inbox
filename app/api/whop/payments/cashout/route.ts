import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import { getSafeErrorMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getWhopSdk } from "@/lib/whop";
import { getConvexServerClient } from "@/lib/convex-server";

const cashoutSchema = z.object({
  experienceId: z.string().min(1),
  whopDevUserToken: z.string().optional(),
});

function roundUsd(value: number) {
  return Math.round(value * 100) / 100;
}

function getPlatformCompanyId() {
  const companyId = process.env.WHOP_COMPANY_ID?.trim() ?? "";
  if (!companyId || !companyId.startsWith("biz_")) {
    throw new Error("Missing or invalid WHOP_COMPANY_ID env var.");
  }

  return companyId;
}

async function getExperienceCompanyId(whopSdk: unknown, experienceId: string) {
  const experience = await (whopSdk as {
    experiences: { retrieve: (id: string) => Promise<unknown> };
  }).experiences.retrieve(experienceId);

  const companyId =
    (experience as { company?: { id?: string } }).company?.id?.trim() ?? "";

  if (!companyId || !companyId.startsWith("biz_")) {
    throw new Error("Unable to resolve destination company for cashout.");
  }

  return companyId;
}

export async function POST(request: NextRequest) {
  const route = "/api/whop/payments/cashout";

  try {
    const parsed = cashoutSchema.safeParse(await request.json());
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

    if (access.access_level !== "admin") {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const metrics = await convex.query(api.submissions.getAdminMetrics, {
      experienceId: parsed.data.experienceId,
      viewerUserId,
    });

    const grossBalance = roundUsd(metrics.balanceAvailable ?? 0);
    if (grossBalance <= 0) {
      return NextResponse.json({ error: "No balance available to cash out." }, { status: 400 });
    }

    const originCompanyId = getPlatformCompanyId();
    const destinationCompanyId = await getExperienceCompanyId(whopSdk, parsed.data.experienceId);

    if (destinationCompanyId === originCompanyId) {
      return NextResponse.json(
        { error: "Destination company cannot match platform company." },
        { status: 400 },
      );
    }

    const creatorAmountUsd = roundUsd(grossBalance * 0.9);
    const platformFeeUsd = roundUsd(grossBalance - creatorAmountUsd);

    if (creatorAmountUsd <= 0) {
      return NextResponse.json(
        { error: "Balance is too low to cash out after platform split." },
        { status: 400 },
      );
    }

    const pendingCashout = await convex.mutation(api.payments.getOrCreatePendingCashout, {
      experienceId: parsed.data.experienceId,
      creatorUserId: viewerUserId,
      destinationCompanyId,
      originCompanyId,
      grossAmountUsd: grossBalance,
      creatorAmountUsd,
      platformFeeUsd,
      currency: "usd",
    });

    if (!pendingCashout) {
      throw new Error("Unable to create cashout.");
    }

    const transfer = await (whopSdk as {
      transfers: {
        create: (input: unknown) => Promise<unknown>;
      };
    }).transfers.create({
      amount: creatorAmountUsd,
      currency: "usd",
      origin_id: originCompanyId,
      destination_id: destinationCompanyId,
      idempotence_key: pendingCashout.idempotenceKey,
      notes: "Creator Inbox cashout",
      metadata: {
        source: "creator-inbox",
        experienceId: parsed.data.experienceId,
        creatorUserId: viewerUserId,
        cashoutId: String(pendingCashout._id),
        grossAmountUsd: grossBalance,
        creatorAmountUsd,
        platformFeeUsd,
      },
    });

    const transferId = (transfer as { id?: string }).id;

    await convex.mutation(api.payments.finalizeCashout, {
      cashoutId: pendingCashout._id,
      viewerUserId,
      transferId,
    });

    logger.info("Cashout completed", {
      route,
      method: "POST",
      event: "whop.payment.cashout.completed",
      experienceId: parsed.data.experienceId,
      viewerUserId,
      destinationCompanyId: `${destinationCompanyId.slice(0, 7)}***`,
      grossAmountUsd: grossBalance,
      creatorAmountUsd,
      platformFeeUsd,
      transferId,
    });

    return NextResponse.json(
      {
        success: true,
        grossAmountUsd: grossBalance,
        creatorAmountUsd,
        platformFeeUsd,
        transferId: transferId ?? null,
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error("Cashout route failed", {
      route,
      method: "POST",
      event: "whop.payment.cashout.failed",
      status: 500,
      errorMessage: getSafeErrorMessage(error),
    });

    return NextResponse.json({ error: getSafeErrorMessage(error) }, { status: 500 });
  }
}
