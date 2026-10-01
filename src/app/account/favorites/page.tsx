import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FavoritesView } from "@/components/favorites/FavoritesView";
import { getAccountContext } from "@/lib/account/context";
import { authNavigationHref } from "@/lib/auth/entry-return";
import { getOfferingAvailability } from "@/lib/catalog/availability-reader";
import { accountRoutes } from "@/lib/account/navigation";

export const metadata: Metadata = { title: "Favorites" };

export default async function FavoritesPage() {
  const account = await getAccountContext();
  if (!account) redirect(authNavigationHref("/login", accountRoutes.favorites));
  const availability = await getOfferingAvailability();
  return <FavoritesView availability={availability} />;
}
