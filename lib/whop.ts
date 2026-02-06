import Whop from "@whop/sdk";

export function getWhopSdk() {
  const appID =
    process.env.NEXT_PUBLIC_WHOP_APP_ID ?? process.env.WHOP_APP_ID ?? "";
  const apiKey = process.env.WHOP_API_KEY ?? "";

  if (!appID) {
    throw new Error(
      "Missing Whop app id. Set NEXT_PUBLIC_WHOP_APP_ID or WHOP_APP_ID.",
    );
  }

  if (!apiKey) {
    throw new Error("Missing WHOP_API_KEY.");
  }

  return new Whop({
    appID,
    apiKey,
  });
}
