import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NotificationsCenter } from "@/components/account/NotificationsCenter";
import { getAccountContext } from "@/lib/account/context";
import { buildAccountNotifications } from "@/lib/account/notifications";
import { createClient } from "@/lib/supabase/server";
import { supportNotifications } from "@/lib/support/notifications";

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
  // Explicit owner filter is required even when the signed-in owner is also
  // allowed to review other customers' cases in the private support inbox.
  const support = await db.from("support_cases").select("id,subject,status,updated_at")
    .eq("customer_id", account.userId).order("updated_at", { ascending: false }).limit(50);
  const notifications = [...supportNotifications(support.data), ...crewNotifications, ...buildAccountNotifications(account.activity, account.wallet, account.emailConfirmed)];
  const { data: readRows, error: readError } = await db.from("customer_notification_reads")
    .select("notification_id").eq("customer_id", account.userId)
    .in("notification_id", notifications.map((notification) => notification.id));
  return <>{support.error ? <p role="status" className="mx-auto max-w-6xl rounded-xl border border-cyan-300/30 bg-[#001b3d] p-4 text-sm">Support updates couldn’t be loaded. Your other notifications are still available.</p> : null}<NotificationsCenter
    notifications={notifications}
    initialReadIds={(readRows ?? []).map((row) => row.notification_id)}
    activityAvailable={account.activity.source !== "unavailable"}
    walletAvailable={account.wallet !== null}
    crewAvailable={!crewError}
    readAvailable={!readError}
  /></>;
}
