import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FavoritesView } from "@/components/favorites/FavoritesView";
import { getShoppingCatalog } from "@/lib/catalog/shopping-catalog";
import { authNavigationHref } from "@/lib/auth/entry-return";
import { accountRoutes } from "@/lib/account/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseSavedProductShareList, shareUuid } from "@/lib/sharing/saved-shares";
import { accountPageReturnPath } from "@/lib/auth/account-return";

export const metadata: Metadata = { title: "Favorites & Sent to You" };

export default async function FavoritesPage({ searchParams }: { searchParams: Promise<{ tab?: string; share?: string; item?: string; view?: string; watch?: string }> }) {
  const params = await searchParams;
  const item = typeof params.item === "string" ? params.item.toLowerCase() : undefined;
  const invalidSharedView = params.tab === "shared" && params.view !== undefined && params.view !== "available" && params.view !== "declined";
  const invalidTab = params.tab !== undefined && params.tab !== "favorites" && params.tab !== "shared";
  const invalidWatch = params.watch !== undefined && params.watch !== "1";
  const safeShare = typeof params.share === "string" && shareUuid.test(params.share) ? params.share.toLowerCase() : undefined;
  const tab = safeShare || params.tab === "shared" ? "shared" : "favorites";
  const returnPath = accountPageReturnPath(accountRoutes.favorites, { ...params,
    tab: tab === "shared" ? tab : undefined, view: invalidSharedView ? undefined : params.view,
    watch: invalidWatch ? undefined : params.watch, item: item && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item) ? item : undefined, share: safeShare,
  }, tab === "shared" ? "#saved-items-heading" : "");
  const { account, hidden, availability } = await getShoppingCatalog();
  if (!account) redirect(authNavigationHref("/login", returnPath));
  const db = await createClient();
  const [alerts, preference, shares] = await Promise.all([
    db.from("customer_favorites").select("product_slug,email_almost_full_enabled").eq("customer_id", account.userId),
    db.rpc("get_favorite_alert_email_enabled"),
    db.rpc("get_saved_product_shares"),
  ]);
  const shareList = shares.error ? null : parseSavedProductShareList(shares.data);
  const savedShares = shareList?.shares ?? null;
  const selectedShare = tab === "shared" ? savedShares?.find(share => share.id === safeShare) : null;
  const sharedView = selectedShare ? (selectedShare.declinedAt ? "declined" : "available") : params.view === "declined" ? "declined" : "available";
  return <FavoritesView key={`${params.tab ?? "favorites"}:${safeShare ?? ""}:${item ?? ""}:${params.view ?? ""}`} availability={availability} hiddenSlugs={[...hidden]}
    obsoleteFilter={invalidSharedView || invalidTab || invalidWatch ? returnPath : undefined}
    initialSharedView={sharedView}
    initialFavoriteFilter={params.watch === "1" ? "watching" : "all"}
    initialTab={tab} initialShareId={safeShare ?? (typeof params.share === "string" ? params.share : undefined)} initialItem={item}
    initialShares={savedShares} sharesIncomplete={shareList?.incomplete}
    initialAlerts={alerts.error ? null : Object.fromEntries((alerts.data ?? []).map(row => [row.product_slug, row.email_almost_full_enabled === true]))}
    emailEnabled={preference.error ? null : preference.data === true} />;
}
