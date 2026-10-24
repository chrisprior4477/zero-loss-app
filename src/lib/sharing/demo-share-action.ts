"use server";
import { createClient } from "@/lib/supabase/server";
import { isPreviewDataEnvironment } from "@/lib/preview/environment";

export async function sendDemoShare(requestId: string) {
  if (!isPreviewDataEnvironment()) return { ok: false, message: "Demo sharing is unavailable here." };
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(requestId)) return { ok: false, message: "Please try again." };
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { ok: false, message: "Sign in to send a demo share to your account." };
  const { error } = await db.rpc("send_demo_product_share", { p_request_id: requestId });
  return error ? { ok: false, message: "We couldn’t confirm your demo share. Try again safely." } : { ok: true, message: "Chris shared a $100 Walmart gift card. Open Shared picks in your notifications." };
}
