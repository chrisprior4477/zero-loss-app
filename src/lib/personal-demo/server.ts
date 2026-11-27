import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { createClient as isolatedClient } from "@supabase/supabase-js";
import { isPreviewDataEnvironment, PREVIEW_SUPABASE_URL } from "@/lib/preview/environment";

export const deviceCookie = "zl-personal-demo";
export const demoEnabled = () => isPreviewDataEnvironment() && Boolean(process.env.PERSONAL_DEMO_BRIDGE);
export const newSecret = () => randomBytes(32).toString("hex");
export const hash = (value: string) => createHash("sha256").update(value).digest("hex");
export const sign = (purpose: string, value: string) =>
  createHmac("sha256", process.env.PERSONAL_DEMO_BRIDGE!)
    .update(purpose + "|" + value)
    .digest("hex");
export function linkGeneration(token: string) {
  if (!/^[a-f0-9]{64}\.[a-f0-9]{64}$/.test(token)) return null;
  const [generation, signature] = token.split(".");
  return timingSafeEqual(Buffer.from(signature), Buffer.from(sign("share", generation))) ? generation : null;
}
export class DemoFailure extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function demoCommand(device: string, action: string, value = "", bucket = "") {
  if (!demoEnabled() || !/^[a-f0-9]{64}$/.test(device)) throw new DemoFailure(403, "Demo unavailable.");
  const response = await fetch(PREVIEW_SUPABASE_URL + "/functions/v1/personal-demo", {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(18000),
    headers: {
      "Content-Type": "application/json",
      apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      "x-demo-bridge": process.env.PERSONAL_DEMO_BRIDGE!,
    },
    body: JSON.stringify({ device: hash(device), action, value, bucket }),
  }).catch(() => {
    throw new DemoFailure(503, "Couldn’t reach your demo. Try again.");
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new DemoFailure(
      response.status,
      response.status === 409 && typeof body?.message === "string"
        ? body.message
        : "Couldn’t reach your demo. Try again.",
    );
  }
  return response.json();
}
// Request-scoped only. Never cache membership across requests or put a
// persona's Auth tokens in browser cookies, page props or client responses.
export const personalShoppingClient = cache(async (device: string) => {
  const result = await demoCommand(device, "session");
  if (result.missing) return null;
  if (!result.access || !result.refresh) throw new DemoFailure(503, "Demo session unavailable.");
  const db = isolatedClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    },
  );
  const { data, error } = await db.auth.setSession({
    access_token: result.access,
    refresh_token: result.refresh,
  });
  if (error || data.user?.id !== result.subject || data.user?.app_metadata.personal_demo !== true)
    throw new DemoFailure(503, "Demo session unavailable.");
  return db;
});
export async function deviceFromBrowser() {
  if (!demoEnabled()) return null;
  const value = (await cookies()).get(deviceCookie)?.value;
  return value && /^[a-f0-9]{64}$/.test(value) ? value : null;
}
