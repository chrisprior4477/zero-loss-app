import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NotificationsCenter } from "@/components/account/NotificationsCenter";
import { getAccountContext } from "@/lib/account/context";
import { buildAccountNotifications } from "@/lib/account/notifications";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const account = await getAccountContext();
  if (!account) redirect("/login");
  return <NotificationsCenter
    notifications={buildAccountNotifications(account.activity, account.wallet, account.emailConfirmed)}
    activityAvailable={account.activity.source !== "unavailable"}
    walletAvailable={account.wallet !== null}
  />;
}
