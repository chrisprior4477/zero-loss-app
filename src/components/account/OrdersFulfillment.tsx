import Link from "next/link";
import { AccountIcon } from "./AccountIcon";
import type { AccountOrders } from "@/lib/account/orders";
import { accountFulfillment, fulfillmentFilterLabel, fulfillmentHref, matchesFulfillmentFilter, type FulfillmentFilter } from "@/lib/account/fulfillment";
import { OrderTicketGallery } from "./OrderTicketGallery";
import { OrdersRetryButton } from "./OrdersRetryButton";
import { SelectedOrderScroll } from "./SelectedOrderScroll";
import { readyWalletRewards, walletHistoryHref, walletRewardHref, type AccountActivity } from "@/lib/account/activity";
import { accountRoutes } from "@/lib/account/navigation";
import { walletTransactionHelpHref } from "@/lib/account/order-support";
import { StatusTicket } from "./StatusTicket";
import stripStyles from "./account-status-strip.module.css";
import styles from "./orders-fulfillment.module.css";

type OrdersOverview = { balanceLabel: string; fundingEnabled: boolean; activity: AccountActivity };

export function OrdersFulfillment({ state, overview, filter = "all", selectedRewardId, selectedOrderNumber, supportHref = walletTransactionHelpHref, supportUnavailable = false }: { state: AccountOrders; overview?: OrdersOverview; filter?: FulfillmentFilter; selectedRewardId?: string; selectedOrderNumber?: string; supportHref?: string; supportUnavailable?: boolean }) {
  const chooseTransaction = supportHref === walletTransactionHelpHref;
  const supportLabel = chooseTransaction ? "Choose a transaction to report" : "Report a problem with this order";
  const fulfillment = accountFulfillment(state, overview?.activity ?? { source: "unavailable", isPreview: false, activeCount: null, activity: [] });
  const { records } = fulfillment;
  const complete = overview ? fulfillment.complete : state.source !== "unavailable";
  const selectionComplete = selectedOrderNumber ? state.source !== "unavailable" : complete;
  const processing = records.filter(order => matchesFulfillmentFilter(order, "processing")).length;
  const fulfilled = records.filter(order => matchesFulfillmentFilter(order, "fulfilled")).length;
  const exceptions = records.filter(order => matchesFulfillmentFilter(order, "exceptions")).length;
  const hasSelection = Boolean(selectedOrderNumber || selectedRewardId);
  const paymentHref = fulfillmentHref(undefined, "payment");
  const showingPayments = filter === "payment" && !hasSelection;
  const retryLabel = selectedOrderNumber ? "Try this order again"
    : selectedRewardId ? "Try this reward again"
    : filter === "exceptions" ? "Try Exceptions again"
    : "Try again";
  // A notification identifies an exact order, even if its status has since changed.
  const visibleOrders = records.filter(order => (selectedOrderNumber ? order.orderNumber === selectedOrderNumber : selectedRewardId || matchesFulfillmentFilter(order, filter)) && (!selectedRewardId || order.rewardId === selectedRewardId));
  const selectionAnchor = selectedOrderNumber ? `order-${selectedOrderNumber}` : "fulfillment-records";
  const countLabel = (count: number) => complete ? String(count) : count ? `${count}+` : "—";
  const resultsCount = visibleOrders.length;
  const resultsLabel = showingPayments
    ? `${resultsCount} paid ${resultsCount === 1 ? "order" : "orders"}`
    : `${resultsCount} ${resultsCount === 1 ? "record" : "records"}`;
  const readyRewards = overview ? readyWalletRewards(overview.activity) : [];
  const singleReward = readyRewards.length === 1 ? readyRewards[0] : null;
  const optionsCount = overview?.activity.source === "unavailable" ? null : overview?.activity.activity.filter(item => item.status === "completion").length;

  return <main className={styles.page}>
    <div className={styles.shell}>
      {overview ? <div className={stripStyles.row} aria-label="Your account overview">
        <StatusTicket variant="wallet" size="top" label="Playable Wallet" value={overview.balanceLabel} action="Add funds" href={walletHistoryHref} actionHref={overview.fundingEnabled ? `${walletHistoryHref}&panel=funding#add-funds` : undefined} actionDisabled={!overview.fundingEnabled} />
        <StatusTicket variant="reward" size="top" label="Prize Ready" value={overview.activity.source === "unavailable" ? "Unavailable" : String(readyRewards.length)} action={singleReward ? "View reward" : "View rewards"} href={singleReward ? walletRewardHref(singleReward) : accountRoutes.rewards} />
        <StatusTicket variant="option" size="top" label="Purchase Options" value={optionsCount === null || optionsCount === undefined ? "Unavailable" : String(optionsCount)} action="Continue with Purchase" href={accountRoutes.purchaseOptions} />
      </div> : null}
      <header className={styles.heading}>
        <div><p>YOUR ACCOUNT</p><h1>Orders &amp; Fulfillment</h1><span>Your winning rewards and purchased gift cards, connected to My Activity and your wallet.</span></div>
        <nav aria-label="Order page actions" className={styles.headingActions}>
          <Link href="/account/notifications"><AccountIcon name="bell" />Notifications</Link>
          <Link href={supportHref}><AccountIcon name="security" />{supportLabel}</Link>
        </nav>
      </header>

      {supportUnavailable ? <p role="alert" className={styles.warning}>We couldn’t attach this order’s transaction right now. <Link href={walletTransactionHelpHref}>Choose its transaction from wallet history</Link> to report the problem.</p> : null}

      {/* Use native navigation for these filter links. The route cache can append the results fragment twice. */}
      <section className={styles.summary} aria-label="Order status filters">
        {([
          { key: "all", label: "All", count: records.length, icon: "all" },
          { key: "processing", label: "In progress", count: processing, icon: "active" },
          { key: "fulfilled", label: "Issued", count: fulfilled, icon: "gift" },
          { key: "exceptions", label: "Exceptions", count: exceptions, icon: "bell" },
        ] as const).map(item => <a key={item.key} href={fulfillmentHref(undefined, item.key)} aria-label={`${item.label}: ${complete ? `${item.count} ${item.count === 1 ? "record" : "records"}` : "total unavailable"}`} aria-current={!hasSelection && filter === item.key ? "page" : undefined}>
          <AccountIcon name={item.icon} /><span>{item.label}</span><strong>{countLabel(item.count)}</strong>
        </a>)}
      </section>

      <SelectedOrderScroll targetId={selectionAnchor} onlyIfRepeated={!selectedOrderNumber} />
      <div id={selectionAnchor} className={styles.contentGrid}>
        <header className={styles.sectionHeading}>
          <div><p>{selectedOrderNumber ? "SELECTED ORDER" : selectedRewardId ? "SELECTED REWARD" : filter === "payment" ? "PAYMENT CONFIRMED" : filter === "processing" ? "IN PROGRESS" : filter === "fulfilled" ? "ISSUED & READY" : filter === "exceptions" ? "EXCEPTIONS" : "YOUR ORDERS & REWARDS"}</p><h2 id="your-orders-heading">Retailer gift-card fulfillment</h2></div>
          <div className={styles.resultControls}>
            <span role="status">{resultsLabel}{!selectionComplete ? " found so far" : ""}</span>
            {!hasSelection ? <a href={paymentHref} className={styles.paymentFilter} aria-current={showingPayments ? "page" : undefined}>Confirmed payments</a> : null}
            {filter !== "all" || hasSelection ? <a href={fulfillmentHref()} className={styles.showAll}>Show all orders &amp; rewards</a> : null}
          </div>
        </header>
        <section className={styles.orders} aria-labelledby="your-orders-heading">
          {hasSelection && filter !== "all" ? <a href={fulfillmentHref(undefined, filter)} className={styles.showAll}>Return to {fulfillmentFilterLabel[filter]}</a> : null}
          {showingPayments ? <p className={styles.filterNote}>This view shows paid orders only. To see prize wins too, select Show all orders &amp; rewards.</p> : !selectedOrderNumber && filter === "exceptions" ? <p className={styles.filterNote}>Issuance problems, expired or cancelled rewards, and corrected orders. Open a record for its current status.</p> : null}
          {visibleOrders.length ? <>
            {!complete ? <div className={`${styles.warning} ${styles.retryWarning}`}>
              <p role="status">Some fulfillment records could not be verified right now. The records below are available, and totals may be incomplete.</p>
              <OrdersRetryButton label={retryLabel} />
            </div> : null}
            <OrderTicketGallery key={`${filter}:${selectedRewardId ?? "all"}:${selectedOrderNumber ?? "all"}`} orders={visibleOrders} filter={filter} />
          </> : !selectionComplete ? <div className={styles.empty}>
            <span><AccountIcon name="orders" /></span>
            <h3>{selectedOrderNumber ? "We couldn’t load this order right now" : selectedRewardId ? "We couldn’t load this reward right now" : filter === "exceptions" ? "We couldn’t load Exceptions right now" : "Fulfillment unavailable"}</h3>
            <p>Try again in a moment to check this view.</p>
            <OrdersRetryButton label={retryLabel} />
          </div> : records.length || hasSelection || filter !== "all" ? <div className={styles.empty}>
            <span><AccountIcon name="orders" /></span><h3>{selectedOrderNumber ? "That order is not available here" : selectedRewardId ? "That reward is not available here" : "No records in this status"}</h3><p>{hasSelection ? "Only records saved to your account can be opened here." : "Your other orders and rewards remain available in the full list."}</p>
            <a href={fulfillmentHref()}>{hasSelection ? "View all orders" : "Show all records"}<AccountIcon name="arrow" /></a>
          </div> : <div className={styles.empty}>
            <span><AccountIcon name="orders" /></span>
            <h3>No orders or winning rewards yet</h3>
            <p>Winning rewards and completed Purchase Option checkouts appear here. Open entries and available options stay in My Activity.</p>
            <Link href="/account/entries">View My Activity<AccountIcon name="arrow" /></Link>
          </div>}
        </section>

        <aside className={styles.sideRail} aria-label="Fulfillment links">
          <section className={styles.helpCard}>
            <span><AccountIcon name="security" /></span><h2>Need help with an order?</h2>
            <p>{chooseTransaction ? "Open Order details or Reward details, then tap Report a problem to Support. You can also choose a transaction from your wallet below." : "Your support request will include this order’s transaction."}</p>
            <Link href={supportHref}>{supportLabel}<AccountIcon name="arrow" /></Link>
          </section>
        </aside>
      </div>

      <nav id="related-pages" aria-labelledby="related-pages-heading" className={styles.relatedPages}>
        <h2 id="related-pages-heading">Related pages</h2>
        <div className={styles.relatedLinks}>
          <Link href={accountRoutes.activity}><AccountIcon name="layers" /><span>My Activity</span></Link>
          <Link href={accountRoutes.rewards}><AccountIcon name="gift" /><span>Gift Cards &amp; Rewards</span></Link>
          <Link href={walletHistoryHref}><AccountIcon name="wallet" /><span>Wallet &amp; Transactions</span></Link>
          <a href={paymentHref} aria-current={showingPayments ? "page" : undefined}>
            <AccountIcon name="completion" /><span>Confirmed payments</span>
          </a>
        </div>
      </nav>
      <p className={styles.retailerNote}>Zero Loss issues retailer gift cards. Product selection, inventory, checkout, shipping and retailer fees remain on the retailer’s site.</p>

      <p className={styles.footerNote}>SHOPPING SHOULD NEVER FEEL LIKE A LOSS.</p>
    </div>
  </main>;
}
