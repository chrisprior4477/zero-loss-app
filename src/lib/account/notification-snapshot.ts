import "server-only";
import { cache } from "react";
import { getAccountContext } from "./context";
import { buildAccountNotifications, buildOrderNotifications, parseNotificationPreferences, type AccountNotification } from "./notifications";
import { getAccountOrders } from "./orders";
import { createClient } from "@/lib/supabase/server";
import { supportNotifications } from "@/lib/support/notifications";
import { parseDemoWalletHistoryVisibility } from "@/lib/wallet/demo-history";
import { getDemoProduct } from "@/lib/catalog/demo-products";
import { getRecentLedgerHistory } from "@/lib/wallet/history";
export const getNotificationSnapshot = cache(async () => {
  const account = await getAccountContext();
  if (!account) return null;
  const db = await createClient();
  const supportEnabled = true;
  const [crew, support, visibility, alertPreferences, shares, orders, ledger] = await Promise.all([
    db.from("crew_invitations").select("id,requester_name,created_at,status,automatic_connection").eq("recipient_id", account.userId).or("status.eq.pending,and(status.eq.accepted,automatic_connection.eq.true)").order("created_at", { ascending: false }),
    // Keep explicit ownership even for members who can staff the support inbox.
    db.from("support_cases").select("id,subject,status,updated_at").eq("customer_id", account.userId).order("updated_at", { ascending: false }).limit(50),
    account.wallet?.scope === "demo" ? db.rpc("get_demo_wallet_history_visibility") : Promise.resolve(null),
    db.rpc("get_in_app_alert_preferences"),
    db.rpc("get_received_product_shares"),
    account.orders.source === "unavailable" ? getAccountOrders(db).catch(() => null) : Promise.resolve(account.orders),
    getRecentLedgerHistory(account.userId, account.wallet).catch(() => null),
  ]);
  const { data: crewRequests, error: crewError } = crew;
  let hiddenWalletIds: string[] = [];
  let resetAt: string | null = null;
  if (visibility && !visibility.error) {
    try {
      const archive = parseDemoWalletHistoryVisibility(visibility.data);
      hiddenWalletIds = archive.ledgerEntryIds;
      resetAt = archive.notificationResetAt ?? null;
    } catch { /* Keep notices visible if their archive state cannot be verified. */ }
  }
  const afterReset = (createdAt: string) => !resetAt || Date.parse(createdAt) > Date.parse(resetAt);
  const crewNotifications = (crewRequests ?? []).filter(request => afterReset(request.created_at)).map((request) => ({
    id: `crew-${request.id}`,
    category: "crew" as const,
    title: request.automatic_connection ? `${request.requester_name} is now in your Crew` : `${request.requester_name} wants to join your Crew`,
    body: request.automatic_connection ? "Receive shared finds, choose whether to share back, or leave this connection." : "Approve or decline this request. Accepting never shares your past entries automatically.",
    meta: request.automatic_connection ? "Crew connection" : "Crew request",
    href: request.automatic_connection ? `/account/crew?request=${request.id}` : `/account/crew?tab=requests&request=${request.id}#crew-request-${request.id}`,
    action: request.automatic_connection ? "Manage connection" : "Review request",
    visualLabel: "Your Crew",
    visualValue: request.automatic_connection ? "Connected" : "Approval needed",
    tone: "crew" as const,
    crewRequestId: request.automatic_connection ? undefined : request.id,
    preferenceKey: "crew_updates" as const,
  }));
  const sharedNotifications = (Array.isArray(shares.data) ? shares.data : []).filter(share => afterReset(share.createdAt)).map((share: { id: string; title: string; sender: string; slug: string; token: string; createdAt: string }) => ({ id: `shared-${share.id}`, category: "crew" as const, tone: "crew" as const, title: `${share.sender} shared ${share.title}`, body: "An item shared with you.", image: getDemoProduct(share.slug)?.gallery[0]?.src, meta: "Shared with You", href: `/account/favorites?tab=shared&share=${encodeURIComponent(share.id)}`, action: "View shared item", preferenceKey: "crew_updates" as const }));
  const notifications: AccountNotification[] = [...sharedNotifications, ...supportNotifications((support.data ?? []).filter(row => afterReset(row.updated_at))), ...crewNotifications,
    ...buildOrderNotifications(orders?.orders ?? []),
    ...buildAccountNotifications(account.activity, account.wallet && ledger ? { ...account.wallet, entries: ledger } : account.wallet, account.emailConfirmed, hiddenWalletIds)
      // The reset already archives entries, orders and ledger records atomically.
      // This one-time account notice otherwise survives every demo reset.
      .filter(notification => !resetAt || notification.id !== "account-email-confirmed")];
  const { data: readRows, error: readError } = await db.from("customer_notification_reads")
    .select("notification_id").eq("customer_id", account.userId)
    .in("notification_id", notifications.map((notification) => notification.id));

  // Claim/purchase completion is already persisted by the authoritative account
  // action. Derive acknowledgement from that record, including older rewards.
  const readIds = [...new Set([...(readRows ?? []).map(row => row.notification_id), ...notifications.filter(n => n.resolved).map(n => n.id)])];
  return { notifications, readIds, readAvailable: !readError, preferences: alertPreferences.error ? null : parseNotificationPreferences(alertPreferences.data), supportEnabled, supportAvailable: !support.error, crewAvailable: !crewError, ordersAvailable: orders !== null };
});
