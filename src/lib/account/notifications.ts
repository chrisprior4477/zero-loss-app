import { activityHref, walletRewardHref, type AccountActivity, type ActivityItem } from "./activity";
import { formatUsdFromCents } from "@/lib/wallet/money";
import type { WalletSnapshot } from "@/lib/wallet/snapshot";
import type { AccountOrder } from "./orders";
import { fulfillmentHref } from "./fulfillment";

export type NotificationCategory = "action" | "account" | "activity" | "orders" | "crew";
export const notificationPreferenceKeys = ["purchase_options", "reward_ready", "reward_deadline", "order_updates", "wallet_updates", "crew_updates", "support_replies", "pool_progress"] as const;
export type NotificationPreferenceKey = typeof notificationPreferenceKeys[number];
export type NotificationPreferences = Partial<Record<NotificationPreferenceKey, boolean>>;
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
  crewRequestId?: string;
  tone: "reward" | "active" | "completion" | "wallet" | "account" | "order" | "crew";
  preferenceKey?: NotificationPreferenceKey;
  itemSlug?: string;
  itemTitle?: string;
  entryId?: string | null;
  enteredAt?: string | null;
  rewardSource?: "winner" | "purchase" | null;
  ledgerEntryType?: string;
  /** Completed account actions remain in history but need no acknowledgement. */
  resolved?: boolean;
};

export function parseNotificationPreferences(value: unknown): NotificationPreferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(notificationPreferenceKeys.flatMap(key => {
    const enabled = (value as Record<string, unknown>)[key];
    return typeof enabled === "boolean" ? [[key, enabled]] : [];
  })) as NotificationPreferences;
}

export function notificationIsEnabled(notification: AccountNotification, preferences: NotificationPreferences): boolean {
  return !notification.preferenceKey || preferences[notification.preferenceKey] !== false;
}

function activityNotification(item: ActivityItem): AccountNotification {
  // A winning entry stays a win in history, but its reward may no longer be usable.
  if (item.rewardId && item.rewardStatus !== "ready") {
    const state = ({
      redeemed: ["has been redeemed", "This reward has already been used."],
      expired: ["has expired", "This reward is no longer available to claim or use."],
      cancelled: ["was cancelled", "This reward is no longer available to use."],
      issuance_pending: ["is being prepared", "Your reward is not ready to use yet. Check its details for the latest status."],
      issuance_failed: ["needs attention", "We couldn’t prepare this reward. Open its details for help."],
    } as Record<string, [string, string]>)[item.rewardStatus ?? ""] ?? ["status is unavailable", "We couldn’t verify whether this reward is ready. Open its details to check again."];
    return {
      id: `reward-${item.rewardId}-${item.rewardStatus ?? "unavailable"}`,
      category: item.rewardStatus === "issuance_failed" ? "action" : "orders",
      title: `Your ${item.retailer} reward ${state[0]}`,
      body: state[1], meta: "Reward status update", href: walletRewardHref(item),
      action: "View reward details", image: item.image, visualLabel: item.retailer, tone: "order",
      preferenceKey: item.rewardStatus === "expired" ? "reward_deadline" : "order_updates",
    };
  }
  if (item.status === "prize" || (item.rewardStatus === "ready" && item.rewardId)) return {
    id: `reward-${item.rewardId ?? item.entryId ?? item.slug}`,
    category: item.rewardClaimedAt || item.rewardSource === "purchase" || item.status === "completed" ? "activity" : "action",
    title: `Your ${formatUsdFromCents(item.priceCents)} reward is ready`,
    body: `Your ${item.retailer} digital reward for ${item.title} is ready to view.`,
    meta: item.availability,
    href: walletRewardHref(item),
    action: item.rewardClaimedAt || item.rewardSource === "purchase" || item.status === "completed" ? "View gift card" : "Claim reward",
    image: item.image,
    visualLabel: item.retailer,
    visualValue: formatUsdFromCents(item.priceCents),
    tone: "reward",
    preferenceKey: "reward_ready",
  };
  if (item.completionOptionStatus === "declined") return {
    id: `completion-${item.completionOptionId ?? item.entryId ?? item.slug}-declined`,
    category: "orders", title: `Your ${item.retailer} gift-card option was declined`,
    body: "Review it in Declined Offers. Revival is available only before the original deadline.",
    meta: "Purchase option update", href: "/account/declined-offers", action: "Review declined offers",
    image: item.image, visualLabel: item.retailer, tone: "order",
    preferenceKey: "purchase_options",
  };
  if (item.status === "completion" && item.completionOptionStatus && item.completionOptionStatus !== "available") return {
    id: `completion-${item.completionOptionId ?? item.entryId ?? item.slug}-${item.completionOptionStatus}`,
    category: "orders", title: `Your ${item.retailer} gift-card option is ${item.completionOptionStatus}`,
    body: "This option is no longer available to purchase. Its outcome is saved in My Activity.",
    meta: "Purchase option update", href: activityHref(item), action: "View details", image: item.image,
    visualLabel: item.retailer, tone: "order",
    preferenceKey: "purchase_options",
  };
  if (item.status === "completion") return {
    id: `completion-${item.completionOptionId ?? item.entryId ?? item.slug}`,
    category: "action",
    title: `Your ${item.retailer} gift-card option is ready`,
    body: `Pay ${formatUsdFromCents(item.remainingCents)} to receive a ${formatUsdFromCents(item.priceCents)} retailer gift card. This choice is optional.`,
    meta: item.availability,
    href: activityHref(item),
    action: "Continue with Purchase",
    image: item.image,
    visualLabel: item.retailer,
    visualValue: `${formatUsdFromCents(item.remainingCents)} left`,
    tone: "completion",
    preferenceKey: "purchase_options",
  };
  if (item.status === "completed") return {
    id: `completed-${item.entryId ?? item.slug}`,
    category: "orders",
    title: `${item.title} is complete`,
    body: `Your ${item.retailer} outcome is recorded in My Activity.`,
    meta: item.availability,
    href: activityHref(item),
    action: "View details",
    image: item.image,
    visualLabel: item.retailer,
    tone: "order",
    preferenceKey: "order_updates",
  };
  return {
    id: `active-${item.entryId ?? item.slug}`,
    category: "activity",
    title: `${item.title} is still open`,
    body: `Your ${formatUsdFromCents(item.paidCents)} entry is still active. We’ll keep the latest status here.`,
    meta: item.availability,
    href: activityHref(item),
    action: "See My Entry",
    image: item.image,
    visualLabel: item.retailer,
    tone: "active",
    preferenceKey: "pool_progress",
  };
}

