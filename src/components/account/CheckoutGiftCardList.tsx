import Image from "next/image";
import Link from "next/link";
import { formatUsdFromCents } from "@/lib/wallet/money";
import { purchasedRewardHref } from "@/lib/account/activity";
import type { CheckoutCard } from "@/lib/account/checkout-cards";
import styles from "./checkout-gift-cards.module.css";

export function CheckoutGiftCardList({ cards, count, slug, receipt, focused }: {
  cards: CheckoutCard[]; count: number; slug: string; receipt: string; focused?: string;
}) {
  return <>
    {cards.length < count ? <p role="status">Some cards aren’t available here yet. Check Gift Cards &amp; Rewards for updates.</p> : null}
    {cards.length > 0 ? <ul className={styles.cards}>
      {cards.map(({ item, id, number }) => <li key={id} id={`checkout-card-${id}`} className={styles.card} data-focused={focused === id || undefined}>
        <Image src={item.image} alt="" width={48} height={48} />
        <div><strong>Card {number} of {count}</strong><p>{formatUsdFromCents(item.priceCents)} {item.retailer} · Ref. {id.slice(-8).toUpperCase()}</p>
          {focused === id ? <p className={styles.lastViewed}>Last viewed</p> : null}</div>
        <Link className={styles.secondary} href={purchasedRewardHref(id, slug, receipt)} prefetch={false}>Open card {number}</Link>
      </li>)}
    </ul> : null}
  </>;
}
