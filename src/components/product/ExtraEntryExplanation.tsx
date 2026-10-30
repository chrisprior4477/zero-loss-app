"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef } from "react";
import styles from "./extra-entry-explanation.module.css";

type Props = {
  productTitle: string; productValue: number; retailer: string; entryPrice: number;
  isSignedIn: boolean; remember: boolean; saving: boolean; error: string | null; loginHref: string;
  onRemember: (value: boolean) => void; onSave: () => void; onClose: () => void; onSignIn: () => void;
};

export function ExtraEntryExplanation({ productTitle, productValue, retailer, entryPrice, isSignedIn, remember, saving, error, loginHref, onRemember, onSave, onClose, onSignIn }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const details = useRef<HTMLDetailsElement>(null);
  const titleId = useId();
  const remaining = Math.max(0, productValue - entryPrice);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    dialog.current?.showModal();
    close.current?.focus({ preventScroll: true });
    const desktop = window.matchMedia?.("(min-width: 768px)");
    const syncDetails = () => { if (details.current) details.current.open = desktop?.matches ?? false; };
    syncDetails(); desktop?.addEventListener("change", syncDetails);
    return () => {
      desktop?.removeEventListener("change", syncDetails);
      document.documentElement.style.overflow = overflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);

  return <dialog ref={dialog} aria-labelledby={titleId} className={styles.ticket} onClose={onClose}
    onClick={event => { if (event.target === event.currentTarget) {
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
    } }}>
    <header className={styles.heading}>
      <h2 id={titleId}>How Extra Chances Work</h2>
      <button ref={close} type="button" aria-label="Close extra entry explanation" className={styles.close} onClick={onClose}>×</button>
    </header>
    <div className={styles.body}>
      <div className={styles.art}>
        <Image src="/account/extra-entry-explainer-seamless-neon.jpg" alt="How extra chances work: each entry is a separate chance and never combines into one discount" fill priority sizes="(max-width:767px) calc(100vw - 56px), 400px" className={styles.image} />
      </div>
      <div className={styles.copy}>
        <p>Each extra entry is a separate chance. Entry payments never combine into a larger discount.</p>
        <p>A non-selected entry has its own optional 30-day right to complete this offering. One ${entryPrice.toFixed(2)} entry leaves ${remaining.toFixed(2)} to complete one purchase.</p>
        <details ref={details} className={styles.details}>
          <summary>Full explanation <span aria-hidden="true">⌄</span></summary>
          <div>
            <h3>Why does each entry stand alone?</h3>
            <ol>
              <li><strong>Another entry means another independent chance.</strong> Each entry receives the same chance of selection, subject to the published pool rules.</li>
              <li><strong>Non-selected entries do not become wallet cash.</strong> Each non-selected paid entry has its own optional 30-day right to complete this exact offering.</li>
              <li><strong>The options cannot be stacked.</strong> Entry payments and completion options cannot be combined with one another or with Playable Balance.</li>
              <li><strong>Each option requires its own remaining payment.</strong> For this ${productValue.toLocaleString()} {retailer} offering, one ${entryPrice.toFixed(2)} entry would leave ${remaining.toFixed(2)} to complete one purchase.</li>
              <li><strong>The option stays with this entry and retailer.</strong> It cannot move to a different product, retailer, account, entry, or cash withdrawal.</li>
            </ol>
            <p><strong>Example with three entries:</strong> You receive three separate chances for {productTitle}. If none is selected, you have three separate optional 30-day completion rights—not a combined ${(entryPrice * 3).toFixed(2)} credit. Completing all three purchases would require three separate remaining payments of ${remaining.toFixed(2)} each.</p>
          </div>
        </details>
      </div>
    </div>
    <footer className={styles.actions}>
      {isSignedIn ? <>
        <label className={styles.acknowledgment}><input type="checkbox" checked={remember} onChange={event => onRemember(event.target.checked)} /><span>I understand how extra entries work.</span></label>
        {error ? <p role="alert" className={styles.error}>{error}</p> : null}
        <button type="button" disabled={!remember || saving} onClick={onSave} className={styles.save}>{saving ? "Saving your choice…" : "I understand — save my choice"}</button>
        <p className={styles.note}>Your choice is saved to your account so this explanation won’t appear again.</p>
      </> : <>
        <p className={styles.note}>Sign in to choose extra entries and save this explanation preference.</p>
        <Link href={loginHref} onClick={onSignIn} className={styles.save}>Sign in to add entries</Link>
      </>}
    </footer>
  </dialog>;
}
