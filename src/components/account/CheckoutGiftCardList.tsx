import Image from "next/image";
import Link from "next/link";
import { formatUsdFromCents } from "@/lib/wallet/money";
import { checkoutRewardsHref, purchasedRewardHref } from "@/lib/account/activity";
import type { CheckoutCard } from "@/lib/account/checkout-cards";
import { AccountReadRetryLink } from "./AccountReadRetryLink";
import styles from "./checkout-gift-cards.module.css";

export function CheckoutGiftCardList({ cards, count, slug, receipt, focused }: {
  cards: CheckoutCard[]; count: number; slug: string; receipt: string; focused?: string;
}) {
  const cardsByNumber = new Map(cards.map(card => [card.number, card]));
  const retryHref = checkoutRewardsHref(slug, receipt);
  return <>
    {cards.length < count ? <p role="status">Some cards aren’t available here yet. You can check each missing card below.</p> : null}
    <ul className={styles.cards}>
      {Array.from({ length: count }, (_, index) => {
        const number = index + 1;
        const card = cardsByNumber.get(number);
        if (!card) return <li key={number} className={styles.card}>
          <div><strong>Card {number} of {count}</strong><p>Status could not be checked.</p></div>
          <AccountReadRetryLink href={retryHref} className={styles.secondary}>Check card {number} again</AccountReadRetryLink>
        </li>;
        const { item, id } = card;
        return <li key={number} id={`checkout-card-${id}`} className={styles.card} data-focused={focused === id || undefined}>
          <Image src={item.image} alt="" width={48} height={48} />
          <div><strong>Card {number} of {count}</strong><p>{formatUsdFromCents(item.priceCents)} {item.retailer} · Ref. {id.slice(-8).toUpperCase()}</p>
            {item.rewardStatus !== "ready" ? <p>{item.rewardStatus === "issuance_pending" ? "Being issued" : item.rewardStatus === "issuance_failed" ? "Needs attention" : item.rewardStatus === "expired" ? "Expired" : item.rewardStatus === "redeemed" ? "Used" : item.rewardStatus === "cancelled" ? "Cancelled" : "Status unavailable"}</p> : null}
            {focused === id ? <p className={styles.lastViewed}>Last viewed</p> : null}</div>
          <Link className={styles.secondary} href={purchasedRewardHref(id, slug, receipt)} prefetch={false}>{item.rewardStatus === "ready" ? "Open card" : "View status for card"} {number}</Link>
        </li>;
      })}
    </ul>
  </>;
}
