"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { AccountIcon } from "@/components/account/AccountIcon";
import { saveDemoPaymentMethod } from "@/lib/payments/actions";
import { DEMO_CARD_TOKEN, type DemoCard } from "@/lib/payments/demo-card";
import styles from "./demo-card-manager.module.css";

const TEST_CARD = "4242 4242 4242 4242";
const TEST_EXPIRY = "12/30";
const TEST_CODE = "123";

function digits(value: string) { return value.replace(/\D/g, ""); }

export function DemoCardManager({ displayName, savedCard = null, cardUnavailable = false, enabled = false }: {
  displayName: string;
  savedCard?: DemoCard | null;
  cardUnavailable?: boolean;
  enabled?: boolean;
}) {
  const [state, action, pending] = useActionState(saveDemoPaymentMethod, { status: "idle" });
  const [cardholder, setCardholder] = useState(displayName);
  const [cardNumber, setCardNumber] = useState(TEST_CARD);
  const [expiry, setExpiry] = useState(TEST_EXPIRY);
  const [securityCode, setSecurityCode] = useState(TEST_CODE);
  const [makeDefault, setMakeDefault] = useState(savedCard?.isDefault ?? true);
  const [clientError, setClientError] = useState("");
  const lastFour = digits(cardNumber).slice(-4).padStart(4, "•");

  return <main className={styles.page}>
    <div className={styles.shell}>
      <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
        <Link href="/account/entries">My Activity</Link><span aria-hidden="true">›</span>
        <Link href="/account/wallet?view=history">Wallet &amp; Transactions</Link><span aria-hidden="true">›</span><span>Add Card</span>
      </nav>

      <header className={styles.header}>
        <div><span className={styles.eyebrow}>PAYMENT METHOD</span><h1>Add a card</h1><p>Keep a test card ready for faster preview funding.</p></div>
        <div className={styles.headerNote}><strong>SAFE PREVIEW MODE</strong><span>No real payment is processed.</span></div>
      </header>

      <div className={styles.contentGrid}>
        <aside className={styles.cardPreview} aria-label="Card preview">
          <div className={styles.cardGlow}>
            <div className={styles.cardTop}><span>ZERO LOSS</span><AccountIcon name="wallet" /></div>
            <span className={styles.chip} aria-hidden="true" />
            <p className={styles.previewNumber}>{cardNumber || "•••• •••• •••• ••••"}</p>
            <div className={styles.cardBottom}><span><small>Cardholder</small>{cardholder || "Preview customer"}</span><span><small>Expires</small>{expiry || "MM/YY"}</span></div>
          </div>
          <div className={styles.savedStatus}>
            <span className={styles.statusIcon}><AccountIcon name="completed" /></span>
            <div><strong>{savedCard ? `Test card •••• ${savedCard.lastFour}` : "No saved card yet"}</strong><p>{savedCard?.isDefault ? "Current default payment method" : "Add the supplied test card below"}</p></div>
          </div>
        </aside>

        <section className={styles.formPanel} aria-labelledby="card-form-heading">
          <div className={styles.panelHeading}><div><span className={styles.step}>01</span><h2 id="card-form-heading">Card information</h2></div><span className={styles.testBadge}>TEST CARD</span></div>
          <p className={styles.intro}>Use the supplied preview card. The visible number, expiry and security code are checked in your browser, then discarded. Only the safe test-card reference is saved.</p>
          <form action={action} noValidate aria-label="Add card" onSubmit={event => {
            setClientError("");
            if (!cardholder.trim() || digits(cardNumber) !== "4242424242424242" || expiry.trim() !== TEST_EXPIRY || digits(securityCode) !== TEST_CODE) {
              event.preventDefault();
              setClientError("Use the supplied test card details to continue. Real card details are not accepted in this preview.");
            }
          }}>
            <input type="hidden" name="paymentMethod" value={DEMO_CARD_TOKEN} />
            <input type="hidden" name="makeDefault" value={String(makeDefault)} />
            <label>Cardholder name<input aria-label="Cardholder name" autoComplete="off" value={cardholder} onChange={event => setCardholder(event.target.value)} disabled={pending || !enabled} /></label>
            <label>Card number<input aria-label="Card number" inputMode="numeric" autoComplete="off" value={cardNumber} onChange={event => setCardNumber(event.target.value)} disabled={pending || !enabled} /></label>
            <div className={styles.fieldRow}>
              <label>Expiry<input aria-label="Expiry" inputMode="numeric" autoComplete="off" value={expiry} onChange={event => setExpiry(event.target.value)} disabled={pending || !enabled} /></label>
              <label>Security code<input aria-label="Security code" inputMode="numeric" autoComplete="off" value={securityCode} onChange={event => setSecurityCode(event.target.value)} disabled={pending || !enabled} /></label>
            </div>
            <div className={styles.cardCheck}><span><AccountIcon name="security" /></span><div><strong>Preview-safe card entry</strong><p>Nothing typed into these visible fields is submitted or stored.</p></div></div>
            <label className={styles.defaultChoice}><input type="checkbox" checked={makeDefault} onChange={event => setMakeDefault(event.target.checked)} disabled={pending || !enabled} />Use this card for future preview transactions</label>
            {!enabled ? <p role="alert" className={styles.error}>Card saving is not available for this account.</p> : null}
            {cardUnavailable ? <p role="alert" className={styles.error}>Your saved card could not be loaded. You can retry after refreshing this page.</p> : null}
            {clientError ? <p role="alert" className={styles.error}>{clientError}</p> : null}
            {state.status !== "idle" ? <p role="status" className={state.status === "succeeded" ? styles.success : styles.error}>{state.message}</p> : null}
            <div className={styles.actions}>
              <button type="submit" disabled={pending || !enabled}>{pending ? "Saving card…" : savedCard ? "Update card" : "Save card"}<AccountIcon name="arrow" /></button>
              <Link href="/account/wallet?view=history#add-funds">{state.status === "succeeded" ? "Continue to Add funds" : "Back to wallet"}</Link>
            </div>
          </form>
          <p className={styles.disclaimer}>Simulation only. This screen accepts no real card and creates no charge, funding request or balance change.</p>
        </section>
      </div>
    </div>
  </main>;
}
