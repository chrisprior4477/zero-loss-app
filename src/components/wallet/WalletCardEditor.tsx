"use client";

import { useActionState, useId, useRef, useState } from "react";
import { saveDemoPaymentMethod } from "@/lib/payments/actions";
import { DEMO_CARD_FIXTURES, demoCardFixture, type DemoCard, type DemoCardArtwork as Artwork, type DemoCardToken } from "@/lib/payments/demo-card";
import { DemoCardArtwork } from "./DemoCardArtwork";
import { MobileCardCamera } from "./MobileCardCamera";
import styles from "./wallet-payments.module.css";

export function revealWalletSection(id: string, mobileId?: string) {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const target = document.getElementById(mobileId && window.innerWidth <= 767 ? mobileId : id);
    if (!target) return;
    const header = document.querySelector("header.sticky")?.getBoundingClientRect().bottom ?? 0;
    window.scrollTo({ top: Math.max(0, window.scrollY + target.getBoundingClientRect().top - header - 12), behavior: "auto" });
  }));
}

/** Both entry points save through the existing server action; visible card details never leave the browser. */
export function WalletCardEditor({ token, savedCard, displayName = "", initialArtwork, depositLabel, disabled = false, onSaved, onCancel }: {
  token: DemoCardToken;
  savedCard?: DemoCard;
  displayName?: string;
  initialArtwork?: Artwork;
  depositLabel?: string;
  disabled?: boolean;
  onSaved: (card: DemoCard) => void;
  onCancel: () => void;
}) {
  const fixture = demoCardFixture(token)!;
  const nameInput = useRef<HTMLInputElement>(null);
  const [cardholder, setCardholder] = useState(displayName);
  const [number, setNumber] = useState(fixture.number as string);
  const [expiry, setExpiry] = useState(fixture.expiry as string);
  const [code, setCode] = useState(fixture.code as string);
  const [artwork] = useState(initialArtwork ?? savedCard?.artwork);
  const [makeDefault, setMakeDefault] = useState(savedCard?.isDefault ?? true);
  const [makeDepositDefault, setMakeDepositDefault] = useState(savedCard ? savedCard.isDepositDefault ?? savedCard.isDefault : true);
  const [error, setError] = useState("");
  const [back, setBack] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const previewId = useId();
  const enteredFixture = DEMO_CARD_FIXTURES.find(card => card.number.replaceAll(" ", "") === number.replaceAll(" ", ""));
  const [state, action, pending] = useActionState(async (previous: Awaited<ReturnType<typeof saveDemoPaymentMethod>>, data: FormData) => {
    try {
      const result = await saveDemoPaymentMethod(previous, data);
      if (result.status === "succeeded") {
        const savedFixture = demoCardFixture(data.get("paymentMethod"))!;
        onSaved({ token: savedFixture.token, lastFour: savedFixture.lastFour, isDefault: data.get("makeDefault") === "true", isDepositDefault: data.get("makeDepositDefault") === "true", ...(artwork ? { artwork } : {}) });
      }
      return result;
    } catch { return { status: "error" as const, message: "The card could not be saved. Please try again." }; }
  }, { status: "idle" });

  return <section id="wallet-card-editor" className={styles.editor} aria-labelledby="wallet-card-editor-title">
    <h3 id="wallet-card-editor-title">{savedCard ? "Edit card" : "Add a card"}</h3>
    {depositLabel ? <p className={styles.notice}>Your {depositLabel} deposit is waiting. Saving a card does not add funds.</p> : <p>Save a payment method without adding funds.</p>}
    <div className={`${styles.actions} ${styles.pairedActions} ${styles.cardEntryActions}`}>
      <button type="button" className={styles.primary} disabled={disabled || pending} onClick={() => nameInput.current?.focus()}>Add Card</button>
      <MobileCardCamera token={enteredFixture?.token ?? token} displayName={displayName} makeDefault={makeDefault} makeDepositDefault={makeDepositDefault} disabled={disabled || pending} onSaved={onSaved} />
    </div>
    <form action={action} noValidate aria-label="Save payment method" onSubmit={event => {
      setError("");
      if (!cardholder.trim() || !enteredFixture || expiry.trim() !== enteredFixture.expiry || code.trim() !== enteredFixture.code) {
        event.preventDefault();
        setError("Use the supplied sample card details. Real card details are not accepted in this preview.");
      }
    }}>
      <input type="hidden" name="paymentMethod" value={enteredFixture?.token ?? ""} />
      <input type="hidden" name="makeDefault" value={String(makeDefault)} />
      <input type="hidden" name="makeDepositDefault" value={String(makeDepositDefault)} />
      {artwork ? <input type="hidden" name="artwork" value={JSON.stringify(artwork)} /> : null}
      <label>Cardholder name<input ref={nameInput} autoComplete="off" value={cardholder} onChange={event => setCardholder(event.target.value)} disabled={disabled || pending} /></label>
      <label>Card number<input inputMode="numeric" autoComplete="off" value={number} onChange={event => setNumber(event.target.value)} disabled={disabled || pending} /></label>
      <p className={styles.issuer}>{enteredFixture?.issuer ?? "Sample card"}</p>
      <div className={styles.fields}>
        <label>Expiry<input autoComplete="off" value={expiry} onChange={event => setExpiry(event.target.value)} disabled={disabled || pending} /></label>
        <label>Security code<input inputMode="numeric" autoComplete="off" value={code} onChange={event => setCode(event.target.value)} disabled={disabled || pending} /></label>
      </div>
      <label className={styles.choice}><input type="checkbox" checked={makeDefault} onChange={event => setMakeDefault(event.target.checked)} disabled={disabled || pending} />Use this card for future transactions</label>
      <label className={styles.choice}><input type="checkbox" checked={makeDepositDefault} onChange={event => setMakeDepositDefault(event.target.checked)} disabled={disabled || pending} />Use this card for deposits</label>
      {error || state.status === "error" ? <p role="alert" className={styles.error}>{error || (state.status === "error" ? state.message : "")}</p> : null}
      <div className={`${styles.actions} ${styles.editorActions}`}>
        <button type="submit" disabled={disabled || pending} className={styles.confirm}>{pending ? "Saving…" : savedCard ? "Update card" : "Save card"}</button>
        <button type="button" disabled={pending} className={styles.secondary} onClick={onCancel}>Cancel</button>
        <button type="button" className={styles.secondary} aria-expanded={showCard} aria-controls={previewId} onClick={() => setShowCard(value => !value)}>{showCard ? "Hide card" : "See card"}</button>
        <a className={styles.secondary} href="#balance">Back to wallet</a>
      </div>
      <div id={previewId} hidden={!showCard} className={styles.artwork}><DemoCardArtwork token={enteredFixture?.token ?? token} artwork={artwork} cardholder={cardholder || "Preview customer"} back={back} /><button type="button" className={styles.secondary} onClick={() => setBack(value => !value)}>See {back ? "front" : "back"}</button></div>
      <p className={styles.sample}>Simulation only. Only the safe sample-card reference and your preference are saved. No payment is made.</p>
    </form>
  </section>;
}
