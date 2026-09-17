import Image from "next/image";
import Link from "next/link";
import { AccountIcon } from "./AccountIcon";
import { activityHref, walletRewardHref, type AccountActivity, type ActivityItem } from "@/lib/account/activity";
import { formatUsdFromCents } from "@/lib/wallet/money";
import styles from "./orders-fulfillment.module.css";

const fulfillmentStatuses = new Set(["prize", "completion", "completed"]);

function orderHref(item: ActivityItem) {
  return item.status === "prize" && item.rewardKind === "digital" ? walletRewardHref(item) : activityHref(item);
}

function historyHref(item: ActivityItem) {
  const params = new URLSearchParams({ filter: item.status, item: item.slug });
  return `/account/entries?${params}`;
}

function presentation(item: ActivityItem) {
  if (item.status === "prize") return {
    eyebrow: "Reward ready",
    title: "Ready to use",
    copy: item.rewardKind === "digital" ? "Your digital reward is ready in My Rewards." : "Your winning product is ready for its fulfillment next step.",
    action: item.rewardKind === "digital" ? "Open reward" : "Claim prize",
    tone: "reward",
  } as const;
  if (item.status === "completion") return {
    eyebrow: "Action needed",
    title: "Complete purchase",
    copy: `${formatUsdFromCents(item.paidCents)} is already applied to this exact product.`,
    action: "Review purchase",
    tone: "action",
  } as const;
  return {
    eyebrow: "Fulfillment history",
    title: "Completed",
    copy: "This outcome is recorded in your My Zero Loss history.",
    action: "View details",
    tone: "complete",
  } as const;
}

