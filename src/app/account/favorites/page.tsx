import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FavoritesView } from "@/components/favorites/FavoritesView";
import { getShoppingCatalog } from "@/lib/catalog/shopping-catalog";
import { authNavigationHref } from "@/lib/auth/entry-return";
import { accountRoutes } from "@/lib/account/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseSavedProductShareList } from "@/lib/sharing/saved-shares";
import { accountPageReturnPath } from "@/lib/auth/account-return";

export const metadata: Metadata = { title: "Favorites & Sent to You" };

export default async function FavoritesPage({ searchParams }: { searchParams: Promise<{ tab?: string; share?: string; item?: string; view?: string; watch?: string }> }) {
  const params = await searchParams;
  const item = typeof params.item === "string" ? params.item.toLowerCase() : undefined;
  const invalidSharedView = params.tab === "shared" && params.view !== undefined && params.view !== "available" && params.view !== "declined";
  const returnPath = accountPageReturnPath(accountRoutes.favorites, invalidSharedView ? { ...params, view: undefined } : params);
  const { account, hidden, availability } = await getShoppingCatalog();
  if (!account) redirect(authNavigationHref("/login", returnPath));
  if (invalidSharedView) redirect(returnPath);
  const db = await createClient();
  const [alerts, preference, shares] = await Promise.all([
    db.from("customer_favorites").select("product_slug,email_almost_full_enabled").eq("customer_id", account.userId),
    db.rpc("get_favorite_alert_email_enabled"),
    db.rpc("get_saved_product_shares"),
  ]);
  const shareList = shares.error ? null : parseSavedProductShareList(shares.data);
  const savedShares = shareList?.shares ?? null;
  const selectedShare = params.tab === "shared" ? savedShares?.find(share => share.id === params.share) : null;
  const sharedView = selectedShare ? (selectedShare.declinedAt ? "declined" : "available") : params.view === "declined" ? "declined" : "available";
  return <FavoritesView key={`${params.tab ?? "favorites"}:${params.share ?? ""}:${item ?? ""}:${params.view ?? ""}`} availability={availability} hiddenSlugs={[...hidden]}
    initialSharedView={sharedView}
    initialFavoriteFilter={params.watch === "1" ? "watching" : "all"}
    initialTab={params.tab === "shared" ? "shared" : "favorites"} initialShareId={params.share} initialItem={item}
    initialShares={savedShares} sharesIncomplete={shareList?.incomplete}
    initialAlerts={alerts.error ? null : Object.fromEntries((alerts.data ?? []).map(row => [row.product_slug, row.email_almost_full_enabled === true]))}
    emailEnabled={preference.error ? null : preference.data === true} />;
}
