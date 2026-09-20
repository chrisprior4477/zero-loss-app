import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NotificationsCenter } from "@/components/account/NotificationsCenter";
import { getAccountContext } from "@/lib/account/context";
import { buildAccountNotifications } from "@/lib/account/notifications";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const account = await getAccountContext();
  if (!account) redirect("/login");
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
    href: "/account/crew?tab=requests",
    action: "Review request",
    visualLabel: "Your Crew",
    visualValue: "Approval needed",
    tone: "crew" as const,
    crewRequestId: request.id,
  }));
  const notifications = [...crewNotifications, ...buildAccountNotifications(account.activity, account.wallet, account.emailConfirmed)];
  const { data: readRows, error: readError } = await db.from("customer_notification_reads")
    .select("notification_id").eq("customer_id", account.userId)
    .in("notification_id", notifications.map((notification) => notification.id));
  return <NotificationsCenter
    notifications={notifications}
    initialReadIds={(readRows ?? []).map((row) => row.notification_id)}
    activityAvailable={account.activity.source !== "unavailable"}
    walletAvailable={account.wallet !== null}
    crewAvailable={!crewError}
    readAvailable={!readError}
  />;
}