/** The order log is authoritative for fulfillment; reward readiness alone is not an order event. */
export function buildOrderNotifications(orders: readonly AccountOrder[]): AccountNotification[] {
  return orders.map(order => {
    const issued = order.status === "fulfilled";
    const exception = order.status === "exception";
    return {
      id: `order-${order.orderNumber}-${order.status}`,
      category: exception ? "action" : "orders",
      title: issued ? `${order.retailer} gift card issued` : exception ? `${order.retailer} order needs attention` : `${order.retailer} order ${order.status === "cancelled" ? "cancelled" : "is processing"}`,
      body: issued ? "Your retailer gift card is ready to open." : exception ? "Your order is saved, but its issuance needs attention." : order.status === "cancelled" ? "This order is closed. Its history remains available." : "Payment is confirmed. We’ll show the issued card when it is ready.",
      meta: `Order ${order.orderNumber.slice(-8).toUpperCase()}`,
      href: fulfillmentHref(order.rewardId),
      action: "View exact order",
      image: order.image,
      visualLabel: order.retailer,
      tone: "order",
      preferenceKey: "order_updates",
    };
  });
}

function ledgerTitle(entryType: string) {
  return ({
    DEPOSIT: "Funds added to your playable wallet",
    ENTRY_DEBIT: "Entry purchase posted",
    ENTRY_HOLD: "Entry amount reserved",
    ENTRY_HOLD_RELEASE: "Entry reservation released",
    PURCHASE_DEBIT: "Gift-card purchase posted",
    UNCLAIMED_WINNER_CREDIT: "Unclaimed reward credit returned",
    REFUND: "Wallet refund posted",
    CORRECTION: "Wallet adjustment posted",
  } as Record<string, string>)[entryType] ?? "Wallet transaction posted";
}

