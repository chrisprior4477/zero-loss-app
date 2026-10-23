import Image from "next/image";
import Link from "next/link";
import { AccountIcon } from "./AccountIcon";
import type { AccountOrders } from "@/lib/account/orders";
import { accountFulfillment, fulfillmentActivityHref, fulfillmentHref, matchesFulfillmentFilter, type FulfillmentFilter, type FulfillmentRecord } from "@/lib/account/fulfillment";
import { formatUsdFromCents } from "@/lib/wallet/money";
import { readyWalletRewards, walletHistoryHref, walletRewardHref, type AccountActivity } from "@/lib/account/activity";
import { accountRoutes } from "@/lib/account/navigation";
import { StatusTicket } from "./StatusTicket";
import stripStyles from "./account-status-strip.module.css";
import styles from "./orders-fulfillment.module.css";

type OrdersOverview = { balanceLabel: string; fundingEnabled: boolean; activity: AccountActivity };

function presentation(order: FulfillmentRecord) {
  switch (order.status) {
    case "fulfilled": return { eyebrow: order.rewardStatus === "redeemed" ? "Gift card used" : order.source === "winner" && !order.claimedAt ? "Prize ready to claim" : "Gift card issued", copy: order.rewardStatus === "redeemed" ? "This gift card has been marked used. Its reward record remains in your wallet history." : order.source === "winner" && !order.claimedAt ? "Your winning reward is ready. Open it in your wallet to review and claim it." : "Your retailer gift card is ready to open in your reward wallet.", tone: "reward" } as const;
    case "exception": return { eyebrow: "Action needed", title: "Issuance exception", copy: "The gift-card provider needs attention. Your entitlement remains recorded while support resolves it.", tone: "action" } as const;
    case "cancelled": return { eyebrow: "Cancelled", copy: "This fulfillment record was cancelled and remains in your account history.", tone: "complete" } as const;
    case "expired": return { eyebrow: "Expired", copy: "The reward claim period has expired. Open the saved reward for its status and support options.", tone: "complete" } as const;
    case "corrected": return { eyebrow: "Order corrected", copy: "A correction is recorded for this order. Review your wallet history or contact support for details.", tone: "complete" } as const;
    default: return { eyebrow: order.status === "payment_confirmed" ? "Payment confirmed" : "Issuance pending", copy: order.orderNumber ? "Your checkout is recorded. Gift-card issuance is in progress." : "Your reward is recorded. Check its wallet status for the next step.", tone: "action" } as const;
  }
}

