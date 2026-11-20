"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMenuViewport } from "@/components/layout/useMenuViewport";
import { deleteDemoPaymentMethod, readDemoPaymentMethod, saveDemoPaymentMethod } from "@/lib/payments/actions";
import { restoreDialogTrigger } from "@/components/account/dialog-keyboard";
import { DEMO_CARD_FIXTURES, demoCardFixture, type DemoCard, type DemoCardToken } from "@/lib/payments/demo-card";
import { DeleteCardToast } from "./DeleteCardToast";
import { DemoCardArtwork } from "./DemoCardArtwork";
import { MobileCardCamera } from "./MobileCardCamera";
import { WalletCardEditor, fundingCardEditorId, openWalletPanel, revealWalletSection, savedCardEditPrefix } from "./WalletCardEditor";
import walletStyles from "./wallet-overview.module.css";
import styles from "./wallet-payments.module.css";

const emptyCards: DemoCard[] = [];
function revealMethods() { revealWalletSection("payment-methods", "payment-methods", true, true); }
export function WalletPaymentMethods({ savedCards = emptyCards, displayName, enabled, unavailable = false, initialSection, walletId }: { initialSection?: "methods" | "card"; savedCards?: DemoCard[]; displayName?: string; enabled: boolean; unavailable?: boolean; walletId?: string }) {
  const router = useRouter();
  const mobile = useMenuViewport() === "mobile";
  const [cards, setCards] = useState(savedCards);
  const [panelHash, setPanelHash] = useState("");
  const [message, setMessage] = useState("");
  const [missingCard, setMissingCard] = useState(false);
  const missingCardNotice = useRef<HTMLParagraphElement>(null);
  const [defaultError, setDefaultError] = useState<{ token: DemoCardToken; message: string } | null>(null);
  const defaultErrorId = useId();
  const failedControl = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState("");
  const deleteRevision = useRef<string | undefined>(undefined);
  const [deleting, setDeleting] = useState<DemoCardToken | null>(null);
  const [preview, setPreview] = useState<{ walletId?: string; token?: DemoCardToken }>({});
  const previewKey = walletId ? `zero-loss-wallet-card-preview:${walletId}` : null;
  const expanded = preview.walletId === walletId ? preview.token : undefined;
  useEffect(() => {
    if (!previewKey) return;
    try {
      const token = demoCardFixture(sessionStorage.getItem(previewKey))?.token;
      // Hydrate the read-only preview from this wallet's tab state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreview({ walletId, token });
    } catch { /* The preview can always be opened manually. */ }
  }, [previewKey, walletId]);
  function selectPreview(token?: DemoCardToken) {
    setPreview({ walletId, token });
    if (previewKey) try {
      if (token) sessionStorage.setItem(previewKey, token);
      else sessionStorage.removeItem(previewKey);
    } catch { /* The preview still works for this visit. */ }
  }
  const [lastSavedCards, setLastSavedCards] = useState(savedCards);
  if (savedCards !== lastSavedCards) { setLastSavedCards(savedCards); setCards(savedCards); }
  const availableToken = DEMO_CARD_FIXTURES.find(fixture => !cards.some(card => card.token === fixture.token))?.token;
  const cameraToken = availableToken ?? cards[0]?.token ?? DEMO_CARD_FIXTURES[0].token;
  const isEdit = panelHash.startsWith(savedCardEditPrefix);
  const savedCard = isEdit ? cards.find(card => card.token === panelHash.slice(savedCardEditPrefix.length)) : undefined;
  const isAdd = panelHash === "#wallet-add-card";
  const editorToken = isAdd ? availableToken : savedCard?.token;
  const panelOpen = isEdit || isAdd || panelHash === "#payment-methods";
  function showMethods() { openWalletPanel("#payment-methods"); }
  function addCard() {
    setMessage("");
    if (availableToken) {
      openWalletPanel("#wallet-add-card");
      return;
    }
    const firstEdit = document.getElementById(`edit-saved-card-${cards[0]?.token}`);
    if (firstEdit) {
      firstEdit.focus({ preventScroll: true });
      revealWalletSection(firstEdit.id);
    }
  }
  useEffect(() => {
    let lastSyncedHref = "";
    const sync = () => {
      let hash = window.location.hash;
      if (initialSection && !hash.startsWith(savedCardEditPrefix) && !["#balance", "#add-funds", "#funding-amount", "#payment-methods", "#wallet-add-card", "#transactions", `#${fundingCardEditorId}`].includes(hash)) {
        hash = initialSection === "card" ? "#wallet-add-card" : "#payment-methods";
        window.history.replaceState(null, "", hash);
      }
      lastSyncedHref = window.location.href;
      if (hash.startsWith(savedCardEditPrefix)) setMissingCard(false);
      setPanelHash(hash);
      if (hash === "#payment-methods") revealMethods();
      else if (hash === "#wallet-add-card" || hash.startsWith(savedCardEditPrefix)) revealWalletSection("wallet-card-editor", "wallet-card-editor", true);
      else if (hash === "#balance" || hash === "#add-funds") revealWalletSection(hash.slice(1));
    };
    const click = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target && anchor.target !== "_self") return;
      const url = new URL(anchor.href);
      if (url.origin !== window.location.origin || url.pathname !== window.location.pathname || url.search !== window.location.search || !["#balance", "#add-funds", "#payment-methods", "#wallet-add-card"].includes(url.hash)) return;
      if (url.hash === "#balance" && anchor.closest(`#payment-methods, #${fundingCardEditorId}`)) {
        // The wallet's mobile landing handler may already own the scroll.
        requestAnimationFrame(() => {
          if (window.location.hash === "#balance") document.getElementById("balance")?.focus({ preventScroll: true });
        });
      }
      if (event.defaultPrevented) return;
      event.preventDefault();
      openWalletPanel(url.hash);
    };
    // A confirmation can close on Back without changing the wallet destination.
    const onPop = () => { if (window.location.href !== lastSyncedHref) sync(); };
    sync(); window.addEventListener("hashchange", sync); window.addEventListener("popstate", onPop); document.addEventListener("click", click, true);
    return () => { window.removeEventListener("hashchange", sync); window.removeEventListener("popstate", onPop); document.removeEventListener("click", click, true); };
  }, [initialSection]);
  useLayoutEffect(() => {
    if (!panelOpen) return;
    if (editorToken) { revealWalletSection("wallet-card-editor", "wallet-card-editor", true); return; }
    if ((isEdit || isAdd) && !unavailable) {
      // Handle a card that disappeared while this browser URL was selected.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (isEdit) setMissingCard(true);
      openWalletPanel("#payment-methods", window.history.state, true);
    }
    revealMethods();
  }, [panelOpen, editorToken, isEdit, isAdd, unavailable]);
  useEffect(() => {
    if (missingCard && panelHash === "#payment-methods") {
      requestAnimationFrame(() => missingCardNotice.current?.focus({ preventScroll: true }));
    }
  }, [missingCard, panelHash]);
  useEffect(() => {
    if (busy || !defaultError) return;
    if (document.activeElement === document.body) failedControl.current?.focus();
  }, [busy, defaultError]);
  async function setDefault(card: DemoCard, control: HTMLInputElement) {
    const value = control.checked;
    failedControl.current = control;
    const reportError = (message: string) => setDefaultError({ token: card.token, message });
    setBusy(true); setMessage(""); setDefaultError(null);
    if (!card.revision) { reportError("Refresh your saved cards before changing the default."); setBusy(false); router.refresh(); return; }
    const data = new FormData(); data.set("paymentMethod", card.token); data.set("makeDefault", String(value));
    data.set("cardRevision", card.revision);
    try {
      const result = await saveDemoPaymentMethod({ status: "idle" }, data);
      if (result.status === "error") {
        reportError(result.message);
        if (result.stale) router.refresh();
      }
      if (result.status === "succeeded") setMessage(result.message);
      if (result.status === "succeeded") { setCards(current => current.map(item => (item.token === card.token && result.card ? result.card : { ...item, isDefault: item.token === card.token ? value : value ? false : item.isDefault }))); router.refresh(); }
    } catch { reportError("Your preference could not be saved. Please try again."); }
    finally { setBusy(false); }
  }
  async function removeCard(token: DemoCardToken) {
    setBusy(true);
    setDeleteMessage("");
    try {
      const result = await (deleteRevision.current ? deleteDemoPaymentMethod(token, deleteRevision.current) : deleteDemoPaymentMethod(token));
      if (result.status !== "succeeded") { setDeleteMessage(result.message); return; }
      setMessage(result.message);
      const index = cards.findIndex(card => card.token === token);
      const remaining = cards.filter(card => card.token !== token);
      setCards(remaining);
      if (expanded === token) selectPreview();
      setDeleting(null);
      const next = remaining[Math.min(index, remaining.length - 1)];
      requestAnimationFrame(() => restoreDialogTrigger(
        document.getElementById(next ? "edit-saved-card-" + next.token : "payment-methods-title"), true));
      router.refresh();
    } catch { setDeleteMessage("Could not confirm the card was removed. Refresh before trying again."); }
    finally { setBusy(false); }
  }
  async function refreshDeletion(token: DemoCardToken) {
    setBusy(true);
    try {
      const latest = await readDemoPaymentMethod(token);
      if (latest.status !== "loaded" || !latest.card?.revision) {
        setDeleteMessage("We couldn’t verify this card. Close this review and refresh your saved cards.");
        return false;
      }
      deleteRevision.current = latest.card.revision;
      setDeleteMessage("");
      return true;
    } catch {
      setDeleteMessage("We couldn’t verify this card. Try again when your connection returns.");
      return false;
    } finally { setBusy(false); }
  }
  function acceptSavedCard(card: DemoCard) {
    setCards(current => [...current.filter(item => item.token !== card.token).map(item => ({ ...item, isDefault: card.isDefault ? false : item.isDefault, isDepositDefault: card.isDepositDefault ? false : item.isDepositDefault })), card]);
    setMessage(`${demoCardFixture(card.token)?.issuer} •••• ${card.lastFour} saved. Your wallet balance has not changed.`);
    router.refresh();
  }
  return <section id="payment-methods" hidden={!panelOpen} className={`${walletStyles.ticketPanel} ${walletStyles.funding} ${styles.panel}`} aria-label="Payment methods">
    {unavailable ? <p role="alert">Your saved payment methods couldn’t be loaded. Refresh before changing them.</p> : null}
    {editorToken ? <WalletCardEditor key={panelHash + editorToken} token={editorToken} savedCard={savedCard} displayName={displayName} disabled={!enabled || unavailable} onAddCard={isEdit && availableToken ? addCard : undefined} onCancel={() => {
      const target = isEdit ? `edit-saved-card-${editorToken}` : "wallet-add-card-trigger";
      openWalletPanel("#payment-methods", window.history.state, true);
      requestAnimationFrame(() => document.getElementById(target)?.focus());
    }} onSaved={(card, source) => {
      if (source === "camera" || !isEdit || card.token !== editorToken) showMethods();
      acceptSavedCard(card);
    }} /> : <>
      <h2 id="payment-methods-title" tabIndex={-1}>Payment methods</h2><p>Your saved cards, ready when you need them.</p>
      {missingCard ? <p ref={missingCardNotice} tabIndex={-1} role="status">This saved card is no longer available. Choose a card from your payment methods.</p> : null}
      {message ? <p role="status" className={styles.notice}>{message}</p> : null}
      <div id="payment-methods-controls">
      {!availableToken && enabled && !unavailable ? <p className={styles.notice}>All five sample cards are saved. Choose a saved card to edit.</p> : null}
        <div className={`${styles.actions} ${styles.pairedActions} ${styles.cardEntryActions}`}><button type="button" id="wallet-add-card-trigger" className={styles.primary} disabled={!enabled || unavailable || busy} onClick={() => addCard()}>{availableToken ? "Add Card" : "Choose saved card"}</button><MobileCardCamera token={cameraToken} savedCard={cards.find(card => card.token === cameraToken)} displayName={displayName} disabled={!enabled || unavailable || busy} onSaved={acceptSavedCard} /></div>
      </div>
      <div className={styles.cards}>{cards.map(card => <article key={card.token} className={styles.card} aria-label={`Saved card ${card.lastFour}`}>
        <strong>{demoCardFixture(card.token)?.issuer}</strong><p>Sample card •••• {card.lastFour}{card.isDepositDefault ? " · Deposit default" : ""}</p>
        <label className={styles.choice}><input type="checkbox" checked={card.isDefault} disabled={!enabled || unavailable || busy} aria-describedby={defaultError?.token === card.token ? defaultErrorId : undefined} onChange={event => void setDefault(card, event.currentTarget)} />Use as my default payment method</label>
        {defaultError?.token === card.token ? <p id={defaultErrorId} role="alert" className={styles.notice}>{defaultError.message}</p> : null}
        <div className={`${styles.actions} ${styles.cardActions}`}><button type="button" className={styles.secondary} disabled={!enabled || unavailable || busy} id={`edit-saved-card-${card.token}`} onClick={() => openWalletPanel(savedCardEditPrefix + card.token)}>Edit</button><button type="button" id={`saved-card-preview-${card.token}`} className={styles.secondary} aria-expanded={expanded === card.token} aria-controls={`saved-art-${card.token}`} onClick={() => {
          const next = expanded === card.token ? undefined : card.token;
          selectPreview(next);
          if (mobile) revealWalletSection(next ? `saved-art-${next}` : `saved-card-preview-${card.token}`);
        }}>{expanded === card.token ? "Hide card" : "See card"}</button><button type="button" className={styles.danger} disabled={!enabled || unavailable || busy} onClick={() => { deleteRevision.current = card.revision; setDeleteMessage(""); setDeleting(card.token); }}>Delete Card</button></div>
        <div id={`saved-art-${card.token}`} hidden={expanded !== card.token} className={styles.artwork}><DemoCardArtwork token={card.token} artwork={card.artwork} /></div>
        {deleting === card.token ? <DeleteCardToast key={card.token} mobileCard={mobile ? `${demoCardFixture(card.token)?.issuer ?? "Sample card"} •••• ${card.lastFour}` : undefined} busy={busy} message={deleteMessage} onUndo={() => setDeleting(null)} onReview={() => refreshDeletion(card.token)} onDelete={() => void removeCard(card.token)} /> : null}
      </article>)}</div>
      {!unavailable && !enabled ? <p>Payment method changes are unavailable for this wallet.</p> : !unavailable && !cards.length ? <p>No saved cards yet. Add a card to get started.</p> : null}
      <div className={`${styles.actions} ${styles.pairedActions}`}><a href="#balance" className={styles.secondary}>Back to wallet</a><Link href="/" className={styles.confirm}>Continue Shopping</Link></div>
    </>}
  </section>;
}
