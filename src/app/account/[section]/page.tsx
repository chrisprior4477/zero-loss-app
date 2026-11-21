import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { AccountSecurityDashboard } from "@/components/account/AccountSecurityDashboard";
import { OrdersFulfillment } from "@/components/account/OrdersFulfillment";
import { getAccountContext } from "@/lib/account/context";
import { fulfillmentFilter } from "@/lib/account/fulfillment";
import { notificationFilter, validNotice } from "@/lib/account/notification-return";
import { getOrderSupportHref, walletTransactionHelpHref } from "@/lib/account/order-support";
import { createClient } from "@/lib/supabase/server";
import { accountPageReturnPath } from "@/lib/auth/account-return";
import { authNavigationHref } from "@/lib/auth/entry-return";
import { walletRewards } from "@/lib/account/activity";
import { rewardSupportHref } from "@/lib/support/references";

export const metadata: Metadata = { title: "My Account" };

const liveSections = {
  entries: {
    title: "My entries",
    description: "Your live entries and results will appear here.",
    empty: "You do not have any entries yet.",
    action: "Browse products",
    href: "/#ending-soon",
  },
  orders: {
    title: "Orders & fulfillment",
    description: "Track reward delivery and retailer fulfillment.",
    empty: "You do not have any orders or rewards in fulfillment.",
    action: "Browse rewards",
    href: "/#popular-rewards",
  },
  notifications: {
    title: "Notifications",
    description: "Account, entry, result, and fulfillment updates.",
    empty: "You do not have any new notifications.",
    action: "Back to My Activity",
    href: "/account/entries",
  },
  security: {
    title: "Account & security",
    description: "Email confirmation and account access.",
    empty: "Additional security controls are not enabled yet.",
    action: "Back to My Activity",
    href: "/account/entries",
  },
  results: {
    title: "Results",
    description: "Review completed entry outcomes and available next steps.",
    empty: "You do not have any results to review yet.",
    action: "Browse products",
    href: "/#ending-soon",
  },
} as const;

type LiveSection = keyof typeof liveSections;

