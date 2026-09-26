"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AccountIcon } from "./AccountIcon";
import type { AccountOrder, AccountOrders } from "@/lib/account/orders";
import { formatUsdFromCents } from "@/lib/wallet/money";
import { readyWalletRewards, walletHistoryHref, walletRewardHref, type AccountActivity } from "@/lib/account/activity";
import { accountRoutes } from "@/lib/account/navigation";
import { StatusTicket } from "./StatusTicket";
import styles from "./orders-fulfillment.module.css";

type OrderFilter = "all" | "processing" | "fulfilled" | "exceptions";
type OrdersOverview = { balanceLabel: string; fundingEnabled: boolean; activity: AccountActivity };

function presentation(order: AccountOrder) {
  switch (order.status) {
    case "fulfilled": return { eyebrow: "Gift card issued", title: "Ready in rewards", copy: "Your retailer gift card has been issued and is ready to open.", tone: "reward" } as const;
    case "exception": return { eyebrow: "Action needed", title: "Issuance exception", copy: "The gift-card provider needs attention. Your entitlement remains recorded while support resolves it.", tone: "action" } as const;
    case "cancelled": return { eyebrow: "Cancelled", title: "Order closed", copy: "This order was cancelled and remains in your operational history.", tone: "complete" } as const;
    default: return { eyebrow: "Processing", title: "Issuance pending", copy: "Payment is confirmed. The retailer gift card is being issued.", tone: "action" } as const;
  }
}

