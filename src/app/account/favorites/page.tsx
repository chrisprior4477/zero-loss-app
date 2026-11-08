import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FavoritesView } from "@/components/favorites/FavoritesView";
import { getShoppingCatalog } from "@/lib/catalog/shopping-catalog";
import { authNavigationHref } from "@/lib/auth/entry-return";
import { accountRoutes } from "@/lib/account/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseSavedProductShares } from "@/lib/sharing/saved-shares";
import { accountPageReturnPath } from "@/lib/auth/account-return";

export const metadata: Metadata = { title: "Favorites & Sent to You" };

export default async function FavoritesPage({ searchParams }: { searchParams: Promise<{ tab?: string; share?: string; item?: string }> }) {
  const params = await searchParams;
  const { account, hidden, availability } = await getShoppingCatalog();
  if (!account) redirect(authNavigationHref("/login", accountPageReturnPath(accountRoutes.favorites, params)));
  const db = await createClient();
  const [alerts, preference, shares] = await Promise.all([
    db.from("customer_favorites").select("product_slug,email_almost_full_enabled").eq("customer_id", account.userId),
    db.rpc("get_favorite_alert_email_enabled"),
    db.rpc("get_saved_product_shares"),
  ]);
  return <FavoritesView key={`${params.tab ?? "favorites"}:${params.share ?? ""}:${params.item ?? ""}`} availability={availability} hiddenSlugs={[...hidden]}
    initialTab={params.tab === "shared" ? "shared" : "favorites"} initialShareId={params.share} initialItem={params.item}
    initialShares={shares.error ? null : parseSavedProductShares(shares.data)}
    initialAlerts={alerts.error ? null : Object.fromEntries((alerts.data ?? []).map(row => [row.product_slug, row.email_almost_full_enabled === true]))}
    emailEnabled={preference.error ? null : preference.data === true} />;
}
