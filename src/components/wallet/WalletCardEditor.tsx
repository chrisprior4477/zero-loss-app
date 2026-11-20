"use client";

import { startTransition, useActionState, useId, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveDemoPaymentMethod } from "@/lib/payments/actions";
import { DEMO_CARD_FIXTURES, demoCardFixture, type DemoCard, type DemoCardArtwork as Artwork, type DemoCardToken } from "@/lib/payments/demo-card";
import { DemoCardArtwork } from "./DemoCardArtwork";
import { MobileCardCamera } from "./MobileCardCamera";
import styles from "./wallet-payments.module.css";

export const savedCardEditPrefix = "#wallet-edit-card/";
export const fundingCardEditorId = "funding-card-editor";

export function openWalletPanel(hash: string, state: object | null = null, replace = false) {
  if (replace) window.history.replaceState(state, "", hash);
  else if (window.location.hash !== hash) window.history.pushState(state, "", hash);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

export function revealWalletSection(id: string, mobileId = id === "add-funds" ? "funding-amount" : id, moveFocus = false, keepFocusedControl = false) {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const target = (window.innerWidth <= 767 ? document.getElementById(mobileId) : null) ?? document.getElementById(id);
    if (!target || (keepFocusedControl && target.contains(document.activeElement))) return;
    const header = document.querySelector("header.sticky")?.getBoundingClientRect().bottom ?? 0;
    window.scrollTo({ top: Math.max(0, window.scrollY + target.getBoundingClientRect().top - header - 12), behavior: "auto" });
    if (moveFocus) target.querySelector<HTMLElement>("h2[tabindex], h3[tabindex]")?.focus({ preventScroll: true });
  }));
}

