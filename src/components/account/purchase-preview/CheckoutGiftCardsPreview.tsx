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

type Screen = "checkout" | "gift" | "wallet" | "activity";
type Popup = "confirm" | "success" | "other" | "share" | null;
type Product = { title: string; image: string };

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
  const [selected, setSelected] = useState(0);
  const [deadline, setDeadline] = useState(0);
  const [seconds, setSeconds] = useState(30);
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);
  const destination = useRef<HTMLElement>(null);
  const moved = useRef(false);
  const confirmed = useRef(false);
  const bought = cards.slice(0, quantity);
  const active = cards[selected];
  const total = quantity * 99;

  const close = useCallback(() => setPopup(null), []);
  const undo = useCallback(() => {
    setPopup(null);
    setNotice("Purchase canceled. No gift cards were purchased.");
  }, []);

  useEffect(() => {
    if (popup !== "confirm") return;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSeconds(remaining);
      if (remaining === 0) {
        setNotice("Time ran out. No purchase was made.");
        setPopup(null);
      }
    }, 200);
    return () => window.clearInterval(timer);
  }, [deadline, popup]);

  useLayoutEffect(() => {
    if (popup || !moved.current) return;
    moved.current = false;
    const target = destination.current?.querySelector<HTMLElement>('[data-current="true"]') ?? destination.current;
    target?.scrollIntoView?.({ block: "start", behavior: "instant" });
    target?.focus({ preventScroll: true });
  }, [popup, screen, selected]);

  function go(next: Screen, card = selected) {
    moved.current = true;
    setSelected(card);
    setPopup(null);
    setScreen(next);
  }

  function start() {
    confirmed.current = false;
    setNotice("");
    setDeadline(Date.now() + 30_000);
    setSeconds(30);
    setPopup("confirm");
  }

  function confirm() {
    if (confirmed.current) return;
    if (Date.now() >= deadline) {
      setNotice("Time ran out. No purchase was made.");
      setPopup(null);
      return;
    }
    confirmed.current = true;
    setSelected(0);
    setScreen("gift");
    setPopup("success");
  }

  function cardList(indices: number[], highlight = false) {
    return <ul className={styles.cards}>
      {indices.map(index => <li key={cards[index].ref} className={checkout.ticket} tabIndex={highlight && index === selected ? -1 : undefined}
        data-current={highlight && index === selected || undefined}>
        <Image src={product.image} alt="" width={48} height={48} />
        <div><strong>$100 Best Buy gift card</strong><p>Card ref. {cards[index].ref}</p>{highlight && index === selected ? <p className={styles.current}>Selected card</p> : null}</div>
        <button className={checkout.secondary} type="button" onClick={() => go("gift", index)} aria-label={`Open card ${cards[index].ref}`}>Open card</button>
      </li>)}
    </ul>;
  }

  return <main className={styles.page}>
    <div className={styles.shell}>
      <div className={styles.previewBar}>
        <span>Checkout preview · Sample cards</span>
        {screen === "checkout" ? null : <button type="button" onClick={() => { setNotice(""); go("checkout", 0); }}>Start over</button>}
        <Link href="/account/entries?filter=completed">Exit preview</Link>
      </div>
      {screen === "checkout" ? <section ref={destination} tabIndex={-1} className={`${checkout.ticket} ${checkout.content} ${styles.destination}`}>
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
      </section> : screen === "gift" ? <article className={reward.rewardTicket}>
        <section ref={destination} tabIndex={-1} className={`${reward.rewardPass} ${styles.destination}`} aria-label="Gift card">
          <h2>$100 Best Buy gift card</h2>
          <div className={reward.rewardIntroRow}>
            <p className={reward.rewardIntro}>Your gift card is ready.</p>
            <button type="button" className={`${reward.rewardShare} ${styles.share}`} onClick={() => { setCopied(false); setPopup("share"); }}>Share</button>
          </div>
          <div className={reward.codePanel}>
            <SampleRewardBarcode value={active.code} />
            <p className={reward.rewardCode}>{active.code.match(/.{4}/g)?.join(" ")}</p>
            <p className={reward.codeCaption}>Sample · Not redeemable</p>
          </div>
          <RewardRedemptionActions key={active.ref} displayCode={active.code} isPreview
            afterWalletButtons={quantity > 1 ? <button className={`${checkout.secondary} ${styles.otherButton}`} type="button"
              onClick={() => quantity === 2 ? go("gift", 1 - selected) : setPopup("other")}>
              {quantity === 2 ? "View other Best Buy card" : `View ${quantity - 1} other Best Buy cards`}
            </button> : null}
            afterShopping={<button type="button" className={styles.activityBack} onClick={() => go("activity")}>← Back to My Activity</button>} />
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
        <button type="button" className={styles.activityBack} onClick={() => go("wallet")}>Open My Gift Cards &amp; Rewards</button>
      </article> : <section ref={destination} tabIndex={-1} className={styles.destination}>
        <h1>{screen === "wallet" ? "My Gift Cards & Rewards" : "My Activity"}</h1>
        <div className={`${checkout.ticket} ${checkout.content}`}>
          <h2 className={styles.listHeading}>{screen === "wallet" ? "Available rewards" : "Completed"}</h2>
          {screen === "activity" ? <ProductRow product={product} /> : null}
          <p className={checkout.small}>{screen === "wallet" ? "Your sample gift cards from this checkout." : `Purchase completed · ${quantity} gift ${quantity === 1 ? "card" : "cards"} · $${total} paid`}</p>
          {cardList(bought.map((_, index) => index), true)}
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
    {popup === "success" ? <PurchaseDialog title={quantity === 1 ? "Your gift card is ready" : "Your gift cards are ready"} onClose={close}>
      <ProductRow product={product} />
      <p className={checkout.ready}>Purchase completed · ${total} paid</p>
      <div className={styles.successActions}>
        <button className={checkout.primary} type="button" onClick={() => go("gift", 0)}>Open gift card</button>
        <button className={checkout.secondary} type="button" onClick={() => go("wallet", 0)}>Open My Gift Cards &amp; Rewards</button>
      </div>
    </PurchaseDialog> : null}
    {popup === "other" ? <PurchaseDialog title="Other Best Buy cards" onClose={close}>
      <p className={checkout.small}>From this checkout</p>
      {cardList(bought.map((_, index) => index).filter(index => index !== selected))}
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