export function OrdersFulfillment({ state, overview }: { state: AccountOrders; overview?: OrdersOverview }) {
  const [filter, setFilter] = useState<OrderFilter>("all");
  const processing = state.orders.filter(order => order.status === "payment_confirmed" || order.status === "issuance_pending").length;
  const fulfilled = state.orders.filter(order => order.status === "fulfilled").length;
  const exceptions = state.orders.filter(order => order.status === "exception").length;
  const visibleOrders = state.orders.filter(order => filter === "all" || (filter === "processing" ? order.status === "payment_confirmed" || order.status === "issuance_pending" : filter === "exceptions" ? order.status === "exception" : order.status === "fulfilled"));
  const readyRewards = overview ? readyWalletRewards(overview.activity) : [];
  const singleReward = readyRewards.length === 1 ? readyRewards[0] : null;
  const optionsCount = overview?.activity.source === "unavailable" ? null : overview?.activity.activity.filter(item => item.status === "completion").length;

  return <main className={styles.page}>
    <div className={styles.shell}>
      {overview ? <div className={styles.statusTickets} aria-label="Your account overview">
        <StatusTicket variant="wallet" size="overview" label="Playable Wallet" value={overview.balanceLabel} action="Add funds" href={walletHistoryHref} actionHref={overview.fundingEnabled ? `${walletHistoryHref}#add-funds` : undefined} actionDisabled={!overview.fundingEnabled} />
        <StatusTicket variant="reward" size="overview" label="Prize Ready" value={overview.activity.source === "unavailable" ? "Unavailable" : String(readyRewards.length)} action={singleReward ? "View reward" : "View rewards"} href={singleReward ? walletRewardHref(singleReward) : accountRoutes.rewards} />
        <StatusTicket variant="option" size="overview" label="Purchase Options" value={optionsCount === null || optionsCount === undefined ? "Unavailable" : String(optionsCount)} action="Review options" href={accountRoutes.purchaseOptions} />
      </div> : null}
      <header className={styles.heading}>
        <div><p>YOUR ACCOUNT</p><h1>Orders &amp; Fulfillment</h1><span>Operational status for retailer gift cards purchased through Zero Loss.</span></div>
        <nav aria-label="Order page actions" className={styles.headingActions}>
          <Link href="/account/notifications"><AccountIcon name="bell" />Notifications</Link>
          <Link href="/support"><AccountIcon name="security" />Get help</Link>
        </nav>
      </header>

      <section className={styles.summary} aria-label="Order status filters">
        {([
          { key: "all", label: "All", count: state.orders.length, icon: "all" },
          { key: "processing", label: "In progress", count: processing, icon: "active" },
          { key: "fulfilled", label: "Issued", count: fulfilled, icon: "gift" },
          { key: "exceptions", label: "Exceptions", count: exceptions, icon: "bell" },
        ] as const).map(item => <button key={item.key} type="button" aria-label={`${item.label}: ${state.source === "unavailable" ? "count unavailable" : `${item.count} ${item.count === 1 ? "order" : "orders"}`}`} aria-pressed={filter === item.key} onClick={() => setFilter(item.key)}>
          <AccountIcon name={item.icon} /><span>{item.label}</span><strong>{state.source === "unavailable" ? "—" : item.count}</strong>
        </button>)}
      </section>

      {state.source === "unavailable" ? <div role="status" className={styles.warning}>Orders could not be verified right now. No sample orders have been substituted.</div> : null}

      <div className={styles.contentGrid}>
        <header className={styles.sectionHeading}><div><p>YOUR ORDERS</p><h2 id="your-orders-heading">Retailer gift-card fulfillment</h2></div><span>{filter === "all" ? `${state.orders.length} ${state.orders.length === 1 ? "order" : "orders"}` : `${visibleOrders.length} of ${state.orders.length} orders`}</span></header>
        <section className={styles.orders} aria-labelledby="your-orders-heading">
          {state.orders.length && visibleOrders.length ? <div className={styles.orderList}>
            {visibleOrders.map(order => {
              const detail = presentation(order);
              return <article key={order.orderNumber} className={styles.orderCard} data-tone={detail.tone}>
                <div className={styles.productStage}><Image src={order.image} alt="" fill sizes="(max-width: 650px) 120px, 220px" className={styles.productImage} /></div>
                <div className={styles.orderCopy}>
                  <p className={styles.orderEyebrow}><AccountIcon name={order.status === "fulfilled" ? "gift" : "orders"} />{detail.eyebrow}</p>
                  <h3>{order.title}</h3>
                  <p className={styles.retailer}>{order.retailer}</p>
                  <p className={styles.description}>{detail.copy}</p>
                  <dl className={styles.orderFacts}>
                    <div><dt>Gift-card value</dt><dd>{formatUsdFromCents(order.faceValueCents)}</dd></div>
                    <div><dt>Paid at checkout</dt><dd>{formatUsdFromCents(order.amountPaidCents)}</dd></div>
                    <div><dt>Order</dt><dd>{order.orderNumber.slice(-8).toUpperCase()}</dd></div>
                  </dl>
                </div>
                <div className={styles.orderActions}>
                  <Link href={walletRewardHref({ slug: order.rewardSlug, rewardId: order.rewardId })} className={styles.primaryAction}>Open gift card<AccountIcon name="arrow" /></Link>
                  <Link href="/account/entries" className={styles.secondaryAction}>View in My Activity<AccountIcon name="chevron" /></Link>
                </div>
              </article>;
            })}
          </div> : state.orders.length ? <div className={styles.empty}>
            <span><AccountIcon name="orders" /></span><h3>No orders in this status</h3><p>All of your orders remain available in the full list.</p>
            <button type="button" onClick={() => setFilter("all")}>Show all orders<AccountIcon name="arrow" /></button>
          </div> : <div className={styles.empty}>
            <span><AccountIcon name="orders" /></span>
            <h3>{state.source === "unavailable" ? "Orders unavailable" : "No retailer gift-card orders yet"}</h3>
            <p>{state.source === "unavailable" ? "Please refresh shortly to try again." : "When you use a Purchase Option, its payment and gift-card issuance will appear here."}</p>
            <Link href="/account/entries?filter=completion">Review purchase options<AccountIcon name="arrow" /></Link>
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
            <Link href="/account/notifications"><span><AccountIcon name="bell" /></span><span><strong>Notifications</strong><small>See verified account updates</small></span><AccountIcon name="chevron" /></Link>
          </section>
          <p className={styles.truthNote}>Zero Loss issues retailer gift cards. Product selection, inventory, checkout, shipping and retailer fees remain on the retailer’s site.</p>
      </div>

      <section className={styles.fulfillmentHero} aria-labelledby="fulfillment-overview-heading">
        <div className={styles.heroCopy}>
          <p>FULFILLMENT CENTER</p>
          <h2 id="fulfillment-overview-heading">From confirmed payment to issued gift card.</h2>
          <span>Zero Loss tracks the retailer gift-card order. Retailer shopping and shipping happen on the retailer’s site.</span>
        </div>
        <ol className={styles.journey} aria-label="Gift-card fulfillment journey">
          <li data-active={state.orders.length > 0}><span><AccountIcon name="completion" /></span><strong>Payment confirmed</strong><small>Provider verified</small></li>
          <li data-active={processing > 0}><span><AccountIcon name="orders" /></span><strong>Issuance</strong><small>{processing} processing</small></li>
          <li data-active={fulfilled > 0}><span><AccountIcon name="gift" /></span><strong>Reward wallet</strong><small>{fulfilled} fulfilled</small></li>
          <li data-active={exceptions > 0}><span><AccountIcon name="bell" /></span><strong>Exceptions</strong><small>{exceptions} need attention</small></li>
        </ol>
      </section>

      <p className={styles.footerNote}>SHOPPING SHOULD NEVER FEEL LIKE A LOSS.</p>
    </div>
  </main>;
}
