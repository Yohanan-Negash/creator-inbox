import { NextRequest, NextResponse } from "next/server";
import { getWhopSdk } from "@/lib/whop";

export async function GET(request: NextRequest) {
  const experienceId = request.nextUrl.searchParams.get("experienceId");
  const devUserToken = request.nextUrl.searchParams.get("whop-dev-user-token");

  try {
    const whopSdk = getWhopSdk();

    let userId = "";
    try {
      const token = await whopSdk.verifyUserToken(
        devUserToken || request.headers,
      );
      userId = token.userId;
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await whopSdk.users.retrieve(userId);

    if (!experienceId) {
      return NextResponse.json({ user }, { status: 200 });
    }

    const access = await whopSdk.users.checkAccess(experienceId, { id: userId });

    return NextResponse.json(
      {
        user,
        experienceId,
        access,
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
