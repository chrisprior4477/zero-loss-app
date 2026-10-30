import Link from "next/link";
import { AccountIcon } from "./AccountIcon";
import type { AccountOrders } from "@/lib/account/orders";
import { accountFulfillment, fulfillmentHref, matchesFulfillmentFilter, type FulfillmentFilter } from "@/lib/account/fulfillment";
import { OrderTicketGallery } from "./OrderTicketGallery";
import { SelectedOrderScroll } from "./SelectedOrderScroll";
import { readyWalletRewards, walletHistoryHref, walletRewardHref, type AccountActivity } from "@/lib/account/activity";
import { accountRoutes } from "@/lib/account/navigation";
import { StatusTicket } from "./StatusTicket";
import stripStyles from "./account-status-strip.module.css";
import styles from "./orders-fulfillment.module.css";

type OrdersOverview = { balanceLabel: string; fundingEnabled: boolean; activity: AccountActivity };

export function OrdersFulfillment({ state, overview, filter = "all", selectedRewardId, selectedOrderNumber, supportHref = "/account/wallet?view=history#transactions" }: { state: AccountOrders; overview?: OrdersOverview; filter?: FulfillmentFilter; selectedRewardId?: string; selectedOrderNumber?: string; supportHref?: string }) {
  const fulfillment = accountFulfillment(state, overview?.activity ?? { source: "unavailable", isPreview: false, activeCount: null, activity: [] });
  const { records } = fulfillment;
  const complete = overview ? fulfillment.complete : state.source !== "unavailable";
  const processing = records.filter(order => matchesFulfillmentFilter(order, "processing")).length;
  const fulfilled = records.filter(order => matchesFulfillmentFilter(order, "fulfilled")).length;
  const exceptions = records.filter(order => matchesFulfillmentFilter(order, "exceptions")).length;
  const payments = records.filter(order => matchesFulfillmentFilter(order, "payment")).length;
  const hasSelection = Boolean(selectedOrderNumber || selectedRewardId);
  // A notification identifies an exact order, even if its status has since changed.
  const visibleOrders = records.filter(order => (selectedOrderNumber ? order.orderNumber === selectedOrderNumber : matchesFulfillmentFilter(order, filter)) && (!selectedRewardId || order.rewardId === selectedRewardId));
  const selectionAnchor = selectedOrderNumber ? `order-${selectedOrderNumber}` : "fulfillment-records";
  const countLabel = (count: number) => complete ? String(count) : count ? `${count}+` : "—";
  const readyRewards = overview ? readyWalletRewards(overview.activity) : [];
  const singleReward = readyRewards.length === 1 ? readyRewards[0] : null;
  const optionsCount = overview?.activity.source === "unavailable" ? null : overview?.activity.activity.filter(item => item.status === "completion").length;

  return <main className={styles.page}>
    <div className={styles.shell}>
      {overview ? <div className={stripStyles.row} aria-label="Your account overview">
        <StatusTicket variant="wallet" size="top" label="Playable Wallet" value={overview.balanceLabel} action="Add funds" href={walletHistoryHref} actionHref={overview.fundingEnabled ? `${walletHistoryHref}#add-funds` : undefined} actionDisabled={!overview.fundingEnabled} />
        <StatusTicket variant="reward" size="top" label="Prize Ready" value={overview.activity.source === "unavailable" ? "Unavailable" : String(readyRewards.length)} action={singleReward ? "View reward" : "View rewards"} href={singleReward ? walletRewardHref(singleReward) : accountRoutes.rewards} />
        <StatusTicket variant="option" size="top" label="Purchase Options" value={optionsCount === null || optionsCount === undefined ? "Unavailable" : String(optionsCount)} action="Continue with Purchase" href={accountRoutes.purchaseOptions} />
      </div> : null}
      <header className={styles.heading}>
        <div><p>YOUR ACCOUNT</p><h1>Orders &amp; Fulfillment</h1><span>Your winning rewards and purchased gift cards, connected to My Activity and your wallet.</span></div>
        <nav aria-label="Order page actions" className={styles.headingActions}>
          <Link href="/account/notifications"><AccountIcon name="bell" />Notifications</Link>
          <Link href={supportHref}><AccountIcon name="security" />Get help</Link>
        </nav>
      </header>

      <section className={styles.summary} aria-label="Order status filters">
        {([
          { key: "all", label: "All", count: records.length, icon: "all" },
          { key: "processing", label: "In progress", count: processing, icon: "active" },
          { key: "fulfilled", label: "Issued", count: fulfilled, icon: "gift" },
          { key: "exceptions", label: "Exceptions", count: exceptions, icon: "bell" },
        ] as const).map(item => <Link key={item.key} href={fulfillmentHref(undefined, item.key)} aria-label={`${item.label}: ${complete ? `${item.count} ${item.count === 1 ? "record" : "records"}` : "total unavailable"}`} aria-current={!hasSelection && filter === item.key ? "page" : undefined}>
          <AccountIcon name={item.icon} /><span>{item.label}</span><strong>{countLabel(item.count)}</strong>
        </Link>)}
      </section>

      {!complete ? <div role="status" className={styles.warning}>Some fulfillment records could not be verified right now. Available records are shown; totals may be incomplete. No sample orders have been substituted. <Link href="/account/orders">Try again</Link></div> : null}

      {selectedOrderNumber ? <SelectedOrderScroll targetId={selectionAnchor} /> : null}
      <div id={selectionAnchor} className={styles.contentGrid}>
        <header className={styles.sectionHeading}><div><p>{selectedOrderNumber ? "SELECTED ORDER" : selectedRewardId ? "SELECTED REWARD" : filter === "payment" ? "PAYMENT CONFIRMED" : filter === "processing" ? "IN PROGRESS" : filter === "fulfilled" ? "ISSUED & READY" : filter === "exceptions" ? "EXCEPTIONS" : "YOUR ORDERS & REWARDS"}</p><h2 id="your-orders-heading">Retailer gift-card fulfillment</h2></div><span role="status">{visibleOrders.length} of {countLabel(records.length)} records</span></header>
        <section className={styles.orders} aria-labelledby="your-orders-heading">
          {filter !== "all" || hasSelection ? <Link href={fulfillmentHref()} className={styles.showAll}>Show all orders &amp; rewards</Link> : null}
          {!selectedOrderNumber && filter === "payment" ? <p className={styles.filterNote}>Recorded Purchase Option checkouts. Winning prizes do not require a gift-card purchase.</p> : !selectedOrderNumber && filter === "exceptions" ? <p className={styles.filterNote}>Issuance problems, expired or cancelled rewards, and corrected orders. Open a record for its current status.</p> : null}
          {visibleOrders.length ? <OrderTicketGallery key={`${filter}:${selectedRewardId ?? "all"}:${selectedOrderNumber ?? "all"}`} orders={visibleOrders} /> : records.length || hasSelection || filter !== "all" ? <div className={styles.empty}>
            <span><AccountIcon name="orders" /></span><h3>{selectedOrderNumber ? "That order is not available here" : selectedRewardId ? "That reward is not available here" : "No records in this status"}</h3><p>{hasSelection ? "Only records saved to your account can be opened here." : "Your other orders and rewards remain available in the full list."}</p>
            <Link href={fulfillmentHref()}>Show all records<AccountIcon name="arrow" /></Link>
          </div> : <div className={styles.empty}>
            <span><AccountIcon name="orders" /></span>
            <h3>{!complete ? "Fulfillment unavailable" : "No orders or winning rewards yet"}</h3>
            <p>{!complete ? "Please refresh shortly to try again." : "Winning rewards and completed Purchase Option checkouts appear here. Open entries and available options stay in My Activity."}</p>
            <Link href="/account/entries">View My Activity<AccountIcon name="arrow" /></Link>
          </div>}
        </section>

        <aside className={styles.sideRail} aria-label="Fulfillment links">
          <section className={styles.helpCard}>
            <span><AccountIcon name="security" /></span><h2>Need help with an order?</h2><p>Contact support from the same account so its verified payment and issuance history stay connected.</p><Link href={supportHref}>Visit support<AccountIcon name="arrow" /></Link>
          </section>
        </aside>
      </div>

      <div className={styles.extraLinks}>
          <section className={styles.linksCard}>
            <p className={styles.sideEyebrow}>KEEP MOVING</p>
            <h2>Every destination has one job.</h2>
            <Link href="/account/entries"><span><AccountIcon name="layers" /></span><span><strong>My Activity</strong><small>Entries, outcomes and purchase options</small></span><AccountIcon name="chevron" /></Link>
            <Link href="/account/wallet"><span><AccountIcon name="gift" /></span><span><strong>Gift Cards &amp; Rewards</strong><small>Open ready and historical retailer cards</small></span><AccountIcon name="chevron" /></Link>
            <Link href={walletHistoryHref}><span><AccountIcon name="wallet" /></span><span><strong>Wallet &amp; Transactions</strong><small>Funding, entry payments and purchase history</small></span><AccountIcon name="chevron" /></Link>
            <Link href={accountRoutes.openEntries}><span><AccountIcon name="active" /></span><span><strong>Open entries</strong><small>See tickets still awaiting an outcome</small></span><AccountIcon name="chevron" /></Link>
            <Link href={accountRoutes.purchaseOptions}><span><AccountIcon name="completion" /></span><span><strong>Purchase Options</strong><small>Review options before checkout</small></span><AccountIcon name="chevron" /></Link>
            <Link href="/account/notifications"><span><AccountIcon name="bell" /></span><span><strong>Notifications</strong><small>See verified account updates</small></span><AccountIcon name="chevron" /></Link>
          </section>
          <p className={styles.truthNote}>Zero Loss issues retailer gift cards. Product selection, inventory, checkout, shipping and retailer fees remain on the retailer’s site.</p>
      </div>

      <section className={styles.fulfillmentHero} aria-labelledby="fulfillment-overview-heading">
        <div className={styles.heroCopy}>
          <p>FULFILLMENT CENTER</p>
          <h2 id="fulfillment-overview-heading">From a win or confirmed payment to your reward wallet.</h2>
          <span>Zero Loss tracks the retailer gift-card order. Retailer shopping and shipping happen on the retailer’s site.</span>
        </div>
        <ol className={styles.journey} aria-label="Gift-card fulfillment journey">
          <li data-active={payments > 0}><Link href={fulfillmentHref(undefined, "payment")}><span><AccountIcon name="completion" /></span><strong>Payment confirmed</strong><small>{countLabel(payments)} recorded checkouts</small></Link></li>
          <li data-active={processing > 0}><Link href={fulfillmentHref(undefined, "processing")}><span><AccountIcon name="orders" /></span><strong>Issuance</strong><small>{countLabel(processing)} in progress</small></Link></li>
          <li data-active={fulfilled > 0}><Link href={accountRoutes.rewards}><span><AccountIcon name="gift" /></span><strong>Reward wallet</strong><small>Open gifts &amp; reward history</small></Link></li>
          <li data-active={exceptions > 0}><Link href={fulfillmentHref(undefined, "exceptions")}><span><AccountIcon name="bell" /></span><strong>Exceptions</strong><small>{countLabel(exceptions)} status updates</small></Link></li>
        </ol>
      </section>

      <p className={styles.footerNote}>SHOPPING SHOULD NEVER FEEL LIKE A LOSS.</p>
    </div>
  </main>;
}
