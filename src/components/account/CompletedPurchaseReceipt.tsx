"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { checkoutRewardsHref, completedActivityHref, purchasedRewardHref } from "@/lib/account/activity";
import type { CheckoutCard } from "@/lib/account/checkout-cards";
import { formatUsdFromCents } from "@/lib/wallet/money";
import { CheckoutGiftCardList } from "./CheckoutGiftCardList";
import { AccountSettingsLandingScroll } from "./AccountSettingsLandingScroll";
import checkout from "./purchase-checkout.module.css";
import styles from "./checkout-gift-cards.module.css";

export function CompletedPurchaseReceipt({ title, totalCents, count, cards, slug, receipt, fallbackHref }: {
  title: string; totalCents: number; count: number; cards: CheckoutCard[]; slug: string; receipt: string; fallbackHref: string;
}) {
  const [showToast, setShowToast] = useState(true);
  const [showCards, setShowCards] = useState(false);
  const cardsHeading = useRef<HTMLHeadingElement>(null);
  const first = cards[0];
  const readyCount = cards.filter(({ item }) => item.rewardStatus === "ready").length;
  const allReady = readyCount === count;
  function revealCards() {
    setShowToast(false);
    setShowCards(true);
    cardsHeading.current?.focus();
  }
  return <div className={checkout.page}><div className={checkout.shell}>
    <AccountSettingsLandingScroll target="purchase-complete" visitKey={receipt} settleAfterNavigation allScreens />
    <h1 id="purchase-complete" className={styles.title}>Purchase receipt</h1>
    {showToast ? <aside className={styles.toast} aria-label="Purchase confirmation">
      <div role="status">
        <strong>{allReady ? count === 1 ? "Your gift card is ready" : `Your ${count} gift cards are ready` : "Purchase complete"}</strong>
        <p>{formatUsdFromCents(totalCents)} paid from your wallet</p>
      </div>
      <button type="button" className={styles.dismiss} aria-label="Dismiss purchase confirmation" onClick={revealCards}>×</button>
      <div className={styles.actions}>
        {count > 1 && first ? <button type="button" className={checkout.primary} onClick={revealCards}>View {count} gift cards</button>
          : first ? <Link className={checkout.primary} href={purchasedRewardHref(first.id, slug, receipt)} prefetch={false}>{allReady ? "Open gift card" : "View gift card status"}</Link>
            : <Link className={checkout.primary} href={fallbackHref}>View completed purchases</Link>}
        <Link className={styles.secondary} href={checkoutRewardsHref(slug, receipt)} prefetch={false}>Open My Gift Cards &amp; Rewards</Link>
      </div>
    </aside> : null}
    <section className={`${checkout.ticket} ${checkout.content}`} aria-labelledby="purchased-cards-heading">
      <h2 id="purchased-cards-heading" ref={cardsHeading} tabIndex={-1} className={styles.heading}>Cards from this checkout</h2>
      <p>{title} · {count} {count === 1 ? "gift card" : "gift cards"}</p>
      {showCards ? <CheckoutGiftCardList cards={cards} count={count} slug={slug} receipt={receipt} /> : null}
      <Link className={`${styles.secondary} ${styles.returnButton}`} href={completedActivityHref(first?.item.entryId, { slug, receipt })}>← Back to My Activity</Link>
    </section>
  </div></div>;
}
