"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { AccountIcon } from "@/components/account/AccountIcon";
import { saveDemoPaymentMethod } from "@/lib/payments/actions";
import { DEMO_CARD_TOKEN, DEMO_CARD_FIXTURES, demoCardFixture, type DemoCard, type DemoCardArtwork as Artwork, type DemoCardToken } from "@/lib/payments/demo-card";
import { DemoCardArtwork } from "./DemoCardArtwork";
import { MobileCardCamera } from "./MobileCardCamera";
import styles from "./demo-card-manager.module.css";

const TEST_CARD = "4242 4242 4242 4242";
const TEST_EXPIRY = "12/30";
const TEST_CODE = "123";

function digits(value: string) { return value.replace(/\D/g, ""); }

export function DemoCardManager({ displayName, savedCard = null, savedCards, cardUnavailable = false, enabled = false, embedded = false }: {
  displayName: string;
  savedCard?: DemoCard | null;
  savedCards?: DemoCard[];
  cardUnavailable?: boolean;
  enabled?: boolean;
  embedded?: boolean;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveDemoPaymentMethod, { status: "idle" });
  const [cardholder, setCardholder] = useState(displayName);
  const [cardNumber, setCardNumber] = useState(TEST_CARD);
  const [expiry, setExpiry] = useState(TEST_EXPIRY);
  const [securityCode, setSecurityCode] = useState(TEST_CODE);
  const [token] = useState<DemoCardToken>(DEMO_CARD_TOKEN);
  const [artwork] = useState<Artwork | undefined>(savedCards?.find(card => card.token === DEMO_CARD_TOKEN)?.artwork ?? (savedCard?.token === DEMO_CARD_TOKEN ? savedCard.artwork : undefined));
  const [showBack, setShowBack] = useState(false);
  const fixture = demoCardFixture(token)!;
  const firstCard = savedCards?.find(card => card.token === token) ?? (savedCard?.token === token ? savedCard : null);
  const [makeDefault, setMakeDefault] = useState(firstCard?.isDefault ?? !savedCard);
  const [clientError, setClientError] = useState("");

  const Root = embedded ? "div" : "main";
  return <Root className={embedded ? styles.embedded : styles.page}>
    <div className={styles.shell}>
      <header className={styles.header}>
        <div><span className={styles.eyebrow}>PAYMENT METHOD</span>{embedded ? <h2>Payment Methods</h2> : <h1>Add a card</h1>}<p>Keep a test card ready for faster preview funding.</p></div>
        <div className={styles.headerNote}><strong>SAFE PREVIEW MODE</strong><span>No real payment is processed.</span></div>
      </header>

      <div className={styles.contentGrid}>
        <aside className={styles.cardPreview} aria-label="Card preview">
          <DemoCardArtwork token={token} artwork={artwork} back={showBack} cardholder={artwork ? "DEMO CUSTOMER" : cardholder || "Preview customer"} />
          <button type="button" className={styles.artworkSide} onClick={() => setShowBack(value => !value)}>See {showBack ? "front" : "back"}</button>
          <div className={styles.savedStatus}>
            <span className={styles.statusIcon}><AccountIcon name="completed" /></span>
            <div><strong>{savedCard ? `Test card •••• ${savedCard.lastFour}` : "No saved card yet"}</strong><p>{savedCard?.isDefault ? "Current default payment method" : "Add the supplied test card below"}</p></div>
          </div>
          {savedCards && savedCards.length > 0 ? <div className={styles.savedStatus} aria-label="Saved sample cards"><div><strong>Your saved sample cards</strong>{savedCards.map(card => <p key={card.token}>Test card •••• {card.lastFour}{card.isDefault ? " · Default" : ""}</p>)}<Link className={styles.addFundsLink} href="/account/wallet?view=history#add-card">Add another sample card in Add funds</Link></div></div> : null}
        </aside>

        <section className={styles.formPanel} aria-labelledby="card-form-heading">
          <div className={styles.panelHeading}><div><span className={styles.step}>01</span><h2 id="card-form-heading">Card information</h2></div><span className={styles.testBadge}>TEST CARD</span></div>
          <p className={styles.intro}>Use the supplied preview card. The visible number, expiry and security code are checked in your browser, then discarded. Only the safe test-card reference is saved.</p>
          <form action={action} noValidate aria-label="Add card" onSubmit={event => {
            setClientError("");
            if (!cardholder.trim() || digits(cardNumber) !== digits(fixture.number) || expiry.trim() !== fixture.expiry || digits(securityCode) !== fixture.code) {
              event.preventDefault();
              setClientError("Use the supplied test card details to continue. Real card details are not accepted in this preview.");
            }
          }}>
            <input type="hidden" name="paymentMethod" value={token} />
            <input type="hidden" name="makeDefault" value={String(makeDefault)} />
            {artwork ? <input type="hidden" name="artwork" value={JSON.stringify(artwork)} /> : null}
            <div className={styles.cameraRow}><MobileCardCamera token={DEMO_CARD_FIXTURES.find(card => !savedCards?.some(saved => saved.token === card.token))?.token ?? token} displayName={displayName} disabled={pending || !enabled || cardUnavailable} onSaved={() => {
              router.push("/account/wallet?view=history#payment-methods"); router.refresh();
            }} /></div>
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
              <button type="submit" disabled={pending || !enabled}>{pending ? "Saving card…" : firstCard ? "Update card" : "Save card"}<AccountIcon name="arrow" /></button>
              <Link href="/account/wallet?view=history#add-funds">{state.status === "succeeded" ? "Continue to Add funds" : "Back to wallet"}</Link>
            </div>
          </form>
          <p className={styles.disclaimer}>Simulation only. This screen accepts no real card and creates no charge, funding request or balance change.</p>
        </section>
      </div>
    </div>
  </Root>;
}
