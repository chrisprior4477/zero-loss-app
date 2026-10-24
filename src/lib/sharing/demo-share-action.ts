"use server";
import { createClient } from "@/lib/supabase/server";
import { isPreviewDataEnvironment } from "@/lib/preview/environment";
import type { AccountNotification } from "@/lib/account/notifications";
import { getDemoProduct } from "@/lib/catalog/demo-products";

export async function sendDemoShare(requestId: string) {
  if (!isPreviewDataEnvironment()) return { ok: false, message: "Demo sharing is unavailable here." };
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(requestId)) return { ok: false, message: "Please try again." };
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { ok: false, message: "Sign in to send a demo share to your account." };
  const { data: shareId, error } = await db.rpc("send_demo_product_share", { p_request_id: requestId });
  if (error) return { ok: false, message: "We couldn’t confirm your demo share. Try again safely." };
  // Return the confirmed receipt without waiting for a full account refresh.
  // A retry must also respect a receipt that has already been read.
  const [share, read] = await Promise.all([
    db.from("received_product_shares").select("token").eq("recipient_id", user.id).eq("id", shareId).maybeSingle(),
    db.from("customer_notification_reads").select("notification_id").eq("customer_id", user.id).eq("notification_id", `shared-${shareId}`).maybeSingle(),
  ]);
  const notification: AccountNotification | undefined = share.data && !share.error && !read.error ? {
    id: `shared-${shareId}`, category: "crew", tone: "crew", title: "Chris shared $100 Walmart Gift Card",
    body: "A pick shared with you.", meta: "Shared pick", action: "View shared item", preferenceKey: "crew_updates",
    image: getDemoProduct("walmart-100-gift-card")?.gallery[0]?.src,
    href: `/items/walmart-100-gift-card?share=${encodeURIComponent(share.data.token)}`,
  } : undefined;
  return { ok: true, message: "Chris shared a $100 Walmart gift card. Open Shared picks in your notifications.", notification, isRead: Boolean(read.data) };
}
