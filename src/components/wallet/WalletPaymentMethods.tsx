"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { deleteDemoPaymentMethod, saveDemoPaymentMethod } from "@/lib/payments/actions";
import { DEMO_CARD_FIXTURES, demoCardFixture, type DemoCard, type DemoCardArtwork as Artwork, type DemoCardToken } from "@/lib/payments/demo-card";
import { DeleteCardToast } from "./DeleteCardToast";
import { DemoCardArtwork } from "./DemoCardArtwork";
import { MobileCardCamera } from "./MobileCardCamera";
import { WalletCardEditor, revealWalletSection } from "./WalletCardEditor";
import walletStyles from "./wallet-overview.module.css";
import styles from "./wallet-payments.module.css";

const emptyCards: DemoCard[] = [];
function revealMethods() { revealWalletSection("payment-methods", "payment-methods-controls"); }
export function WalletPaymentMethods({ savedCards = emptyCards, displayName, enabled, unavailable = false, initialSection }: { initialSection?: "methods" | "card"; savedCards?: DemoCard[]; displayName?: string; enabled: boolean; unavailable?: boolean }) {
  const router = useRouter();
  const [cards, setCards] = useState(savedCards);
  const [screen, setScreen] = useState<"closed" | "methods" | "editor">("closed");
  const [editor, setEditor] = useState<{ token: DemoCardToken; card?: DemoCard; artwork?: Artwork } | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<DemoCardToken | null>(null);
  const [expanded, setExpanded] = useState<DemoCardToken | null>(null);
  const cardsRef = useRef(cards);
  useEffect(() => { cardsRef.current = cards; }, [cards]);
  const [lastSavedCards, setLastSavedCards] = useState(savedCards);
  if (savedCards !== lastSavedCards) { setLastSavedCards(savedCards); setCards(savedCards); }
  const availableToken = (DEMO_CARD_FIXTURES.find(fixture => !cards.some(card => card.token === fixture.token)) ?? DEMO_CARD_FIXTURES[0]).token;
  const nextToken = () => (DEMO_CARD_FIXTURES.find(fixture => !cardsRef.current.some(card => card.token === fixture.token)) ?? DEMO_CARD_FIXTURES[0]).token;
  function showMethods() { window.history.pushState(null, "", "#payment-methods"); setEditor(null); setScreen("methods"); revealMethods(); }
  function addCard(artwork?: Artwork) { setEditor({ token: nextToken(), artwork }); setMessage(""); setScreen("editor"); window.history.pushState(null, "", "#wallet-add-card"); revealWalletSection("wallet-card-editor"); }
  useEffect(() => {
    const sync = () => {
      let hash = window.location.hash;
      if (initialSection && !["#balance", "#add-funds", "#payment-methods", "#wallet-add-card", "#transactions"].includes(hash)) {
        hash = initialSection === "card" ? "#wallet-add-card" : "#payment-methods";
        window.history.replaceState(null, "", hash);
      }
      if (hash === "#wallet-add-card") { setEditor(current => current ?? { token: nextToken() }); setScreen("editor"); }
      else { setEditor(null); setScreen(hash === "#payment-methods" ? "methods" : "closed"); }
      if (hash === "#payment-methods") revealMethods();
      else if (["#balance", "#add-funds", "#wallet-add-card"].includes(hash)) revealWalletSection(hash === "#wallet-add-card" ? "wallet-card-editor" : hash.slice(1));
    };
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target && anchor.target !== "_self") return;
      const url = new URL(anchor.href);
      if (url.origin !== window.location.origin || url.pathname !== window.location.pathname || url.search !== window.location.search || !["#balance", "#add-funds", "#payment-methods", "#wallet-add-card"].includes(url.hash)) return;
      event.preventDefault(); window.history.pushState(null, "", url.href); window.dispatchEvent(new HashChangeEvent("hashchange"));
    };
    sync(); window.addEventListener("hashchange", sync); window.addEventListener("popstate", sync); document.addEventListener("click", click, true);
    return () => { window.removeEventListener("hashchange", sync); window.removeEventListener("popstate", sync); document.removeEventListener("click", click, true); };
  }, [initialSection]);
  useLayoutEffect(() => { if (screen === "methods") revealMethods(); else if (screen === "editor") revealWalletSection("wallet-card-editor"); }, [screen]);
  async function setDefault(card: DemoCard, value: boolean) {
    setBusy(true); setMessage("");
    const data = new FormData(); data.set("paymentMethod", card.token); data.set("makeDefault", String(value));
    try {
      const result = await saveDemoPaymentMethod({ status: "idle" }, data);
      if (result.status !== "idle") setMessage(result.message);
      if (result.status === "succeeded") { setCards(current => current.map(item => ({ ...item, isDefault: item.token === card.token ? value : value ? false : item.isDefault }))); router.refresh(); }
    } catch { setMessage("Your preference could not be saved. Please try again."); }
    finally { setBusy(false); }
  }
  async function removeCard(token: DemoCardToken) {
    setBusy(true);
    try { const result = await deleteDemoPaymentMethod(token); setMessage(result.message); if (result.status === "succeeded") { setCards(current => current.filter(card => card.token !== token)); setDeleting(null); router.refresh(); } }
    catch { setMessage("Could not confirm the card was removed. Refresh before trying again."); }
    finally { setBusy(false); }
  }
  return <section id="payment-methods" hidden={screen === "closed"} className={`${walletStyles.ticketPanel} ${walletStyles.funding} ${styles.panel}`} aria-label="Payment methods">
    {unavailable ? <p role="alert">Your saved payment methods couldn’t be loaded. Refresh before changing them.</p> : null}
    {screen === "editor" && editor ? <WalletCardEditor key={editor.token} token={editor.token} savedCard={editor.card} initialArtwork={editor.artwork} displayName={displayName} disabled={!enabled || unavailable} onCancel={showMethods} onSaved={card => {
      setCards(current => [...current.filter(item => item.token !== card.token).map(item => ({ ...item, isDefault: card.isDefault ? false : item.isDefault, isDepositDefault: card.isDepositDefault ? false : item.isDepositDefault })), card]);
      setMessage("Card saved. Your wallet balance has not changed."); showMethods(); router.refresh();
    }} /> : <>
      <h2>Payment methods</h2><p>Your saved cards, ready when you need them.</p>
      {message ? <p role="status" className={styles.notice}>{message}</p> : null}
      <div id="payment-methods-controls" className={`${styles.actions} ${styles.pairedActions} ${styles.cardEntryActions}`}><button type="button" className={styles.primary} disabled={!enabled || unavailable || busy} onClick={() => addCard()}>Add Card</button><MobileCardCamera token={availableToken} disabled={!enabled || unavailable || busy} onUse={addCard} /></div>
      <div className={styles.cards}>{cards.map(card => <article key={card.token} className={styles.card} aria-label={`Saved card ${card.lastFour}`}>
        <strong>{demoCardFixture(card.token)?.issuer}</strong><p>Sample card •••• {card.lastFour}{card.isDepositDefault ? " · Deposit default" : ""}</p>
        <label className={styles.choice}><input type="checkbox" checked={card.isDefault} disabled={!enabled || unavailable || busy} onChange={event => void setDefault(card, event.target.checked)} />Use as my default payment method</label>
        <div className={`${styles.actions} ${styles.cardActions}`}><button type="button" className={styles.secondary} disabled={!enabled || unavailable || busy} onClick={() => { setEditor({ token: card.token, card }); setScreen("editor"); window.history.pushState(null, "", "#wallet-add-card"); }}>Edit</button><button type="button" className={styles.secondary} aria-expanded={expanded === card.token} aria-controls={`saved-art-${card.token}`} onClick={() => setExpanded(expanded === card.token ? null : card.token)}>{expanded === card.token ? "Hide card" : "See card"}</button><button type="button" className={styles.danger} disabled={!enabled || unavailable || busy} onClick={() => setDeleting(card.token)}>Delete Card</button></div>
        <div id={`saved-art-${card.token}`} hidden={expanded !== card.token} className={styles.artwork}><DemoCardArtwork token={card.token} artwork={card.artwork} /></div>
        {deleting === card.token ? <DeleteCardToast key={card.token} busy={busy} onUndo={() => setDeleting(null)} onDelete={() => void removeCard(card.token)} /> : null}
      </article>)}</div>
      {!unavailable && !cards.length ? <p>No saved cards yet. Add a card to get started.</p> : null}
      <div className={`${styles.actions} ${styles.pairedActions}`}><a href="#balance" className={styles.secondary}>Back to wallet</a><Link href="/" className={styles.confirm}>Continue Shopping</Link></div>
    </>}
  </section>;
}
