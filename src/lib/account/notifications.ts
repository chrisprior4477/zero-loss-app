import { activityHref, walletRewardHref, type AccountActivity, type ActivityItem } from "./activity";
import { formatUsdFromCents } from "@/lib/wallet/money";
import type { WalletSnapshot } from "@/lib/wallet/snapshot";

export type NotificationCategory = "action" | "account" | "activity" | "orders";
export type AccountNotification = {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  meta: string;
  href: string;
  action: string;
  image?: string;
  visualLabel?: string;
  visualValue?: string;
  tone: "reward" | "active" | "completion" | "wallet" | "account" | "order";
};

function activityNotification(item: ActivityItem): AccountNotification {
  if (item.status === "prize") return {
    id: `reward-${item.slug}`,
    category: "action",
    title: `Your ${formatUsdFromCents(item.priceCents)} reward is ready`,
    body: `Your ${item.retailer} digital reward for ${item.title} is ready to view.`,
    meta: item.availability,
    href: walletRewardHref(item),
    action: "Show barcode",
    image: item.image,
    visualLabel: item.retailer,
    visualValue: formatUsdFromCents(item.priceCents),
    tone: "reward",
  };
  if (item.status === "completion") return {
    id: `completion-${item.slug}`,
    category: "action",
    title: `${item.title} is ready to complete`,
    body: `${formatUsdFromCents(item.remainingCents)} remains after your ${formatUsdFromCents(item.paidCents)} entry credit.`,
    meta: item.availability,
    href: activityHref(item),
    action: "Review purchase",
    image: item.image,
    visualLabel: item.retailer,
    visualValue: `${formatUsdFromCents(item.remainingCents)} left`,
    tone: "completion",
  };
  if (item.status === "completed") return {
    id: `completed-${item.slug}`,
    category: "orders",
    title: `${item.title} is complete`,
    body: `Your ${item.retailer} completion is recorded in My Zero Loss.`,
    meta: item.availability,
    href: activityHref(item),
    action: "View details",
    image: item.image,
    visualLabel: item.retailer,
    tone: "order",
  };
  return {
    id: `active-${item.slug}`,
    category: "activity",
    title: `${item.title} is still open`,
    body: `Your ${formatUsdFromCents(item.paidCents)} entry is still active. We’ll keep the latest status here.`,
    meta: item.availability,
    href: activityHref(item),
    action: "Track entry",
    image: item.image,
    visualLabel: item.retailer,
    tone: "active",
  };
}

function ledgerTitle(entryType: string) {
  return ({
    DEPOSIT: "Funds added to your playable wallet",
    ENTRY_DEBIT: "Entry purchase posted",
    REFUND: "Wallet refund posted",
    CORRECTION: "Wallet adjustment posted",
  } as Record<string, string>)[entryType] ?? "Wallet transaction posted";
}

function ledgerBody(entryType: string, amount: number, balanceCents: number) {
  const amountLabel = formatUsdFromCents(Math.abs(amount));
  const balanceLabel = formatUsdFromCents(balanceCents);
  if (entryType === "DEPOSIT") return `${amountLabel} was added. Your current playable balance is ${balanceLabel}.`;
  if (entryType === "ENTRY_DEBIT") return `${amountLabel} was applied to an entry. Your current playable balance is ${balanceLabel}.`;
  if (entryType === "REFUND") return `${amountLabel} was returned. Your current playable balance is ${balanceLabel}.`;
  return `${amountLabel} posted to your wallet. Your current playable balance is ${balanceLabel}.`;
}

/** Builds display-only notifications from the authenticated account snapshot. */
export function buildAccountNotifications(activity: AccountActivity, wallet: WalletSnapshot | null, emailConfirmed: boolean): AccountNotification[] {
  const notifications = activity.source === "unavailable" ? [] : activity.activity.map(activityNotification);
  if (wallet) {
    for (const entry of wallet.entries) notifications.push({
      id: `wallet-${entry.id}`,
      category: "activity",
      title: ledgerTitle(entry.entry_type),
      body: ledgerBody(entry.entry_type, entry.amount, wallet.balanceCents),
      meta: new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(entry.created_at)),
      href: "/account/wallet?view=history",
      action: "View transaction",
      visualLabel: entry.amount > 0 ? "Added" : "Posted",
      visualValue: `${entry.amount > 0 ? "+" : ""}${formatUsdFromCents(entry.amount)}`,
      tone: "wallet",
    });
  }
  notifications.push({
    id: "account-email-status",
    category: "account",
    title: emailConfirmed ? "Your email is confirmed" : "Confirm your email address",
    body: emailConfirmed ? "Your sign-in email is verified and your account is active." : "Confirm your email to finish securing your account.",
    meta: "Account status",
    href: "/account/security",
    action: "Account & security",
    visualLabel: "Account",
    visualValue: emailConfirmed ? "Verified" : "Action needed",
    tone: "account",
  });
  return notifications;
}
