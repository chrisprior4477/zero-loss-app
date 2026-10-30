"use client";

import popupStyles from "@/components/layout/responsive-popup.module.css";
import { useActionState, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { completeDemoFunding, deleteDemoPaymentMethod, reconcileDemoFunding, saveDemoPaymentMethod } from "@/lib/payments/actions";
import type { DemoFundingRequest } from "@/lib/payments/demo-provider";
import { isFundingAmount } from "@/lib/payments/provider";
import { parseFundingDollars } from "@/lib/payments/funding-amount";
import { formatUsdFromCents } from "@/lib/wallet/money";
import { DEMO_CARD_FIXTURES, DEMO_CARD_TOKEN, demoCardFixture, type DemoCard, type DemoCardToken, type DemoCardArtwork } from "@/lib/payments/demo-card";
import { DemoFundingCard } from "./DemoFundingCard";
import { DeleteCardToast } from "./DeleteCardToast";
import { FundingCardPicker } from "./FundingCardPicker";
import { WalletRollerPicker } from "./WalletRollerPicker";
import { WholeDollarToast } from "./WholeDollarToast";
import { MobileCardCamera } from "./MobileCardCamera";
import styles from "./wallet-overview.module.css";
import { DemoHistoryClearButton } from "./DemoHistoryClearButton";
import { WalletCardEditor, revealWalletSection } from "./WalletCardEditor";
import paymentStyles from "./wallet-payments.module.css";
import { fundedProductEntryHref } from "@/lib/entries/return-intent";

type ContinueDestination = { title: string; href: string; label?: "Back to purchase option" };
const noRequests: DemoFundingRequest[] = [];
const presetAmounts = ["1000", "2500", "5000", "7500", "10000", "20000", "30000", "40000", "50000", "70000", "100000"];
const presetChoices = presetAmounts.map(value => ({ value, label: `$${(Number(value) / 100).toLocaleString("en-US")}` }));
const preferredDepositCard = (cards: DemoCard[]) => cards.find(card => card.isDepositDefault)?.token
  ?? (cards.every(card => card.isDepositDefault === undefined) ? cards.find(card => card.isDefault)?.token : undefined);

function FundingAttempt({ requestKey, blocked, onNew, onSuccess, onStart, storageKey, initialAmount = "2500", recovered = false, savedCard = null, savedCards, initialDefault, initialToken, recoveryOnly = false, cardUnavailable = false, continueTo, displayName }: { requestKey: string; blocked: boolean; onNew: () => void; onSuccess: (message: string) => void; onStart: () => void; storageKey: string; initialAmount?: string; recovered?: boolean; savedCard?: DemoCard | null; savedCards?: DemoCard[]; initialDefault?: boolean; initialToken?: DemoCardToken; recoveryOnly?: boolean; cardUnavailable?: boolean; continueTo?: ContinueDestination; displayName?: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(async (previous: Awaited<ReturnType<typeof completeDemoFunding>>, form: FormData) => {
    const result = await completeDemoFunding(previous, form);
    // Navigate before revalidation can replace this funding form with fresh wallet data.
    if (result.status === "succeeded" && continueTo?.href) router.replace(fundedProductEntryHref(continueTo.href));
    return result;
  }, { status: "idle" });
  const [amount, setAmount] = useState(initialAmount);
  const [customAmount, setCustomAmount] = useState(() => presetAmounts.includes(initialAmount) ? "" : String(Number(initialAmount) / 100));
  const [showWholeDollarNotice, setShowWholeDollarNotice] = useState(false);
  const wholeDollarAcknowledged = useRef(false);
  const noticeKey = `${storageKey}:whole-dollar-notice-v1`;
  function closeWholeDollarNotice(save = false) {
    if (save) {
      wholeDollarAcknowledged.current = true;
      try { localStorage.setItem(noticeKey, "understood"); } catch { /* Keep the acknowledgement for this visit. */ }
    }
    setShowWholeDollarNotice(false);
    document.getElementById("demo-funding-custom-amount")?.focus({ preventScroll: true });
  }
  const selectedPreset = customAmount ? "" : presetAmounts.includes(amount) ? amount : "";
  const amountIsValid = isFundingAmount(Number(amount)) && (recoveryOnly || Number(amount) % 100 === 0);
  const [cards, setCards] = useState<DemoCard[]>(savedCards ?? (savedCard ? [savedCard] : []));
  const [visibleTokens, setVisibleTokens] = useState<DemoCardToken[]>(() => cards.length ? cards.map(card => card.token) : [DEMO_CARD_TOKEN]);
  const [selectedToken, setSelectedToken] = useState<DemoCardToken | null>(initialToken ?? preferredDepositCard(cards) ?? cards[0]?.token ?? DEMO_CARD_TOKEN);
  const [defaultToken, setDefaultToken] = useState<DemoCardToken | null>(() => initialDefault === false ? null : initialDefault === true ? (initialToken ?? cards.find(card => card.isDefault)?.token ?? DEMO_CARD_TOKEN) : cards.find(card => card.isDefault)?.token ?? null);
  const [savingCard, setSavingCard] = useState<DemoCardToken | null>(null);
  const [cardMessage, setCardMessage] = useState("");
  const [deleteToken, setDeleteToken] = useState<DemoCardToken | null>(null);
  const [deletingCard, setDeletingCard] = useState(false);
  const [artwork, setArtwork] = useState<Partial<Record<DemoCardToken, DemoCardArtwork>>>(() => Object.fromEntries(cards.filter(card => card.artwork).map(card => [card.token, card.artwork])));
  const [editingCard, setEditingCard] = useState<{ token: DemoCardToken; artwork?: DemoCardArtwork } | null>(null);
  const nextCard = DEMO_CARD_FIXTURES.find(card => !visibleTokens.includes(card.token));
  const allSamplesSaved = DEMO_CARD_FIXTURES.every(fixture => cards.some(card => card.token === fixture.token));
  const cameraToken = nextCard?.token ?? selectedToken ?? DEMO_CARD_TOKEN;
  const cameraCard = cards.find(card => card.token === cameraToken);
  function addCard(token?: DemoCardToken, sampleArtwork?: DemoCardArtwork) {
    if (locked || cardUnavailable) return;
    if (!token && allSamplesSaved) { revealWalletSection("add-card"); return; }
    setEditingCard({ token: token ?? nextCard?.token ?? selectedToken ?? DEMO_CARD_TOKEN, artwork: sampleArtwork });
    revealWalletSection("wallet-card-editor");
  }
  const makeDefault = initialDefault ?? (selectedToken !== null && selectedToken === defaultToken);
  const confirmation = useRef<HTMLDialogElement>(null);
  const policyInput = useRef<HTMLInputElement>(null);
  function clearConfirmation() {
    if (policyInput.current) policyInput.current.checked = false;
  }
  function openConfirmation() {
    if (!amountIsValid || (!recoveryOnly && selectedToken === null) || locked || (cardUnavailable && !recovered) || (blocked && state.status === "idle")) return;
    clearConfirmation();
    confirmation.current?.showModal();
    policyInput.current?.focus();
  }
  const beforePaymentError = state.status === "error" && state.beforePayment === true;
  const locked = pending || (!beforePaymentError && (recovered || state.status !== "idle"));
  const [lastSavedCards, setLastSavedCards] = useState(savedCards);
  if (!locked && savedCards && savedCards !== lastSavedCards) {
    setLastSavedCards(savedCards);
    setCards(savedCards);
    setVisibleTokens(savedCards.length ? savedCards.map(card => card.token) : [DEMO_CARD_TOKEN]);
    const preferenceChanged = preferredDepositCard(savedCards) !== preferredDepositCard(lastSavedCards ?? []);
    setSelectedToken(current => preferenceChanged && preferredDepositCard(savedCards) ? preferredDepositCard(savedCards)!
      : savedCards.some(card => card.token === current) ? current : preferredDepositCard(savedCards) ?? savedCards[0]?.token ?? DEMO_CARD_TOKEN);
    setDefaultToken(savedCards.find(card => card.isDefault)?.token ?? null);
    setArtwork(Object.fromEntries(savedCards.filter(card => card.artwork).map(card => [card.token, card.artwork])));
  }
  useEffect(() => {
    const closeEditor = () => { if (["#balance", "#add-funds", "#payment-methods", "#wallet-add-card"].includes(window.location.hash)) setEditingCard(null); };
    window.addEventListener("hashchange", closeEditor);
    window.addEventListener("popstate", closeEditor);
    return () => { window.removeEventListener("hashchange", closeEditor); window.removeEventListener("popstate", closeEditor); };
  }, []);
  function closeDeleteDialog() {
    setDeleteToken(null);
  }
  async function confirmDeleteCard() {
    if (!deleteToken || deletingCard) return;
    setDeletingCard(true);
    try {
      const result = await deleteDemoPaymentMethod(deleteToken);
      setCardMessage(result.message);
      if (result.status === "succeeded") {
        const remainingVisible = visibleTokens.filter(token => token !== deleteToken);
        setCards(previous => previous.filter(card => card.token !== deleteToken));
        setVisibleTokens(remainingVisible);
        setSelectedToken(current => current === deleteToken ? remainingVisible[0] ?? null : current);
        setDefaultToken(current => current === deleteToken ? null : current);
        closeDeleteDialog();
        router.refresh();
      }
    } catch {
      setCardMessage("Could not confirm the card was removed. Refresh your saved cards before trying again.");
    } finally { setDeletingCard(false); }
  }
  async function persistCard(token: DemoCardToken, asDefault: boolean) {
    setSavingCard(token);
    setCardMessage("");
    const data = new FormData();
    data.set("paymentMethod", token);
    data.set("makeDefault", String(asDefault));
    if (artwork[token]) data.set("artwork", JSON.stringify(artwork[token]));
    try {
      const result = await saveDemoPaymentMethod({ status: "idle" }, data);
      setCardMessage(result.status === "idle" ? "The sample card was not saved." : result.message);
      if (result.status === "succeeded") {
        const fixture = demoCardFixture(token)!;
        const effectiveDefault = asDefault;
        setCards(previous => [...previous.filter(card => card.token !== token).map(card => ({ ...card, isDefault: effectiveDefault ? false : card.isDefault })),
          { ...previous.find(card => card.token === token), token, lastFour: fixture.lastFour, isDefault: effectiveDefault, ...(artwork[token] ? { artwork: artwork[token] } : {}) }]);
        if (effectiveDefault) setDefaultToken(token);
        else if (defaultToken === token) setDefaultToken(null);
        router.refresh();
      }
    } catch { setCardMessage("The sample card could not be saved. Please try again."); }
    finally { setSavingCard(null); }
  }
  useEffect(() => {
    // React has captured FormData before the action becomes pending.
    if (pending) clearConfirmation();
  }, [pending]);
  useEffect(() => {
    if (state.status === "succeeded" || state.status === "already_credited" || (state.status === "error" && state.beforePayment)) {
      try { sessionStorage.removeItem(storageKey); } catch { /* DB recovery remains available. */ }
    }
  }, [state, storageKey]);
  useEffect(() => {
    if (state.status === "already_credited" || (state.status === "succeeded" && !continueTo?.href)) onSuccess(state.message);
  }, [state, continueTo?.href, onSuccess]);
  function acceptSavedCard(card: DemoCard, fromCamera = false) {
    setCards(previous => [...previous.filter(item => item.token !== card.token).map(item => ({ ...item, isDefault: card.isDefault ? false : item.isDefault, isDepositDefault: card.isDepositDefault ? false : item.isDepositDefault })), card]);
    setVisibleTokens(current => current.includes(card.token) ? current : [...current, card.token]);
    if (card.isDepositDefault) setSelectedToken(card.token);
    if (card.isDefault) setDefaultToken(card.token);
    else if (defaultToken === card.token) setDefaultToken(null);
    if (card.artwork) setArtwork(current => ({ ...current, [card.token]: card.artwork }));
    setCardMessage(`${demoCardFixture(card.token)?.issuer} •••• ${card.lastFour} saved${card.isDepositDefault ? " and selected for deposits" : ""}. No funds added.`);
    setEditingCard(null); revealWalletSection(fromCamera ? `sample-payment-${card.token}` : "add-funds"); router.refresh();
  }
  const cameraSaved = (card: DemoCard) => acceptSavedCard(card, true);
  if (editingCard) return <WalletCardEditor token={editingCard.token} savedCard={cards.find(card => card.token === editingCard.token)} initialArtwork={editingCard.artwork} displayName={displayName} depositLabel={amountIsValid ? formatUsdFromCents(Number(amount)) : "unfinished"} disabled={locked || cardUnavailable} onCancel={() => { setEditingCard(null); revealWalletSection("add-funds"); }} onSaved={card => acceptSavedCard(card)} />;
  if (state.status === "succeeded" || state.status === "already_credited") return <div className="mt-5 space-y-3"><p role="status" className="text-sm leading-6 text-[#72ff9f]">{state.message}</p><div className="flex flex-wrap gap-3">{continueTo && state.status === "succeeded" ? <Link href={fundedProductEntryHref(continueTo.href)} className="flex min-h-11 items-center justify-center rounded-xl bg-[#31e800] px-4 text-sm font-extrabold text-[#002719]">{continueTo.label ?? "Continue your entry"} <span aria-hidden="true" className="ml-2">→</span></Link> : null}<button onClick={onNew} className="min-h-11 rounded-xl border border-cyan-300/40 px-4 text-sm font-bold text-cyan-300">Add more funds</button></div></div>;
  return <form id="funding-payment" action={action} onSubmit={() => {
    // Save BEFORE sending. A reload/lost reply must reuse this logical payment.
    onStart();
    try { sessionStorage.setItem(storageKey, JSON.stringify({ key: requestKey, amount,
      ...(recoveryOnly ? {} : { paymentMethod: selectedToken, makeDefault }) })); } catch { /* Owner-scoped pending requests remain in the database. */ }
  }} className={styles.fundingForm} aria-label="Add funds">
    <input type="hidden" name="idempotencyKey" value={requestKey} />
    <input type="hidden" name="amountCents" value={amount} />
    <input type="hidden" name="currency" value="USD" />
    <input type="hidden" name="paymentMethod" value={recoveryOnly ? "" : selectedToken ?? ""} />
    <input type="hidden" name="makeDefault" value={String(makeDefault)} />
    <input type="hidden" name="recoveryOnly" value={String(recoveryOnly)} />
    {continueTo ? <input type="hidden" name="returnTo" value={continueTo.href} /> : null}
    {!recoveryOnly ? <section id="add-card" aria-label="Add Credit Card" className={styles.demoCardsPanel}>
      <div className={styles.demoCardsHeading}><div><h3>{allSamplesSaved ? "Your saved cards" : "Add a card"}</h3><p>{allSamplesSaved ? "All five sample cards are saved. Choose a saved card to edit." : "Choose a supplied sample card. No real card details are accepted."}</p></div>
        <div className={styles.addCardActions}><button type="button" disabled={locked || cardUnavailable} onClick={() => addCard()}>{allSamplesSaved ? "Choose saved card" : "+ Add another card"}</button><MobileCardCamera token={cameraToken} savedCard={cameraCard} displayName={displayName} disabled={locked || cardUnavailable} onSaved={cameraSaved} /></div></div>
      <div className={styles.demoCardsGrid}>{visibleTokens.map(token => {
        const saved = cards.some(card => card.token === token);
        const artChanged = saved && JSON.stringify(artwork[token]) !== JSON.stringify(cards.find(card => card.token === token)?.artwork);
        return <DemoFundingCard key={token} token={token} selected={selectedToken === token} saved={saved} artwork={artwork[token]} confirmation={deleteToken === token ? <DeleteCardToast key={token} busy={deletingCard} message={cardMessage} onUndo={closeDeleteDialog} onDelete={() => void confirmDeleteCard()} /> : null} actions={<>
          {!saved || artChanged ? <button type="button" className={styles.saveSampleCard} disabled={locked || cardUnavailable || savingCard !== null} onClick={() => void persistCard(token, defaultToken === token)}>{savingCard === token ? "Saving…" : artChanged ? "Save artwork" : "Save this card"}</button> : null}
          {allSamplesSaved ? <button type="button" className={styles.seeCard} disabled={locked || cardUnavailable || savingCard !== null} onClick={() => addCard(token)}>Edit</button> : null}
          {saved ? <button type="button" className={styles.deleteSampleCard} disabled={locked || cardUnavailable || deletingCard} onClick={() => { setCardMessage(""); setDeleteToken(token); }}>Delete Card</button> : null}
        </>}>
          <label className={styles.cardChoice}><input type="radio" name="cardChoice" checked={selectedToken === token} onChange={() => setSelectedToken(token)} disabled={locked || cardUnavailable} />Use for this deposit</label>
          <label className={styles.cardChoice}><input type="checkbox" checked={defaultToken === token} onChange={() => {
            if (defaultToken === token) { if (saved) void persistCard(token, false); else setDefaultToken(null); }
            else { if (saved) void persistCard(token, true); else setDefaultToken(token); }
          }} disabled={locked || cardUnavailable || savingCard !== null} />Use as my default payment method</label>
        </DemoFundingCard>;
      })}</div>
      {visibleTokens.length === 0 ? <p className={styles.cardMessage}>No card selected. Add a sample card above to continue.</p> : null}
      {cardUnavailable ? <p role="alert" className={styles.cardMessage}>Your saved payment methods couldn’t be loaded. Refresh before adding funds.</p> : null}
      <p className={styles.cardMessage}>Only safe sample-card references are saved. You’ll confirm each deposit separately.</p>
    </section> : null}
    {cardMessage ? <p role="status" className={styles.cardMessage}>{cardMessage}</p> : null}
    <div id="add-funds" className={styles.fundingAmountSection}>
      {continueTo?.label === "Back to purchase option" ? <p className="mb-3 text-sm font-bold text-[#153354]">Add funds to complete your purchase. You’ll return to the same purchase option to confirm it.</p> : null}
      {!recoveryOnly ? <div className={styles.addCardActions}><button type="button" className={styles.addCardShortcut} disabled={locked || cardUnavailable} onClick={() => addCard()}>{allSamplesSaved ? "Choose saved card" : "Add Card"}</button><MobileCardCamera token={cameraToken} savedCard={cameraCard} displayName={displayName} disabled={locked || cardUnavailable} onSaved={cameraSaved} /></div> : null}
      {!recoveryOnly ? <FundingCardPicker tokens={visibleTokens} value={selectedToken} disabled={locked || cardUnavailable} onChange={setSelectedToken} /> : null}
      <div className={styles.fundingAmounts}>
      <WalletRollerPicker id="demo-funding-amount" label="Amount (USD)" placeholder="Choose an amount" options={presetChoices}
        value={selectedPreset} onChange={value => { setAmount(value); setCustomAmount(""); }} disabled={locked} />
      <label className={styles.fundingAmountLabel} htmlFor="demo-funding-custom-amount">Add specific amount (USD)
        <input id="demo-funding-custom-amount" type="text" inputMode="numeric" autoComplete="off" placeholder="Enter a whole-dollar amount" aria-invalid={!amountIsValid} aria-describedby={!amountIsValid ? "funding-amount-error" : undefined} value={customAmount ? `$${customAmount}` : ""} onKeyDown={event => { if (event.key === "Enter" && !recoveryOnly) { event.preventDefault(); openConfirmation(); } }} onChange={event => {
          const dollars = event.target.value.replace(/^\$/, "");
          if (dollars.includes(".") && !customAmount.includes(".")) {
            let acknowledged = wholeDollarAcknowledged.current;
            try { acknowledged ||= localStorage.getItem(noticeKey) === "understood"; } catch { /* The notice still works without browser storage. */ }
            if (!acknowledged) setShowWholeDollarNotice(true);
          }
          if (!dollars.includes(".")) setShowWholeDollarNotice(false);
          setCustomAmount(dollars);
          const cents = parseFundingDollars(dollars);
          setAmount(cents === null ? "" : String(cents));
        }} disabled={locked} className={styles.fundingAmountControl} />
      </label>
      </div>
    </div>
    {!locked && !amountIsValid ? <p id="funding-amount-error" role="alert" className={styles.fundingAmountError}>Use whole dollars only, such as $50. Enter at least $1; decimal amounts are not accepted.</p> : null}
    {showWholeDollarNotice ? <WholeDollarToast onClose={() => closeWholeDollarNotice()} onSave={() => closeWholeDollarNotice(true)} /> : null}
    <button type={recoveryOnly ? "submit" : "button"} onClick={recoveryOnly ? undefined : openConfirmation} disabled={pending || !amountIsValid || (!recoveryOnly && selectedToken === null) || (cardUnavailable && !recovered) || (blocked && state.status === "idle")} className={`${styles.fundingSubmit} ${!recovered && state.status === "idle" ? styles.fundingSubmitAdd : ""}`}>{pending ? "Checking payment…" : beforePaymentError ? "Confirm deposit again" : recovered || state.status !== "idle" ? "Retry same request" : "Add funds"}</button>
    {!recoveryOnly ? <dialog ref={confirmation} aria-labelledby="confirm-funding-title" onClose={clearConfirmation} onCancel={event => { if (pending) event.preventDefault(); else clearConfirmation(); }} className={`${styles.confirmationTicket} ${popupStyles.dialog} m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto p-6 text-white shadow-2xl backdrop:bg-[#001027]/80`}>
      <p className="text-xs font-black uppercase tracking-widest text-cyan-300">Secure deposit confirmation</p>
      <h2 id="confirm-funding-title" className="mt-3 text-2xl font-extrabold">Add {formatUsdFromCents(Number(amount))} to your balance?</h2>
      <p className="mt-2 text-sm text-[#b5cce4]">{demoCardFixture(selectedToken)?.issuer} •••• {demoCardFixture(selectedToken)?.lastFour} · USD · Simulation only</p>
      <p className="mt-4 text-sm leading-6">Deposits stay in your Zero Loss balance and cannot normally be withdrawn. Exceptional refund requests are reviewed separately. This does not limit your rights for unauthorized charges or payment errors.</p>
      <label className="mt-4 flex items-start gap-3 text-sm leading-6"><input ref={policyInput} name="fundingPolicy" type="checkbox" value="funding-confirmation-v1" required disabled={pending} className="mt-1 h-5 w-5 shrink-0 accent-[#31e800]" />I confirm this amount and understand how deposited funds can be used.</label>
      {state.status !== "idle" ? <p role="alert" className="mt-3 text-sm leading-6 text-amber-100">{state.message}</p> : null}
      <div className="mt-5 flex flex-wrap gap-3"><button type="button" disabled={pending} onClick={() => { clearConfirmation(); confirmation.current?.close(); }} className="min-h-12 flex-1 rounded-xl border border-cyan-300/40 px-4 font-bold disabled:opacity-60">Cancel</button><button disabled={pending} className="min-h-12 flex-[2] rounded-xl bg-[#31e800] px-4 font-extrabold text-[#002719] disabled:opacity-60">{pending ? "Verifying deposit…" : `Confirm ${formatUsdFromCents(Number(amount))} deposit`}</button></div>
      <p className="mt-3 text-xs leading-5 text-[#b5cce4]">No real money is charged. This simulated deposit requires your signed-in account and the confirmation above.</p>
    </dialog> : null}
    {recovered && !beforePaymentError ? <p className="text-xs leading-5 text-amber-100">An earlier request was saved on this device. Retrying checks that payment; it does not create another one.</p> : null}
    {state.status !== "idle" ? <p role="status" className="text-sm leading-6 text-amber-100">{state.message}</p> : blocked ? <p className="text-xs leading-5 text-amber-100">Finish / check your existing request below before adding more.</p> : null}
    <p className="text-xs font-bold leading-5 text-[#b5cce4]">Simulation only — no payment will be processed.</p>
    <div className={`${paymentStyles.actions} ${paymentStyles.pairedActions}`}><a href="#balance" className={paymentStyles.secondary}>Back to wallet</a><Link href="/" className={paymentStyles.confirm}>Continue Shopping</Link></div>
  </form>;
}

export function DemoFundingForm({ requestKey, blocked = false, requests = noRequests, walletId = "test", savedCard = null, savedCards, cardUnavailable = false, continueTo, displayName, balanceLabel }: { requestKey: string; blocked?: boolean; requests?: DemoFundingRequest[] | null; walletId?: string; savedCard?: DemoCard | null; savedCards?: DemoCard[]; cardUnavailable?: boolean; continueTo?: ContinueDestination; displayName?: string; balanceLabel?: string }) {
  const router = useRouter();
  const storageKey = `zero-loss-demo-request:${walletId}`;
  const [successMessage, setSuccessMessage] = useState("");
  const [attempt, setAttempt] = useState<{ key: string; amount: string; recovered: boolean; canRetry: boolean; ready: boolean; initialDefault?: boolean; initialToken?: DemoCardToken; recoveryOnly?: boolean }>({ key: requestKey, amount: "2500", recovered: false, canRetry: false, ready: false });
  const newAttempt = useCallback(() => setAttempt({ key: crypto.randomUUID(), amount: "2500", recovered: false, canRetry: false, ready: true }), []);
  const onSuccess = useCallback((message: string) => {
    try { sessionStorage.removeItem(storageKey); } catch { /* Server history still identifies completed requests. */ }
    setSuccessMessage(message);
    newAttempt();
    revealWalletSection("funding-success");
    // Re-read the ledger-backed wallet snapshot for the header, summary and history.
    router.refresh();
  }, [newAttempt, router, storageKey]);
  useEffect(() => {
    let saved: { key: string; amount: string; initialDefault?: boolean; initialToken?: DemoCardToken; recoveryOnly: boolean } | null = null;
    try {
      const value = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
      if (value && typeof value.key === "string" && /^[A-Za-z0-9_-]{16,128}$/.test(value.key)
        && isFundingAmount(Number(value.amount))) saved = {
          key: value.key, amount: value.amount,
          initialDefault: typeof value.makeDefault === "boolean" ? value.makeDefault : undefined,
          initialToken: demoCardFixture(value.paymentMethod)?.token,
          recoveryOnly: !demoCardFixture(value.paymentMethod) || typeof value.makeDefault !== "boolean",
        };
    } catch { /* Storage unavailable: database request recovery is still supported. */ }
    // A completed request is historical, not a new deposit. Never reuse its key
    // after a redirect or after the customer has cleared their playable balance.
    const savedKey = saved?.key;
    const matching = savedKey ? requests?.find(request => request.idempotencyKey === savedKey) : undefined;
    // The owner-scoped request list is authoritative. A browser marker with no
    // matching request was never accepted; a reconciled one is already done.
    const staleMarker = Boolean(saved && requests !== null && (!matching || matching.reconciliation === "reconciled"));
    if (staleMarker) {
      try { sessionStorage.removeItem(storageKey); } catch { /* A later visit will check again. */ }
      saved = null;
    }
    // Hydrate a browser-only retry record after SSR, using owner-scoped database
    // history to distinguish a real interrupted request from a completed one.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAttempt(current => saved ? { ...saved, recovered: true, canRetry: matching !== undefined && matching.reconciliation !== "discrepancy", ready: true }
      : staleMarker ? { key: requestKey, amount: "2500", recovered: false, canRetry: false, ready: true } : { ...current, ready: true });
  }, [storageKey, requests, requestKey]);
  useEffect(() => {
    const resumeFunding = () => { if (window.location.hash === "#add-funds") setSuccessMessage(""); };
    window.addEventListener("hashchange", resumeFunding);
    window.addEventListener("popstate", resumeFunding);
    return () => { window.removeEventListener("hashchange", resumeFunding); window.removeEventListener("popstate", resumeFunding); };
  }, []);
  if (successMessage) return <section id="funding-success" aria-label="Deposit complete" className={paymentStyles.editor}>
    <p role="status" className={paymentStyles.notice}>{successMessage}</p>
    {balanceLabel ? <p><strong>Current balance: {balanceLabel}</strong></p> : null}
    <div className={`${paymentStyles.actions} ${paymentStyles.pairedActions}`}>
      <a href="#balance" className={paymentStyles.secondary}>Back to wallet</a>
      <Link href="/" className={paymentStyles.confirm}>Continue Shopping</Link>
    </div>
    <div className={paymentStyles.actions}>
      {continueTo ? <Link href={continueTo.href} className={paymentStyles.confirm}>{continueTo.label ?? "Continue your entry"}</Link> : null}
      <a href="#payment-methods" className={paymentStyles.secondary}>View payment methods</a>
      <button type="button" className={paymentStyles.secondary} onClick={() => { setSuccessMessage(""); revealWalletSection("add-funds"); }}>Add more funds</button>
    </div>
  </section>;
  return <>
    <FundingAttempt key={`${attempt.key}:${attempt.ready}`} requestKey={attempt.key} initialAmount={attempt.amount} recovered={attempt.recovered} storageKey={storageKey}
    displayName={displayName} savedCard={savedCard} savedCards={savedCards} initialDefault={attempt.initialDefault} initialToken={attempt.initialToken} recoveryOnly={attempt.recoveryOnly || (attempt.recovered && Number(attempt.amount) % 100 !== 0)} cardUnavailable={cardUnavailable}
    blocked={!attempt.ready || ((blocked || requests === null || requests.some(request => request.reconciliation !== "reconciled")) && !attempt.canRetry)} continueTo={continueTo}
    onNew={newAttempt} onSuccess={onSuccess} onStart={() => setSuccessMessage("")} />
  </>;
}

function CheckFundingRequest({ id, continueTo }: { id: string; continueTo?: ContinueDestination }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(async (previous: Awaited<ReturnType<typeof reconcileDemoFunding>>, form: FormData) => {
    const result = await reconcileDemoFunding(previous, form);
    if (result.status === "succeeded" && continueTo?.href) router.replace(fundedProductEntryHref(continueTo.href));
    return result;
  }, { status: "idle" });
  return <form action={action} className="mt-2">
    <input type="hidden" name="sessionId" value={id} />
    {continueTo ? <input type="hidden" name="returnTo" value={continueTo.href} /> : null}
    <button disabled={pending} className="min-h-11 rounded-lg border border-cyan-300/30 px-3 text-sm font-bold text-cyan-300 disabled:opacity-60">{pending ? "Checking…" : "Finish / check"}</button>
    {state.status !== "idle" ? <p role="status" className="mt-2 text-xs leading-5 text-[#b5cce4]">{state.message}</p> : null}
  </form>;
}

export function DemoFundingRequests({ requests, fundingEnabled, continueTo, hiddenIds = [], hideArchived = false, canResetDemoHistory = false }: { requests: DemoFundingRequest[] | null; fundingEnabled: boolean; continueTo?: ContinueDestination; hiddenIds?: string[]; hideArchived?: boolean; canResetDemoHistory?: boolean }) {
  const [showAll, setShowAll] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const returnToDepositsOnCollapse = useRef(false);
  useLayoutEffect(() => {
    if (showAll || !returnToDepositsOnCollapse.current) return;
    returnToDepositsOnCollapse.current = false;
    document.getElementById("payment-deposits-heading")?.focus({ preventScroll: true });
    document.getElementById("payment-deposits")?.scrollIntoView({ block: "start", behavior: "auto" });
  }, [showAll]);
  const hidden = new Set(hiddenIds);
  const displayRequests = showArchived && !hideArchived ? requests : requests?.filter(request => !hidden.has(request.id));
  return <section id="payment-deposits" className={styles.fundingRequests} aria-labelledby="payment-deposits-heading"><div className={styles.depositHeading}><h2 id="payment-deposits-heading" tabIndex={-1}>Payment deposits</h2><Link href="/" className={styles.depositShoppingButton}>Continue shopping</Link></div>
    <p className="mt-2 text-sm text-[#b5cce4]">Deposits are separate from posted ledger credits. Check an interrupted deposit here.</p>
    {requests === null ? <p role="alert" className="mt-3 text-sm text-amber-100">Payment status unavailable. Don’t start another payment until this can be checked.</p>
      : displayRequests?.length === 0 ? <p className="mt-3 text-sm text-[#b5cce4]">{hiddenIds.length ? hideArchived ? "Your demo payment-deposit history has been reset." : "No payment deposits in this demo view. Archived deposits can be viewed below." : "No payment deposits yet."}</p>
      : <ul className="mt-4 divide-y divide-white/10 rounded-2xl border border-white/10 bg-[#06223d]">{(showAll ? displayRequests : displayRequests?.slice(0, 5))?.map(request => <li key={request.id} className="p-4">
        <p className="flex flex-wrap justify-between gap-2 text-sm font-bold text-white"><span>{formatUsdFromCents(request.amount)} USD</span><span data-reconciliation={request.reconciliation}>{({ reconciled: "Payment & credit matched", credit_pending: "Payment received · credit pending", not_processed: "Request saved · not processed", discrepancy: "Needs review" })[request.reconciliation]}</span></p>
        <p className="mt-2 break-all text-[10px] text-[#b5cce4]">Request {request.id}</p>
        {request.reconciliation === "discrepancy" ? <p role="alert" className="mt-2 text-xs text-amber-100">This payment needs operator review. Do not make another payment to correct it.</p> : fundingEnabled && request.reconciliation !== "reconciled" ? <CheckFundingRequest id={request.id} continueTo={continueTo} /> : null}
      </li>)}</ul>}
    {requests && canResetDemoHistory && requests.some(request => !hidden.has(request.id)) ? <DemoHistoryClearButton kind="deposits" /> : null}
    {displayRequests && displayRequests.length > 5 ? <button type="button" className={styles.showAllTicket} onClick={() => { returnToDepositsOnCollapse.current = showAll; setShowAll(!showAll); }} aria-expanded={showAll}>{showAll ? "Show just the first five payment deposits" : `See all ${displayRequests.length} payment deposits`}<span aria-hidden="true">→</span></button> : null}
    {!hideArchived && hiddenIds.length > 0 ? <button type="button" className={styles.archiveToggle} onClick={() => { setShowArchived(value => !value); setShowAll(false); }} aria-expanded={showArchived}>{showArchived ? "Hide archived demo deposits" : `View archived demo deposits (${hiddenIds.length})`}</button> : null}
  </section>;
}
