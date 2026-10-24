import "server-only";
import { cache } from "react";
import { getAccountContext } from "./context";
import { buildAccountNotifications, buildOrderNotifications, parseNotificationPreferences } from "./notifications";
import { getAccountOrders } from "./orders";
import { createClient } from "@/lib/supabase/server";
import { supportNotifications } from "@/lib/support/notifications";
import { parseDemoWalletHistoryVisibility } from "@/lib/wallet/demo-history";
export const getNotificationSnapshot = cache(async () => {
  const account = await getAccountContext();
  if (!account) return null;
  const db = await createClient();
  const { data: crewRequests, error: crewError } = await db.from("crew_invitations")
    .select("id,requester_name,created_at").eq("recipient_id", account.userId).eq("status", "pending")
    .order("created_at", { ascending: false });
  const crewNotifications = (crewRequests ?? []).map((request) => ({
    id: `crew-${request.id}`,
    category: "crew" as const,
    title: `${request.requester_name} wants to join your Crew`,
    body: "Approve or decline this request. Accepting never shares your past entries automatically.",
    meta: "Crew request",
    href: `/account/crew?tab=requests&request=${request.id}#crew-request-${request.id}`,
    action: "Review request",
    visualLabel: "Your Crew",
    visualValue: "Approval needed",
    tone: "crew" as const,
    crewRequestId: request.id,
    preferenceKey: "crew_updates" as const,
  }));
  // Explicit owner filter is required even when the signed-in owner is also
  // allowed to review other customers' cases in the private support inbox.
  const support = await db.from("support_cases").select("id,subject,status,updated_at")
    .eq("customer_id", account.userId).order("updated_at", { ascending: false }).limit(50);
  let hiddenWalletIds: string[] = [];
  if (account.wallet?.scope === "demo") {
    const visibility = await db.rpc("get_demo_wallet_history_visibility");
    if (!visibility.error) {
      try { hiddenWalletIds = parseDemoWalletHistoryVisibility(visibility.data).ledgerEntryIds; }
      catch { /* Keep the original history visible if its archive state is invalid. */ }
    }
  }
  const [orders, alertPreferences] = await Promise.all([
    getAccountOrders(db).catch(() => null),
    db.rpc("get_in_app_alert_preferences"),
  ]);
  const shares = await db.rpc("get_received_product_shares");
  const sharedNotifications = (Array.isArray(shares.data) ? shares.data : []).map((share: { id: string; title: string; sender: string; slug: string; token: string; createdAt: string }) => ({ id: `shared-${share.id}`, category: "crew" as const, tone: "crew" as const, title: `${share.sender} shared ${share.title}`, body: "A pick shared with you.", meta: "Shared pick", href: `/items/${encodeURIComponent(share.slug)}?share=${encodeURIComponent(share.token)}`, action: "View shared item", preferenceKey: "crew_updates" as const }));
  const notifications = [...sharedNotifications, ...supportNotifications(support.data), ...crewNotifications,
    ...buildOrderNotifications(orders?.orders ?? []),
    ...buildAccountNotifications(account.activity, account.wallet, account.emailConfirmed, hiddenWalletIds)];
  const { data: readRows, error: readError } = await db.from("customer_notification_reads")
    .select("notification_id").eq("customer_id", account.userId)
    .in("notification_id", notifications.map((notification) => notification.id));

  return { notifications, readIds: (readRows ?? []).map(row => row.notification_id), readAvailable: !readError, preferences: alertPreferences.error ? null : parseNotificationPreferences(alertPreferences.data), supportAvailable: !support.error, crewAvailable: !crewError, ordersAvailable: orders !== null };
});