export function OrdersFulfillment({ state, overview, filter = "all", selectedRewardId }: { state: AccountOrders; overview?: OrdersOverview; filter?: FulfillmentFilter; selectedRewardId?: string }) {
  const fulfillment = accountFulfillment(state, overview?.activity ?? { source: "unavailable", isPreview: false, activeCount: null, activity: [] });
  const { records } = fulfillment;
  const complete = overview ? fulfillment.complete : state.source !== "unavailable";
  const processing = records.filter(order => matchesFulfillmentFilter(order, "processing")).length;
  const fulfilled = records.filter(order => matchesFulfillmentFilter(order, "fulfilled")).length;
  const exceptions = records.filter(order => matchesFulfillmentFilter(order, "exceptions")).length;
  const payments = records.filter(order => matchesFulfillmentFilter(order, "payment")).length;
  const visibleOrders = records.filter(order => matchesFulfillmentFilter(order, filter) && (!selectedRewardId || order.rewardId === selectedRewardId));
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
          <Link href="/support"><AccountIcon name="security" />Get help</Link>
        </nav>
      </header>

      <section className={styles.summary} aria-label="Order status filters">
        {([
          { key: "all", label: "All", count: records.length, icon: "all" },
          { key: "processing", label: "In progress", count: processing, icon: "active" },
          { key: "fulfilled", label: "Issued", count: fulfilled, icon: "gift" },
          { key: "exceptions", label: "Exceptions", count: exceptions, icon: "bell" },
        ] as const).map(item => <Link key={item.key} href={fulfillmentHref(undefined, item.key)} aria-label={`${item.label}: ${complete ? `${item.count} ${item.count === 1 ? "record" : "records"}` : "total unavailable"}`} aria-current={!selectedRewardId && filter === item.key ? "page" : undefined}>
          <AccountIcon name={item.icon} /><span>{item.label}</span><strong>{countLabel(item.count)}</strong>
        </Link>)}
      </section>

      {!complete ? <div role="status" className={styles.warning}>Some fulfillment records could not be verified right now. Available records are shown; totals may be incomplete. No sample orders have been substituted. <Link href="/account/orders">Try again</Link></div> : null}

      <div id="fulfillment-records" className={styles.contentGrid}>
        <header className={styles.sectionHeading}><div><p>{selectedRewardId ? "SELECTED REWARD" : filter === "payment" ? "PAYMENT CONFIRMED" : filter === "processing" ? "IN PROGRESS" : filter === "fulfilled" ? "ISSUED & READY" : filter === "exceptions" ? "EXCEPTIONS" : "YOUR ORDERS & REWARDS"}</p><h2 id="your-orders-heading">Retailer gift-card fulfillment</h2></div><span role="status">{visibleOrders.length} of {countLabel(records.length)} records</span></header>
        <section className={styles.orders} aria-labelledby="your-orders-heading">
          {filter !== "all" || selectedRewardId ? <Link href={fulfillmentHref()} className={styles.showAll}>Show all orders &amp; rewards</Link> : null}
          {filter === "payment" ? <p className={styles.filterNote}>Recorded Purchase Option checkouts. Winning prizes do not require a gift-card purchase.</p> : filter === "exceptions" ? <p className={styles.filterNote}>Issuance problems, expired or cancelled rewards, and corrected orders. Open a record for its current status.</p> : null}
          {visibleOrders.length ? <div className={styles.orderList}>
            {visibleOrders.map(order => {
              const detail = presentation(order);
              return <article key={order.rewardId} id={`reward-${order.rewardId}`} className={styles.orderCard} data-tone={detail.tone}>
                <Link href={walletRewardHref({ slug: order.rewardSlug, rewardId: order.rewardId })} aria-label={`View ${order.title} reward`} className={styles.productStage}><Image src={order.image} alt="" fill sizes="(max-width: 650px) 120px, 350px" className={styles.productImage} /></Link>
                <div className={styles.orderCopy}>
                  <p className={styles.orderEyebrow}><AccountIcon name={order.status === "fulfilled" ? "gift" : "orders"} />{detail.eyebrow}</p>
                  <h3><Link href={walletRewardHref({ slug: order.rewardSlug, rewardId: order.rewardId })}>{order.title}</Link></h3>
                  <p className={styles.retailer}>{order.retailer} · {order.source === "winner" ? "Prize won" : order.source === "purchase" ? "Purchase Option" : "Reward"}</p>
                  <p className={styles.description}>{detail.copy}</p>
                  <dl className={styles.orderFacts}>
                    <div><dt>Gift-card value</dt><dd>{formatUsdFromCents(order.faceValueCents)}</dd></div>
                    {order.source === "winner" ? <div><dt>Gift-card purchase</dt><dd>No purchase required</dd></div> : <div><dt>Paid at checkout</dt><dd>{order.amountPaidCents === null ? "Unavailable" : formatUsdFromCents(order.amountPaidCents)}</dd></div>}
                    <div><dt>{order.orderNumber ? "Order" : "Reward"}</dt><dd>{(order.orderNumber ?? order.rewardId).slice(-8).toUpperCase()}</dd></div>
                    {order.entryId ? <div><dt>Entry</dt><dd>{order.entryId.slice(-8).toUpperCase()}</dd></div> : null}
                    {Number.isFinite(Date.parse(order.createdAt)) ? <div><dt>{order.orderNumber ? "Checkout date" : "Entry date"}</dt><dd><time dateTime={order.createdAt}>{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(order.createdAt))}</time></dd></div> : null}
                  </dl>
                </div>
                <div className={styles.orderActions}>
                  <Link href={walletRewardHref({ slug: order.rewardSlug, rewardId: order.rewardId })} className={styles.primaryAction}>{order.status === "fulfilled" ? order.source === "winner" && !order.claimedAt && order.rewardStatus !== "redeemed" ? "View winning reward" : "Open gift card" : "View reward status"}<AccountIcon name="arrow" /></Link>
                  <Link href={fulfillmentActivityHref(order)} className={styles.secondaryAction}>View in My Activity<AccountIcon name="chevron" /></Link>
                  <Link href={walletHistoryHref} className={styles.secondaryAction}>Wallet history<AccountIcon name="chevron" /></Link>
                  {matchesFulfillmentFilter(order, "exceptions") ? <Link href="/support" className={styles.secondaryAction}>Get help<AccountIcon name="chevron" /></Link> : null}
                </div>
              </article>;
            })}
          </div> : records.length || selectedRewardId || filter !== "all" ? <div className={styles.empty}>
            <span><AccountIcon name="orders" /></span><h3>{selectedRewardId ? "That reward is not available here" : "No records in this status"}</h3><p>{selectedRewardId ? "Only records saved to your account can be opened here." : "Your other orders and rewards remain available in the full list."}</p>
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
            <span><AccountIcon name="security" /></span><h2>Need help with an order?</h2><p>Contact support from the same account so its verified payment and issuance history stay connected.</p><Link href="/support">Visit support<AccountIcon name="arrow" /></Link>
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
