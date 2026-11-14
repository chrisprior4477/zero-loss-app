"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { NumberWheel, PurchaseDialog } from "@/components/account/PurchaseCheckoutDialog";
import { EntryUndoCountdown } from "@/components/product/EntryUndoCountdown";
import { RewardRedemptionActions } from "@/components/wallet/RewardRedemptionActions";
import { SampleRewardBarcode } from "@/components/wallet/SampleRewardBarcode";
import reward from "@/components/wallet/wallet-rewards.module.css";
import checkout from "./purchase-preview.module.css";
import styles from "./checkout-gift-cards-preview.module.css";

const cards = [
  { ref: "A61720F1", code: "450000001001" },
  { ref: "A61720F2", code: "450000001002" },
  { ref: "A61720F3", code: "450000001003" },
] as const;

type Screen = "checkout" | "receipt" | "gift" | "wallet" | "activity";
type Popup = "confirm" | "share" | null;
type Product = { title: string; image: string };

function secondsUntil(deadline: number) {
  return Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
}

function ProductRow({ product }: { product: Product }) {
  return <div className={checkout.product}>
    <Image src={product.image} alt="" width={64} height={60} />
    <div><p className={checkout.retailer}>BEST BUY</p><h2>{product.title}</h2><p>$100 gift card · $1 already applied per offer</p></div>
  </div>;
}