/** Both entry points save through the existing server action; visible card details never leave the browser. */
export function WalletCardEditor({ token, savedCard, displayName = "", initialArtwork, depositLabel, disabled = false, onSaved, onCancel, onAddCard }: {
  token: DemoCardToken;
  savedCard?: DemoCard;
  displayName?: string;
  initialArtwork?: Artwork;
  depositLabel?: string;
  disabled?: boolean;
  onSaved: (card: DemoCard, source?: "camera") => void;
  onCancel: () => void;
  onAddCard?: () => void;
}) {
  const router = useRouter();
  const fixture = demoCardFixture(token)!;
  const nameInput = useRef<HTMLInputElement>(null);
  const numberInput = useRef<HTMLInputElement>(null);
  const expiryInput = useRef<HTMLInputElement>(null);
  const codeInput = useRef<HTMLInputElement>(null);
  const validationId = useId();
  const editorUrl = useRef<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => {
    editorUrl.current = window.location.href;
    const frame = requestAnimationFrame(() => {
      if (document.activeElement === document.body) heading.current?.focus({ preventScroll: true });
    });
    return () => { cancelAnimationFrame(frame); editorUrl.current = null; };
  }, []);
  const [cardholder, setCardholder] = useState(displayName);
  const [number, setNumber] = useState(fixture.number as string);
  const [expiry, setExpiry] = useState(fixture.expiry as string);
  const [code, setCode] = useState(fixture.code as string);
  const [artwork] = useState(initialArtwork ?? savedCard?.artwork);
  const [defaultChoice, setDefaultChoice] = useState<{ checked: boolean; original: boolean } | null>(null);
  const [depositChoice, setDepositChoice] = useState<{ checked: boolean; original: boolean } | null>(null);
  const savedDefault = savedCard?.isDefault ?? true;
  const savedDepositDefault = savedCard ? savedCard.isDepositDefault ?? savedCard.isDefault : true;
  const makeDefault = defaultChoice?.checked ?? savedDefault;
  const makeDepositDefault = depositChoice?.checked ?? savedDepositDefault;
  const preferenceConflict = Boolean(
    defaultChoice && defaultChoice.original !== savedDefault && defaultChoice.checked !== savedDefault
    || depositChoice && depositChoice.original !== savedDepositDefault && depositChoice.checked !== savedDepositDefault,
  );
  const [error, setError] = useState("");
  const [invalidField, setInvalidField] = useState<"name" | "number" | "expiry" | "code">();
  const fieldError = (field: typeof invalidField) => ({ "aria-invalid": invalidField === field || undefined, "aria-describedby": invalidField === field ? validationId : undefined });
  const [showSaveResult, setShowSaveResult] = useState(false);
  const [back, setBack] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const previewId = useId();
  const enteredFixture = DEMO_CARD_FIXTURES.find(card => card.number.replaceAll(" ", "") === number.replaceAll(" ", ""));
  function completeSave(card: DemoCard, source?: "camera") {
    // A late response may refresh the card list after the editor was left.
    if (editorUrl.current === window.location.href) onSaved(card, source);
    else router.refresh();
  }
  const [state, action, pending] = useActionState(async (previous: Awaited<ReturnType<typeof saveDemoPaymentMethod>>, data: FormData) => {
    try {
      const result = await saveDemoPaymentMethod(previous, data);
      if (result.status === "succeeded") {
        const savedFixture = demoCardFixture(data.get("paymentMethod"))!;
        setDefaultChoice(null);
        setDepositChoice(null);
        completeSave(result.card ?? { token: savedFixture.token, lastFour: savedFixture.lastFour, isDefault: data.get("makeDefault") === "true", isDepositDefault: data.get("makeDepositDefault") === "true", ...(artwork ? { artwork } : {}) });
      }
      return result;
    } catch { return { status: "error" as const, message: "The card could not be saved. Please try again." }; }
  }, { status: "idle" });
  const updated = showSaveResult && !pending && state.status === "succeeded" && Boolean(savedCard);

  return <section id={depositLabel ? fundingCardEditorId : "wallet-card-editor"} className={styles.editor} aria-labelledby="wallet-card-editor-title" onKeyDown={event => {
    if (event.key !== "Escape" || event.defaultPrevented || pending || document.querySelector("dialog[open]")) return;
    event.preventDefault();
    event.stopPropagation();
    onCancel();
  }}>
    <h3 ref={heading} id="wallet-card-editor-title" tabIndex={-1}>{savedCard ? "Edit card" : "Add a card"}</h3>
    {depositLabel ? <p className={styles.notice}>Your {depositLabel} deposit is waiting. Saving a card does not add funds.</p> : <p>Save a payment method without adding funds.</p>}
    <div className={`${styles.actions} ${styles.pairedActions} ${styles.cardEntryActions}`}>
      {!savedCard || onAddCard ? <button type="button" className={styles.primary} disabled={disabled || pending} onClick={onAddCard ?? (() => nameInput.current?.focus())}>Add Card</button> : null}
      <MobileCardCamera token={savedCard?.token ?? enteredFixture?.token ?? token} savedCard={savedCard} displayName={displayName} makeDefault={makeDefault} makeDepositDefault={makeDepositDefault} disabled={disabled || pending} onSaved={card => completeSave(card, "camera")} />
    </div>
    <form noValidate aria-label="Save payment method" onChange={() => { setError(""); setInvalidField(undefined); setShowSaveResult(false); }} onSubmit={event => {
      event.preventDefault();
      if (disabled || pending) return;
      setError("");
      if (savedCard && enteredFixture && enteredFixture.token !== savedCard.token) {
        setInvalidField("number");
        setError(onAddCard ? "This editor updates the selected card. Use Add Card to save a different sample card." : "This editor updates the selected card. Go back to the saved cards to choose a different sample.");
        numberInput.current?.focus();
        return;
      }
      if (!cardholder.trim()) {
        setShowSaveResult(false);
        setInvalidField("name");
        setError("Enter the cardholder name.");
        nameInput.current?.focus();
        return;
      }
      if (!enteredFixture || expiry.trim() !== enteredFixture.expiry || code.trim() !== enteredFixture.code) {
        setShowSaveResult(false);
        if (!enteredFixture) {
          setInvalidField("number");
          setError("Enter the supplied sample card number. Real card details are not accepted in this preview.");
          numberInput.current?.focus();
        } else if (expiry.trim() !== enteredFixture.expiry) {
          setInvalidField("expiry");
          setError("Enter the expiry shown on the supplied sample card.");
          expiryInput.current?.focus();
        } else {
          setInvalidField("code");
          setError("Enter the security code shown on the supplied sample card.");
          codeInput.current?.focus();
        }
        return;
      }
      // Prevent the automatic form reset from discarding edits on a save error.
      if (preferenceConflict) {
        setError("These card preferences changed in another tab. Review the current settings before saving.");
        setDefaultChoice(null);
        setDepositChoice(null);
        return;
      }
      const data = new FormData(event.currentTarget);
      if (savedCard?.revision) {
        data.set("cardRevision", savedCard.revision);
        if (!defaultChoice || makeDefault === savedDefault) data.delete("makeDefault");
        if (!depositChoice || makeDepositDefault === savedDepositDefault) data.delete("makeDepositDefault");
      }
      setShowSaveResult(true);
      startTransition(() => action(data));
    }}>
      <input type="hidden" name="paymentMethod" value={enteredFixture?.token ?? ""} />
      <input type="hidden" name="makeDefault" value={String(makeDefault)} />
      <input type="hidden" name="makeDepositDefault" value={String(makeDepositDefault)} />
      {artwork ? <input type="hidden" name="artwork" value={JSON.stringify(artwork)} /> : null}
      <label>Cardholder name<input ref={nameInput} {...fieldError("name")} autoComplete="off" value={cardholder} onChange={event => setCardholder(event.target.value)} disabled={disabled || pending} /></label>
      <label>Card number<input ref={numberInput} {...fieldError("number")} inputMode="numeric" autoComplete="off" value={number} onChange={event => setNumber(event.target.value)} disabled={disabled || pending} /></label>
      <p className={styles.issuer}>{enteredFixture?.issuer ?? "Sample card"}</p>
      <div className={styles.fields}>
        <label>Expiry<input ref={expiryInput} {...fieldError("expiry")} autoComplete="off" value={expiry} onChange={event => setExpiry(event.target.value)} disabled={disabled || pending} /></label>
        <label>Security code<input ref={codeInput} {...fieldError("code")} inputMode="numeric" autoComplete="off" value={code} onChange={event => setCode(event.target.value)} disabled={disabled || pending} /></label>
      </div>
      <label className={styles.choice}><input type="checkbox" checked={makeDefault} onChange={event => setDefaultChoice({ checked: event.target.checked, original: savedDefault })} disabled={disabled || pending} />Use this card for future transactions</label>
      <label className={styles.choice}><input type="checkbox" checked={makeDepositDefault} onChange={event => setDepositChoice({ checked: event.target.checked, original: savedDepositDefault })} disabled={disabled || pending} />Use this card for deposits</label>
      {error || (showSaveResult && !pending && state.status === "error") ? <p id={validationId} role="alert" className={styles.error}>{error || (state.status === "error" ? state.message : "")}</p> : null}
      {updated ? <p role="status" className={styles.notice}>Card updated.</p> : null}
      <div className={`${styles.actions} ${styles.editorActions}`}>
        <button type="submit" disabled={disabled || pending} className={styles.confirm}>{pending ? "Saving…" : savedCard ? "Update card" : "Save card"}</button>
        <button type="button" disabled={pending} className={styles.secondary} onClick={onCancel}>{updated ? "Back to payment methods" : "Cancel"}</button>
        <button type="button" className={styles.secondary} aria-expanded={showCard} aria-controls={previewId} onClick={() => setShowCard(value => !value)}>{showCard ? "Hide card" : "See card"}</button>
        {pending ? <button type="button" disabled className={styles.secondary}>Back to wallet</button> : <a className={styles.secondary} href="#balance">Back to wallet</a>}
      </div>
      <div id={previewId} hidden={!showCard} className={styles.artwork}><DemoCardArtwork token={enteredFixture?.token ?? token} artwork={artwork} cardholder={cardholder || "Preview customer"} back={back} /><button type="button" className={styles.secondary} onClick={() => setBack(value => !value)}>See {back ? "front" : "back"}</button></div>
      <p className={styles.sample}>Simulation only. Only the safe sample-card reference and your preference are saved. No payment is made.</p>
    </form>
  </section>;
}
