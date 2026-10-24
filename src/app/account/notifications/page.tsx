import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NotificationsCenter } from "@/components/account/NotificationsCenter";
import { getAccountContext } from "@/lib/account/context";
import { getNotificationSnapshot } from "@/lib/account/notification-snapshot";
import { createClient } from "@/lib/supabase/server";
import { authNavigationHref } from "@/lib/auth/entry-return";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const account = await getAccountContext();
  if (!account) redirect(authNavigationHref("/login", "/account/notifications"));
  const db = await createClient();
  const snapshot = (await getNotificationSnapshot())!;
  const { data: outcomeEmailEnabled, error: outcomeEmailError } = await db.rpc("get_entry_outcome_email_enabled");
  const { data: favoriteAlertEmailEnabled, error: favoriteAlertEmailError } = await db.rpc("get_favorite_alert_email_enabled");
  const { data: purchaseOptionEmailEnabled, error: purchaseOptionEmailError } = await db.rpc("get_purchase_option_email_enabled");
  const { data: crewWinEmailEnabled, error: crewWinEmailError } = await db.rpc("get_crew_win_email_enabled");
  return <>{!snapshot.supportAvailable ? <p role="status" className="mx-auto max-w-6xl rounded-xl border border-cyan-300/30 bg-[#001b3d] p-4 text-sm">Support updates couldn’t be loaded. Your other notifications are still available.</p> : null}<NotificationsCenter
    supportEnabled={snapshot.supportEnabled}
    notifications={snapshot.notifications}
    initialReadIds={snapshot.readIds}
    activityAvailable={account.activity.source !== "unavailable"}
    walletAvailable={account.wallet !== null}
    crewAvailable={snapshot.crewAvailable}
    readAvailable={snapshot.readAvailable}
    ordersAvailable={snapshot.ordersAvailable}
    initialAlertPreferences={snapshot.preferences}
    outcomeEmailEnabled={outcomeEmailError || typeof outcomeEmailEnabled !== "boolean" ? null : outcomeEmailEnabled}
    favoriteAlertEmailEnabled={favoriteAlertEmailError || typeof favoriteAlertEmailEnabled !== "boolean" ? null : favoriteAlertEmailEnabled}
    purchaseOptionEmailEnabled={purchaseOptionEmailError || typeof purchaseOptionEmailEnabled !== "boolean" ? null : purchaseOptionEmailEnabled}
    crewWinEmailEnabled={crewWinEmailError || typeof crewWinEmailEnabled !== "boolean" ? null : crewWinEmailEnabled}
    overview={{ balanceLabel: account.balanceLabel, fundingEnabled: account.fundingEnabled, activity: account.activity }}
  /></>;
}