export function CheckoutGiftCardsPreview({ product }: { product: Product }) {
  const [quantity, setQuantity] = useState(2);
  const [screen, setScreen] = useState<Screen>("checkout");
  const [popup, setPopup] = useState<Popup>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [deadline, setDeadline] = useState(0);
  const [seconds, setSeconds] = useState(30);
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);
  const destination = useRef<HTMLElement>(null);
  const [navigation, setNavigation] = useState(0);
  const confirmed = useRef(false);
  const bought = cards.slice(0, quantity);
  const active = cards[selected ?? 0];
  const cardCount = quantity === 1 ? "1 gift card" : `${quantity} gift cards`;
  const total = quantity * 99;

  const close = useCallback(() => setPopup(null), []);
  const undo = useCallback(() => {
    setPopup(null);
    setNotice("Purchase canceled. No gift cards were purchased.");
  }, []);

  useEffect(() => {
    if (popup !== "confirm") return;
    const timer = window.setInterval(() => {
      const remaining = secondsUntil(deadline);
      setSeconds(remaining);
      if (remaining === 0) {
        setNotice("Time ran out. No purchase was made.");
        setPopup(null);
      }
    }, 200);
    return () => window.clearInterval(timer);
  }, [deadline, popup]);

  useLayoutEffect(() => {
    if (!navigation) return;
    const target = destination.current?.querySelector<HTMLElement>('[data-current="true"]') ?? destination.current;
    target?.scrollIntoView?.({ block: "start", behavior: "instant" });
    target?.focus({ preventScroll: true });
  }, [navigation]);

  function go(next: Screen, card = selected) {
    setNavigation(value => value + 1);
    setSelected(card);
    setPopup(null);
    setShowSuccess(false);
    setScreen(next);
  }

  function start() {
    confirmed.current = false;
    setNotice("");
    setDeadline(Date.now() + 30_000);
    setSeconds(30);
    setPopup("confirm");
  }

  function showReceiptCards() {
    setNavigation(value => value + 1);
    setShowSuccess(false);
  }

  function confirm() {
    if (confirmed.current) return;
    if (secondsUntil(deadline) === 0) {
      setNotice("Time ran out. No purchase was made.");
      setPopup(null);
      return;
    }
    confirmed.current = true;
    go("receipt", null);
    setShowSuccess(true);
  }

  function cardList() {
    return <ul className={styles.cards}>
      {bought.map((card, index) => <li key={card.ref} className={checkout.ticket} tabIndex={index === selected ? -1 : undefined}
        data-current={index === selected || undefined}>
        <Image src={product.image} alt="" width={48} height={48} />
        <div><strong>Card {index + 1} of {quantity}</strong><p>$100 Best Buy · Ref. {card.ref}</p>{index === selected ? <p className={styles.current}>Last viewed</p> : null}</div>
        <button className={checkout.secondary} type="button" onClick={() => go("gift", index)}>Open card {index + 1}</button>
      </li>)}
    </ul>;
  }

  return <main className={styles.page}>
    <div className={styles.shell}>
      <div className={styles.previewBar}>
        <span>Checkout preview · Sample cards</span>
        {screen === "checkout" ? null : <button type="button" onClick={() => { setNotice(""); go("checkout", null); }}>Start over</button>}
        <Link href="/account/entries?filter=completed">Exit preview</Link>
      </div>
      {screen === "checkout" ? <section ref={destination} tabIndex={-1} className={`${checkout.ticket} ${checkout.content} ${styles.lightTicket} ${styles.destination}`}>
        <h1>Your 3 purchase options</h1>
        <ProductRow product={product} />
        <div className={checkout.quantity}>
          <NumberWheel label="Buying" min={1} max={3} value={quantity} onChange={setQuantity} disabled={popup === "confirm"} />
          <div><h3>Buy {quantity} $100 gift {quantity === 1 ? "card" : "cards"}</h3>
            <p>Your <strong>$1</strong> already paid + <strong>$99</strong> remaining per card.</p></div>
        </div>
        <div className={checkout.facts}>
          <div><span>Purchase total</span><strong>${total}</strong></div>
          <div><span>In your preview wallet</span><strong>$350</strong></div>
          <p className={checkout.ready}>✓ Your wallet covers this purchase.</p>
        </div>
        {notice ? <p role="status" className={styles.notice}>{notice}</p> : null}
        <button type="button" className={checkout.primary} onClick={start}>Make purchase · ${total}</button>
      </section> : screen === "receipt" ? <section ref={destination} tabIndex={-1} className={styles.destination}>
        <h1>Purchase complete</h1>
        {showSuccess ? <aside className={styles.successToast} aria-label="Purchase confirmation">
          <div role="status">
            <strong>{quantity === 1 ? "Your gift card is ready" : `Your ${quantity} gift cards are ready`}</strong>
            <p>Best Buy · ${total} paid from your preview wallet</p>
          </div>
          <button type="button" className={styles.dismissToast} aria-label="Dismiss purchase confirmation" onClick={showReceiptCards}>×</button>
          <div className={styles.successActions}>
            <button className={checkout.primary} type="button" onClick={() => quantity === 1 ? go("gift", 0) : showReceiptCards()}>
              {quantity === 1 ? "Open gift card" : `View ${quantity} gift cards`}
            </button>
            <button className={checkout.secondary} type="button" onClick={() => go("wallet", quantity === 1 ? 0 : null)}>Open My Gift Cards &amp; Rewards</button>
          </div>
        </aside> : null}
        <div className={`${checkout.ticket} ${checkout.content} ${styles.lightTicket}`}>
          <h2 className={styles.listHeading}>Cards from this checkout</h2>
          <ProductRow product={product} />
          {!showSuccess ? cardList() : null}
          <button type="button" className={`${checkout.secondary} ${styles.activityBack}`} onClick={() => go("activity")}>← Back to My Activity</button>
        </div>
      </section> : screen === "gift" ? <article className={reward.rewardTicket}>
        <section ref={destination} tabIndex={-1} className={`${reward.rewardPass} ${styles.destination}`} aria-label="Gift card">
          <h2>$100 Best Buy gift card</h2>
          <div className={reward.rewardIntroRow}>
            <p className={reward.rewardIntro}>Your gift card is ready.</p>
            <button type="button" className={`${reward.rewardShare} ${styles.share}`} onClick={() => { setCopied(false); setPopup("share"); }}>Share</button>
          </div>
          <div className={styles.cardIdentity}>
            <p><strong>Card {(selected ?? 0) + 1} of {quantity}</strong><span>Ref. {active.ref}</span></p>
            {quantity > 1 ? <div role="group" className={styles.cardPicker} aria-label="Switch gift cards">
              {bought.map((card, index) => <button key={card.ref} type="button" aria-label={`Show card ${index + 1}`}
                aria-pressed={index === selected} onClick={() => go("gift", index)}>{index + 1}</button>)}
            </div> : null}
          </div>
          <div className={reward.codePanel}>
            <SampleRewardBarcode value={active.code} />
            <p className={reward.rewardCode}>{active.code.match(/.{4}/g)?.join(" ")}</p>
            <p className={reward.codeCaption}>Sample · Not redeemable</p>
          </div>
          <RewardRedemptionActions key={active.ref} displayCode={active.code} isPreview
            afterShopping={<button type="button" className={`${checkout.secondary} ${styles.activityBack}`} onClick={() => go("activity")}>← Back to My Activity</button>} />
        </section>
        <section className={reward.rewardDetails} aria-label="Reward details">
          <h3>Reward details</h3>
          <dl>
            <div><dt>Retailer</dt><dd>Best Buy</dd></div><div><dt>Value</dt><dd>$100</dd></div>
            <div><dt>Status</dt><dd className={reward.goodStatus}>Claimed — ready to use</dd></div>
            <div><dt>Claimed on</dt><dd>Nov 14, 2026</dd></div>
            <div><dt>Card reference</dt><dd>{active.ref}</dd></div>
          </dl>
        </section>
      </article> : <section ref={destination} tabIndex={-1} className={styles.destination}>
        <h1>{screen === "wallet" ? "My Gift Cards & Rewards" : "My Activity"}</h1>
        <div className={`${checkout.ticket} ${checkout.content} ${styles.lightTicket}`}>
          <h2 className={styles.listHeading}>{screen === "wallet" ? "Available rewards" : "Completed"}</h2>
          {screen === "activity" ? <ProductRow product={product} /> : null}
          <p className={checkout.small}>{screen === "wallet" ? `${cardCount} from this checkout` : `Purchase completed · ${cardCount} · $${total} paid`}</p>
          {cardList()}
          {screen === "wallet"
            ? <button type="button" className={`${checkout.secondary} ${styles.activityBack}`} onClick={() => go("activity")}>← Back to My Activity</button>
            : <button type="button" className={`${checkout.secondary} ${styles.activityBack}`} onClick={() => go("wallet")}>Open My Gift Cards &amp; Rewards</button>}
        </div>
      </section>}
    </div>
    {popup === "confirm" ? <PurchaseDialog title="Confirm your purchase" onClose={undo}>
      <ProductRow product={product} />
      <div className={checkout.facts}>
        <div><span>{quantity} gift {quantity === 1 ? "card" : "cards"}</span><strong>${total}</strong></div>
        <div><span>Wallet after purchase</span><strong>${350 - total}</strong></div>
      </div>
      <div className={checkout.countdown}><p>Confirm or undo.<small>Time runs out? Nothing is purchased.</small></p><EntryUndoCountdown seconds={seconds} /></div>
      <div className={checkout.twoButtons}>
        <button className={checkout.secondary} type="button" onClick={undo}>Undo</button>
        <button className={checkout.primary} type="button" onClick={confirm}>Confirm purchase</button>
      </div>
      <p className={checkout.footnote}>Simulation only · No real payment or shipment.</p>
    </PurchaseDialog> : null}
    {popup === "share" ? <PurchaseDialog title="Share this product" onClose={close}>
      <ProductRow product={product} />
      <p className={checkout.small}>Share the product link.</p>
      <button type="button" className={checkout.secondary} onClick={async () => {
        try {
          await navigator.clipboard.writeText(new URL("/items/logitech-mx-master-3s", window.location.origin).href);
          setCopied(true);
        } catch { setCopied(false); }
      }}>{copied ? "Link copied" : "Copy product link"}</button>
      <p className={checkout.footnote} role="status">{copied ? "Product link copied. The gift-card number stays private." : ""}</p>
    </PurchaseDialog> : null}
  </main>;
}