function ledgerBody(entryType: string, amount: number, balanceCents: number) {
  const amountLabel = formatUsdFromCents(Math.abs(amount));
  const balanceLabel = formatUsdFromCents(balanceCents);
  if (entryType === "DEPOSIT") return `${amountLabel} was added. Your current playable balance is ${balanceLabel}.`;
  if (entryType === "ENTRY_DEBIT") return `${amountLabel} was applied to an entry. Your current playable balance is ${balanceLabel}.`;
  if (entryType === "ENTRY_HOLD") return `${amountLabel} was reserved during the 30-second Undo window. Check My Activity for the saved result.`;
  if (entryType === "ENTRY_HOLD_RELEASE") return `The ${amountLabel} reservation was released on Undo or replaced by a confirmed entry purchase. Your current playable balance is ${balanceLabel}.`;
  if (entryType === "PURCHASE_DEBIT") return `${amountLabel} completed a retailer gift-card purchase. Your current playable balance is ${balanceLabel}.`;
  if (entryType === "UNCLAIMED_WINNER_CREDIT") return `${amountLabel} from an unclaimed winner entry was returned. Your current playable balance is ${balanceLabel}.`;
  if (entryType === "REFUND") return `${amountLabel} was returned. Your current playable balance is ${balanceLabel}.`;
  return `${amountLabel} posted to your wallet. Your current playable balance is ${balanceLabel}.`;
}

/** Builds display-only notifications from the authenticated account snapshot. */
export function buildAccountNotifications(activity: AccountActivity, wallet: WalletSnapshot | null, emailConfirmed: boolean, hiddenWalletIds: readonly string[] = []): AccountNotification[] {
  const activityPriority = { prize: 0, completion: 1, active: 2, completed: 3 } as const;
  const notifications: AccountNotification[] = activity.source === "unavailable" ? [] : [...activity.activity]
    .sort((left, right) => activityPriority[left.status] - activityPriority[right.status])
    .map(item => ({ ...activityNotification(item), itemSlug: item.slug, itemTitle: item.title, entryId: item.entryId, enteredAt: item.enteredAt, rewardSource: item.rewardSource,
      resolved: (item.rewardStatus === "ready" && Boolean(item.rewardClaimedAt || item.rewardSource === "purchase" || item.status === "completed")) || item.completionOptionStatus === "purchased" }));
  if (activity.source !== "unavailable") {
    const now = Date.now();
    for (const item of activity.activity) {
      const deadline = item.rewardClaimExpiresAt ? Date.parse(item.rewardClaimExpiresAt) : NaN;
      if (!item.rewardId || item.rewardStatus !== "ready" || item.rewardClaimedAt || item.rewardSource === "purchase" || item.status === "completed" || !Number.isFinite(deadline)
        || deadline <= now || deadline > now + 7 * 24 * 60 * 60 * 1000) continue;
      notifications.push({
        id: `reward-deadline-${item.rewardId}`,
        category: "action", title: `Claim your ${item.retailer} reward soon`,
        body: "Your claim deadline is approaching. Open the reward for the exact date and next step.",
        meta: new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(deadline)),
        href: walletRewardHref(item), action: "View reward deadline", image: item.image, itemSlug: item.slug, itemTitle: item.title, rewardSource: item.rewardSource,
        visualLabel: item.retailer, tone: "reward", preferenceKey: "reward_deadline",
      });
    }
  }
  if (wallet) {
    const hidden = new Set(hiddenWalletIds);
    for (const entry of wallet.entries.filter(item => !hidden.has(item.id))) notifications.push({
      id: `wallet-${entry.id}`,
      category: "activity",
      title: ledgerTitle(entry.entry_type),
      body: ledgerBody(entry.entry_type, entry.amount, wallet.balanceCents),
      meta: new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(entry.created_at)),
      href: `/account/wallet?view=history&transaction=${encodeURIComponent(entry.id)}#transaction-${encodeURIComponent(entry.id)}`,
      action: "View transaction",
      visualLabel: entry.amount > 0 ? "Added" : "Posted",
      visualValue: `${entry.amount > 0 ? "+" : ""}${formatUsdFromCents(entry.amount)}`,
      tone: "wallet",
      preferenceKey: "wallet_updates",
      ledgerEntryType: entry.entry_type,
    });
  }
  notifications.push({
    id: emailConfirmed ? "account-email-confirmed" : "account-email-unconfirmed",
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
