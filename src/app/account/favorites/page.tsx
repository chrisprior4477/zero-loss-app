import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FavoritesView } from "@/components/favorites/FavoritesView";
import { getAccountContext } from "@/lib/account/context";
import { authNavigationHref } from "@/lib/auth/entry-return";
import { getOfferingAvailability } from "@/lib/catalog/availability-reader";
import { accountRoutes } from "@/lib/account/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Favorites" };

export default async function FavoritesPage() {
  const account = await getAccountContext();
  if (!account) redirect(authNavigationHref("/login", accountRoutes.favorites));
  const availability = await getOfferingAvailability();
  const db = await createClient();
  const [alerts, preference] = await Promise.all([
    db.from("customer_favorites").select("product_slug,email_almost_full_enabled").eq("customer_id", account.userId),
    db.rpc("get_favorite_alert_email_enabled"),
  ]);
  return <FavoritesView availability={availability}
    initialAlerts={alerts.error ? null : Object.fromEntries((alerts.data ?? []).map(row => [row.product_slug, row.email_almost_full_enabled === true]))}
    emailEnabled={preference.error ? null : preference.data === true} />;
}