export function OrdersFulfillment({ state }: { state: AccountActivity }) {
  const items = state.source === "unavailable" ? [] : state.activity.filter(item => fulfillmentStatuses.has(item.status));
  const completionCount = items.filter(item => item.status === "completion").length;
  const rewardCount = items.filter(item => item.status === "prize").length;
  const completedCount = items.filter(item => item.status === "completed").length;
  const activeCount = state.source === "unavailable" ? null : state.activity.filter(item => item.status === "active").length;

  return <main className={styles.page}>
    <div className={styles.shell}>
      <header className={styles.heading}>
        <div><p>My Zero Loss</p><h1>Orders &amp; Fulfillment</h1><span>Every reward, purchase option, and completed outcome—connected.</span></div>
        <nav aria-label="Order page actions" className={styles.headingActions}>
          <Link href="/account/notifications"><AccountIcon name="bell" />Notifications</Link>
          <Link href="/support"><AccountIcon name="security" />Get help</Link>
        </nav>
      </header>

      <section className={styles.fulfillmentHero} aria-labelledby="fulfillment-overview-heading">
        <div className={styles.heroCopy}>
          <p>Fulfillment center</p>
          <h2 id="fulfillment-overview-heading">Your next step is always clear.</h2>
          <span>Ready outcomes stay here until you open, complete, or review them.</span>
        </div>
        <ol className={styles.journey} aria-label="Fulfillment journey">
          <li data-active={items.length > 0}><span><AccountIcon name="prize" /></span><strong>Outcome ready</strong><small>{items.length} {items.length === 1 ? "item" : "items"}</small></li>
          <li data-active={completionCount + rewardCount > 0}><span><AccountIcon name="completion" /></span><strong>Take action</strong><small>{completionCount + rewardCount} ready</small></li>
          <li><span><AccountIcon name="orders" /></span><strong>Retailer fulfillment</strong><small>When confirmed</small></li>
          <li data-active={completedCount > 0}><span><AccountIcon name="completed" /></span><strong>Complete</strong><small>{completedCount} recorded</small></li>
        </ol>
      </section>

      <section className={styles.summary} aria-label="Order summary">
        <article data-tone="action"><span><AccountIcon name="completion" /></span><div><p>Action needed</p><strong>{state.source === "unavailable" ? "—" : completionCount}</strong><small>Purchase options to review</small></div><Link href="/account/entries?filter=completion" aria-label="View purchase options"><AccountIcon name="chevron" /></Link></article>
        <article data-tone="reward"><span><AccountIcon name="gift" /></span><div><p>Rewards ready</p><strong>{state.source === "unavailable" ? "—" : rewardCount}</strong><small>Prizes ready to open</small></div><Link href="/account/wallet" aria-label="View ready rewards"><AccountIcon name="chevron" /></Link></article>
        <article data-tone="complete"><span><AccountIcon name="orders" /></span><div><p>Completed</p><strong>{state.source === "unavailable" ? "—" : completedCount}</strong><small>Recorded outcomes</small></div><Link href="/account/entries?filter=completed" aria-label="View completed outcomes"><AccountIcon name="chevron" /></Link></article>
      </section>

      {state.source === "unavailable" ? <div role="status" className={styles.warning}>Orders and fulfillment could not be verified right now. No sample orders have been substituted.</div> : null}

      <div className={styles.contentGrid}>
        <section className={styles.orders} aria-labelledby="your-orders-heading">
          <header className={styles.sectionHeading}><div><p>YOUR ITEMS</p><h2 id="your-orders-heading">Ready for their next step</h2></div><span>{items.length} {items.length === 1 ? "item" : "items"}</span></header>
          {items.length ? <div className={styles.orderList}>
            {items.map(item => {
              const detail = presentation(item);
              return <article key={item.slug} className={styles.orderCard} data-tone={detail.tone}>
                <div className={styles.productStage}><Image src={item.image} alt="" fill sizes="(max-width: 650px) 120px, 210px" className={styles.productImage} /></div>
                <div className={styles.orderCopy}>
                  <p className={styles.orderEyebrow}><AccountIcon name={item.status} />{detail.eyebrow}</p>
                  <h3>{item.title}</h3>
                  <p className={styles.retailer}>{item.retailer}</p>
                  <p className={styles.description}>{detail.copy}</p>
                  <dl className={styles.orderFacts}>
                    <div><dt>Value</dt><dd>{formatUsdFromCents(item.priceCents)}</dd></div>
                    {item.status === "completion" ? <><div><dt>Applied</dt><dd>{formatUsdFromCents(item.paidCents)}</dd></div><div><dt>Remaining</dt><dd>{formatUsdFromCents(item.remainingCents)}</dd></div></> : <div><dt>Status</dt><dd>{detail.title}</dd></div>}
                  </dl>
                  <p className={styles.availability}>{item.availability}</p>
                </div>
                <div className={styles.orderActions}>
                  <Link href={orderHref(item)} className={styles.primaryAction}>{detail.action}<AccountIcon name="arrow" /></Link>
                  <Link href={historyHref(item)} className={styles.secondaryAction}>View in My Zero Loss<AccountIcon name="chevron" /></Link>
                </div>
              </article>;
            })}
          </div> : <div className={styles.empty}>
            <span><AccountIcon name="orders" /></span>
            <h3>{state.source === "unavailable" ? "Orders unavailable" : "Nothing needs fulfillment yet"}</h3>
            <p>{state.source === "unavailable" ? "Please refresh shortly to try again." : "Winning rewards and purchase options will appear here when they are ready."}</p>
            <Link href="/browse">Explore products<AccountIcon name="arrow" /></Link>
          </div>}
        </section>

        <aside className={styles.sideRail} aria-label="Fulfillment links">
          <section>
            <p className={styles.sideEyebrow}>KEEP MOVING</p>
            <h2>Everything stays connected.</h2>
            <Link href="/account/entries"><span><AccountIcon name="layers" /></span><span><strong>My Zero Loss</strong><small>{activeCount === null ? "Activity unavailable" : `${activeCount} ${activeCount === 1 ? "entry" : "entries"} still open`}</small></span><AccountIcon name="chevron" /></Link>
            <Link href="/account/wallet"><span><AccountIcon name="gift" /></span><span><strong>My Rewards</strong><small>Open ready digital rewards</small></span><AccountIcon name="chevron" /></Link>
            <Link href="/account/notifications"><span><AccountIcon name="bell" /></span><span><strong>Notifications</strong><small>See the latest verified updates</small></span><AccountIcon name="chevron" /></Link>
          </section>
          <section className={styles.helpCard}>
            <span><AccountIcon name="security" /></span><h2>Need help with an item?</h2><p>Contact support from the same account so your verified activity stays connected.</p><Link href="/support">Visit support<AccountIcon name="arrow" /></Link>
          </section>
          <p className={styles.truthNote}>Tracking numbers, carriers, and delivery dates appear only after a fulfillment record is confirmed. Nothing is estimated or invented here.</p>
        </aside>
      </div>
      <p className={styles.footerNote}>REAL PRODUCTS. REAL PROGRESS.</p>
    </div>
  </main>;
}