export default async function LiveAccountSection({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams?: Promise<{ filter?: string | string[]; filterReset?: string | string[]; rewardId?: string | string[]; focusReward?: string | string[]; order?: string | string[]; support?: string | string[]; details?: string | string[]; from?: string | string[]; alerts?: string | string[]; notice?: string | string[] }>;
}) {
  const { section } = await params;
  if (!Object.hasOwn(liveSections, section)) notFound();
  if (section === "results") redirect("/account/entries?filter=completed");

  const query = await searchParams;
  const filter = fulfillmentFilter(query?.filter);
  if (section === "orders" && query?.filter !== undefined && query.filter !== filter) {
    const anchor = typeof query.order === "string" ? `#order-${query.order}` : query.rewardId ? "#fulfillment-records" : "#order-status-filters";
    redirect(accountPageReturnPath("/account/orders", { ...query, filter: undefined, filterReset: "1" }, anchor));
  }
  const account = await getAccountContext();
  if (!account) {
    const anchor = section === "orders" && query && (query.order || query.rewardId || query.filter)
      ? typeof query.order === "string" ? `#order-${query.order}` : "#fulfillment-records" : query?.filterReset === "1" ? "#order-status-filters" : "";
    redirect(authNavigationHref("/login", accountPageReturnPath(`/account/${section}`, query, anchor)));
  }

  const content = liveSections[section as LiveSection];

  if (section === "security") {
    return <AccountSecurityDashboard
      accountId={account.userId}
      timeZone={account.timezone}
      locale={account.preferredLocale}
      displayName={account.displayName}
      initials={account.initials}
      email={account.email}
      emailConfirmed={account.emailConfirmed}
      avatarUrl={account.avatarUrl}
      memberSince={account.memberSince}
      lastSignInAt={account.lastSignInAt}
      phone={account.phone}
      overview={{ balanceLabel: account.balanceLabel, fundingEnabled: account.fundingEnabled, activity: account.activity }}
    />;
  }

  if (section === "orders") {
    const selectedOrderNumber = typeof query?.order === "string" ? query.order : undefined;
    const selectedRewardId = typeof query?.rewardId === "string" ? query.rewardId.toLowerCase() : undefined;
    const focusRewardId = typeof query?.focusReward === "string" ? query.focusReward.toLowerCase() : undefined;
    const selectedOrder = selectedOrderNumber || selectedRewardId ? account.orders.orders.find(order =>
      (!selectedOrderNumber || order.orderNumber === selectedOrderNumber)
      && (!selectedRewardId || order.rewardId === selectedRewardId)) : undefined;
    const verifiedReward = !selectedOrderNumber && !selectedOrder && selectedRewardId
      ? walletRewards(account.activity).find(item => item.rewardId === selectedRewardId && item.rewardSource !== "purchase") : undefined;
    const supportHref = selectedOrder && account.wallet?.scope === "demo"
      ? await getOrderSupportHref(await createClient(), account.userId, selectedOrder.orderNumber)
      : verifiedReward ? rewardSupportHref(verifiedReward.rewardId).replace("#report-problem", "&from=order&details=1#report-problem")
        : walletTransactionHelpHref;
    const fromNotification = Boolean((selectedOrderNumber || selectedRewardId) && query?.from === "notifications");
    const alerts = fromNotification ? query?.alerts === undefined ? selectedOrder?.status === "exception" ? "action" : "orders" : notificationFilter(query.alerts) : undefined;
    const notice = fromNotification && validNotice(query?.notice) ? query.notice : undefined;
    const reportContext = `${filter === "all" ? "" : `&orderFilter=${filter}`}${alerts ? `&alerts=${alerts}` : ""}${notice ? `&notice=${encodeURIComponent(notice)}` : ""}`;
    const reportHref = supportHref.replace("#report-problem", `${reportContext}#report-problem`);
    if (query?.support === "report" && selectedOrder && supportHref !== walletTransactionHelpHref) redirect(query.details === "1" ? reportHref.replace("#report-problem", "&from=order&details=1#report-problem") : reportHref);
    return <OrdersFulfillment state={account.orders} filter={filter} filterReset={query?.filterReset === "1"} focusRewardId={focusRewardId} selectedRewardId={selectedRewardId} selectedOrderNumber={selectedOrderNumber} fromNotification={fromNotification} alerts={alerts} notice={notice} openSelectionDetails={query?.details === "1" && query.support !== "report"} supportHref={reportHref} supportUnavailable={query?.support === "report" && Boolean(selectedOrder) && supportHref === walletTransactionHelpHref} overview={{ balanceLabel: account.balanceLabel, fundingEnabled: account.fundingEnabled, activity: account.activity }} />;
  }

  return (
    <PageContainer>
      <section className="mx-auto w-full max-w-3xl" aria-labelledby="live-account-heading">
        <p className="text-sm font-black uppercase tracking-[0.15em] text-cyan-300">Your account</p>
        <h1 id="live-account-heading" className="mt-2 text-4xl font-black tracking-[-0.04em] text-white">{content.title}</h1>
        <p className="mt-3 text-base text-white/60">{content.description}</p>
        <div className="mt-8 rounded-[24px] border border-white/12 bg-white/[0.045] p-7 text-center">
          <div className="mx-auto h-12 w-12 rounded-full border border-cyan-300/30 bg-cyan-300/10" aria-hidden="true" />
          <p className="mt-5 text-base font-bold text-white">{section === "security" ? `${account.emailConfirmed ? "Email confirmed." : "Email confirmation pending."} ${content.empty}` : "This destination is in development. Stored activity will appear here when it is connected."}</p>
          <Link href={content.href} className="mt-5 inline-flex min-h-11 items-center rounded-full bg-cyan-300 px-5 text-sm font-black text-[#00132e] hover:bg-cyan-200">{content.action}</Link>
        </div>
      </section>
    </PageContainer>
  );
}
