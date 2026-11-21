import { PreferenceSnapshot } from "@/components/account/PreferenceSnapshot";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NotificationsCenter } from "@/components/account/NotificationsCenter";
import { getAccountContext } from "@/lib/account/context";
import { getNotificationSnapshot } from "@/lib/account/notification-snapshot";
import { createClient } from "@/lib/supabase/server";
import { notificationFilter, notificationHref, validNotice } from "@/lib/account/notification-return";
import { authNavigationHref } from "@/lib/auth/entry-return";
import { matchingQueryValue } from "@/lib/navigation/query-value";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage({ searchParams }: { searchParams?: Promise<{ filter?: string | string[]; notice?: string | string[]; section?: string | string[] }> }) {
  const query = await searchParams;
  const requestedFilter = matchingQueryValue(query?.filter);
  const filter = notificationFilter(requestedFilter);
  const obsoleteFilter = query?.filter !== undefined && requestedFilter !== filter;
  const notice = validNotice(query?.notice) ? query.notice : undefined;
  const [listPath] = notificationHref(filter, notice).split("#");
  const notificationDestination = listPath + (query?.section === "email" ? "#email-choices" : "#notification-tickets-filters");
  const account = await getAccountContext();
  if (!account) {
    redirect(authNavigationHref("/login", notificationDestination) + "&focus=email#login-form");
  }
  if (Array.isArray(query?.filter) && !obsoleteFilter) {
    redirect(notificationDestination);
  }
  const db = await createClient();
  const snapshot = (await getNotificationSnapshot())!;
  const { data: outcomeEmailEnabled, error: outcomeEmailError } = await db.rpc("get_entry_outcome_email_enabled");
  const { data: favoriteAlertEmailEnabled, error: favoriteAlertEmailError } = await db.rpc("get_favorite_alert_email_enabled");
  const { data: purchaseOptionEmailEnabled, error: purchaseOptionEmailError } = await db.rpc("get_purchase_option_email_enabled");
  const { data: crewWinEmailEnabled, error: crewWinEmailError } = await db.rpc("get_crew_win_email_enabled");
  return <PreferenceSnapshot><>{!snapshot.supportAvailable ? <p role="status" className="mx-auto max-w-6xl rounded-xl border border-cyan-300/30 bg-[#001b3d] p-4 text-sm">Support updates couldn’t be loaded. Your other notifications are still available.</p> : null}<NotificationsCenter
    key={`${filter}:${notice ?? ""}`}
    initialFilter={filter}
    obsoleteFilter={obsoleteFilter}
    initialNotice={notice}
    userId={account.userId}
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
  /></></PreferenceSnapshot>;
}
