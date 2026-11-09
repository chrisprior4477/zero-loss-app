"use server";
import { createClient } from "@/lib/supabase/server";
import { isPreviewDataEnvironment } from "@/lib/preview/environment";
import type { AccountNotification } from "@/lib/account/notifications";
import { getDemoProduct } from "@/lib/catalog/demo-products";
import { getShoppingCatalog } from "@/lib/catalog/shopping-catalog";
import { parseSavedProductShares, savedShareHref } from "./saved-shares";

export async function sendDemoShare(requestId: string) {
  if (!isPreviewDataEnvironment()) return { ok: false, message: "Demo sharing is unavailable here." };
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(requestId)) return { ok: false, message: "Please try again." };
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { ok: false, message: "Sign in to send a demo share to your account." };
  const { data: shareId, error } = await db.rpc("send_demo_product_share", { p_request_id: requestId });
  if (error) return { ok: false, message: error.code === "P0001" ? error.message : "We couldn’t confirm your demo share. Try again safely." };
  // Return the confirmed receipt without waiting for a full account refresh.
  // A retry must also respect a receipt that has already been read.
  const [shares, read, catalog] = await Promise.all([
    db.rpc("get_received_product_shares"),
    db.from("customer_notification_reads").select("notification_id").eq("customer_id", user.id).eq("notification_id", `shared-${shareId}`).maybeSingle(),
    getShoppingCatalog(),
  ]);
  const share = shares.error ? undefined : parseSavedProductShares(shares.data)?.find(item => item.id === shareId);
  const product = share && getDemoProduct(share.slug);
  const available = Boolean(product && !catalog.hidden.has(product.slug));
  const notification: AccountNotification | undefined = share && available && !read.error ? {
    id: `shared-${shareId}`, category: "crew", tone: "crew", title: `${share.sender} shared ${share.title}`,
    body: "A pick shared with you.", meta: "Shared pick", action: "View shared item", preferenceKey: "crew_updates",
    image: product?.gallery[0]?.src,
    href: savedShareHref(share.id),
  } : undefined;
  return { ok: true, message: share && available
    ? `${share.sender} shared ${share.title}. Open Shared with You in your notifications.`
    : share ? "That shared prize is no longer available. Try Send demo share again for an open prize."
    : "Your demo share was saved. Refresh notifications to check its saved status.", notification, isRead: Boolean(read.data) };
}
