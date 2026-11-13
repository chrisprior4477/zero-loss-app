"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { ActivityItem } from "@/lib/account/activity";
import { offerTicketLabels } from "@/lib/account/offer-ticket-labels";
import { checkDemoPurchaseReceipt, completeDemoPurchaseOptions, type BulkPurchaseRequest } from "@/lib/account/bulk-purchase-actions";
import { checkDemoDeposit } from "@/lib/payments/actions";
import { fundPurchaseWallet } from "@/lib/account/purchase-funding-actions";
import type { DemoCard, DemoCardToken } from "@/lib/payments/demo-card";
import { demoCardFixture } from "@/lib/payments/demo-card";
import { isFundingAmount } from "@/lib/payments/provider";
import { formatUsdFromCents as usd } from "@/lib/wallet/money";
import { NOTIFICATIONS_CHANGED_EVENT } from "@/lib/account/notification-events";
import { FundingCardPicker } from "@/components/wallet/FundingCardPicker";
import { EntryUndoCountdown } from "@/components/product/EntryUndoCountdown";
import { ProductShareButton } from "@/components/product/ProductShareButton";
import { NumberWheel, PurchaseDialog } from "./PurchaseCheckoutDialog";
import { PurchaseOptionPicker } from "./PurchaseOptionPicker";
import { AccountSettingsLandingScroll } from "./AccountSettingsLandingScroll";
import styles from "./purchase-checkout.module.css";
import { useAccountTimeZone } from "./TimeZoneProvider";
import { formatOfferDeadline } from "@/lib/account/timezone";
import { purchaseFundingHref, rememberWalletSelection, setWalletFundingContext } from "@/lib/wallet/wallet-funding-context";
import { fundingHref, purchaseDepositRecoveryHref, purchaseDepositKeyPattern } from "@/lib/wallet/funding-navigation";
import { useCheckoutSelection } from "./useCheckoutSelection";
import { DeclinePurchaseOffersDialog } from "./DeclinePurchaseOffersDialog";
import { AccountIcon } from "./AccountIcon";

function Product({ item }: { item: ActivityItem }) {
  return <div className={styles.product}><Image src={item.image} alt={item.title} width={64} height={60} /><div><p className={styles.retailer}>{item.retailer}</p><h2>{item.title}</h2><p>{usd(item.priceCents)} gift card · Each entry counts toward its own option</p></div></div>;
}

function ConfirmPurchase({ total, balance, quantity, summary, busy, onUndo, onExpire, onConfirm }: {
  total: number; balance: number; quantity: number; summary: string; busy: boolean; onUndo: () => void; onExpire: () => void; onConfirm: () => void;
}) {
  const [deadline] = useState(() => Date.now() + 30_000);
  const [seconds, setSeconds] = useState(30);
  useEffect(() => {
    if (busy) return;
    const timer = window.setInterval(() => { const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000)); setSeconds(left); if (!left) onExpire(); }, 250);
    return () => window.clearInterval(timer);
  }, [deadline, busy, onExpire]);
  return <><div className={styles.facts}><div><span>{quantity} gift {quantity === 1 ? "card" : "cards"}</span><strong>{usd(total)}</strong></div><div><span>Wallet after purchase</span><strong>{usd(balance - total)}</strong></div></div>
    <p className={styles.small}>{summary}</p><div className={styles.countdown}><p>Confirm or undo.<small>Time runs out? Nothing is purchased. Added funds stay in your wallet.</small></p><EntryUndoCountdown seconds={seconds} action="confirm purchase" /></div>
    <div className={styles.twoButtons}><button type="button" className={styles.secondary} disabled={busy} onClick={onUndo}>Undo</button><button type="button" className={styles.primary} disabled={busy} onClick={() => { if (Date.now() >= deadline) onExpire(); else onConfirm(); }}>{busy ? "Completing…" : "Confirm purchase"}</button></div>
    <p className={styles.footnote}>Simulation only · No real payment or shipment.</p></>;
}

type PurchaseReceipt = { status: "unconfirmed" | "unavailable" } | { status: "ready"; href: string; cardReady: boolean; totalCents: number };

type CheckoutDepositAttempt = { key: string; amount: number; token: DemoCardToken; makeDefault: boolean };

export function PurchaseCheckout({ ownerId, walletId, options, ticketLabels = offerTicketLabels(options), initialBalance, cards, creditedDeposits, fundingAvailable, fundingBlocked = false, initiallySelectedEntryId, initiallyConfirmDecline = false }: {
  ownerId: string; walletId?: string; options: ActivityItem[]; ticketLabels?: Record<string, string>; initialBalance: number; cards: DemoCard[]; creditedDeposits?: string[]; fundingAvailable: boolean; fundingBlocked?: boolean; initiallySelectedEntryId?: string; initiallyConfirmDecline?: boolean;
}) {
  const timeZone = useAccountTimeZone();
  const router = useRouter();
  const item = options[0];
  const singleOffer = options.length === 1;
  const offerDetailsId = useId();
  const [offerDetailsOpen, setOfferDetailsOpen] = useState(false);
  const { selected, decline, available, needsReview, handoffId, updateChoice, clearChoice } = useCheckoutSelection(ownerId, options, initiallySelectedEntryId);
  const [balance, setBalance] = useState(initialBalance);
  const [lastServerBalance, setLastServerBalance] = useState(initialBalance);
  const [card, setCard] = useState<DemoCardToken | null>(() => cards.find(card => card.isDepositDefault)?.token ?? cards.find(card => card.isDefault)?.token ?? cards[0]?.token ?? null);
  const [extra, setExtra] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [overlay, setOverlay] = useState<"fund" | "purchase" | "options" | "decline" | null>(initiallyConfirmDecline ? "decline" : null);
  const [declineDraft, setDeclineDraft] = useState<string[] | null>(null);
  const backToSelection = useCallback(() => setOverlay("options"), []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [recovery, setRecovery] = useState<"deposit" | "purchase" | "offers" | null>(null);
  const [depositAttempt, setDepositAttempt] = useState<CheckoutDepositAttempt>();
  const depositRequestKey = depositAttempt?.key;
  const [depositMissing, setDepositMissing] = useState(false);
  const checkRequired = recovery !== null;
  const [notice, setNotice] = useState("");
  const [purchaseExpired, setPurchaseExpired] = useState(false);
  const [purchaseRequest, setPurchaseRequest] = useState<BulkPurchaseRequest | null>(null);
  const [receipt, setReceipt] = useState<PurchaseReceipt | null>(null);
  const [checkingReceipt, setCheckingReceipt] = useState(false);
  const receiptHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (recovery === "purchase" && !overlay) receiptHeading.current?.focus({ preventScroll: true });
  }, [recovery, overlay]);
  const inFlight = useRef(false);
  const attemptKey = `zero-loss-checkout-attempt:${ownerId}:${item.slug}`;
  function rememberReceiptUrl(requestId: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("receipt", requestId);
    window.history.replaceState(window.history.state, "", url.href);
  }
  function clearReceiptUrl() {
    const url = new URL(window.location.href);
    if (url.searchParams.has("receipt")) {
      url.searchParams.delete("receipt");
      window.history.replaceState(window.history.state, "", url.href);
    }
  }
  function saveAttempt(attempt: { review: true } | { purchase: BulkPurchaseRequest } | { deposit: CheckoutDepositAttempt } | null) {
    try {
      if (attempt) sessionStorage.setItem(attemptKey, JSON.stringify(attempt));
      else sessionStorage.removeItem(attemptKey);
    } catch { /* The current checkout still has its receipt. */ }
  }
  useLayoutEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(attemptKey) ?? "null");
      if (saved?.purchase?.slug === item.slug && typeof saved.purchase.requestId === "string" && Array.isArray(saved.purchase.purchaseIds) && Array.isArray(saved.purchase.declineIds)) {
        // Restore an outstanding request before offering a new purchase.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPurchaseRequest(saved.purchase);
        setRecovery("purchase");
        setReceipt(null);
      } else if (typeof saved?.deposit?.key === "string" && purchaseDepositKeyPattern.test(saved.deposit.key) && isFundingAmount(saved.deposit.amount) && demoCardFixture(saved.deposit.token) && typeof saved.deposit.makeDefault === "boolean") {
        if (creditedDeposits?.includes(saved.deposit.key)) {
          sessionStorage.removeItem(attemptKey);
          setDepositAttempt(undefined);
          setRecovery(null);
          setError("");
          setNotice("Your deposit was credited. Review your purchase before continuing.");
        } else {
          setDepositAttempt(saved.deposit);
          setRecovery("deposit");
          setError("Check this deposit before adding more funds.");
        }
      } else if (saved?.review === true) {
        sessionStorage.removeItem(attemptKey);
        setNotice("Purchase review closed. No purchase was made.");
      }
    } catch { /* No recoverable tab state. */ }
  }, [attemptKey, item.slug, creditedDeposits]);
  const chosen = options.filter(option => selected.includes(option.completionOptionId!));
  const selectedEntryId = chosen[0]?.entryId;
  const walletHref = depositRequestKey ? purchaseDepositRecoveryHref(item.slug, selectedEntryId ?? undefined, handoffId, depositRequestKey) : fundingHref(item.slug, selectedEntryId ?? undefined, undefined, undefined, handoffId);
  const rememberSelection = () => rememberWalletSelection({ href: walletHref, ownerId, slug: item.slug, available, selected: [...selected], decline, needsReview });
  const addCardHref = `/account/wallet?${new URLSearchParams({ view: "history", panel: "card", from: item.slug, ...(selectedEntryId ? { entry: selectedEntryId } : {}), ...(handoffId ? { choice: handoffId } : {}) })}#wallet-add-card`;
  useLayoutEffect(() => {
    const href = handoffId ? purchaseFundingHref(item.slug, selectedEntryId ?? undefined, handoffId) : null;
    setWalletFundingContext(href ? { href, ownerId, slug: item.slug, available, selected: [...selected], decline, needsReview } : null);
    return () => setWalletFundingContext(null);
  }, [item.slug, selectedEntryId, selected, decline, ownerId, available, needsReview, handoffId]);
  const total = chosen.reduce((sum, option) => sum + option.remainingCents, 0);
  if (lastServerBalance !== initialBalance) {
    setLastServerBalance(initialBalance);
    setBalance(initialBalance);
    // A different tab can change the amount needed while a popup is open.
    // Preserve the offers, but never reuse approval for a changed deposit.
    if (balance !== initialBalance) setAcknowledged(false);
    if (balance !== initialBalance && !busy && !checkRequired) {
      if ((overlay === "fund" && initialBalance >= total) || (overlay === "purchase" && initialBalance < total)) {
        setOverlay(null);
        setPurchaseRequest(null);
        setNotice("Your wallet balance updated. Review your purchase before continuing.");
      }
    }
  }
  const paid = chosen.reduce((sum, option) => sum + option.paidCents, 0);
  const face = chosen.reduce((sum, option) => sum + option.priceCents, 0);
  const rest = options.length - chosen.length;
  const shortfall = Math.max(0, total - balance);
  // Historical balances may contain cents. New deposits must be whole dollars.
  const required = Math.ceil(shortfall / 100) * 100;
  const extraCents = extra === "" ? 0 : /^\d+$/.test(extra) ? Number(extra) * 100 : NaN;
  const deposit = required + extraCents;
  const validDeposit = Number.isSafeInteger(extraCents) && extraCents >= 0 && isFundingAmount(deposit) && Number.isSafeInteger(balance + deposit);
  const locked = busy || checkRequired;
  const selectedCard = cards.find(saved => saved.token === card);
  const cardDetails = JSON.stringify([card, Boolean(selectedCard), selectedCard?.isDefault ?? false]);
  const [lastCardDetails, setLastCardDetails] = useState(cardDetails);
  if (!locked && lastCardDetails !== cardDetails) {
    setLastCardDetails(cardDetails);
    setAcknowledged(false);
    if (card && !selectedCard) {
      setCard(null);
      setNotice("Your selected card was removed. Choose another card and confirm the deposit again.");
    } else if (acknowledged) {
      setNotice("Your card details changed. Review them and confirm the deposit again.");
    }
  }
  const selectionSummary = !rest ? "All your available options are selected." : decline
    ? `Decline and remove the other ${rest} ${rest === 1 ? "offer" : "offers"} only after every selected purchase succeeds.`
    : `Keep ${rest} ${rest === 1 ? "offer" : "offers"} in My Activity until the original 30-day deadline. Expired offers leave active Purchase Options; history is preserved.`;
  const sameValue = chosen.every(option => option.priceCents === chosen[0]?.priceCents);
  const buyLabel = `Buy ${chosen.length} ${sameValue ? usd(chosen[0]?.priceCents ?? 0) + " " : ""}gift ${chosen.length === 1 ? "card" : "cards"}`;

  const closeHref = `/account/purchase-options/${encodeURIComponent(item.slug)}${initiallySelectedEntryId ? `?option=${encodeURIComponent(initiallySelectedEntryId)}` : ""}`;
  const close = useCallback(() => {
    if (inFlight.current) return;
    setOverlay(null); setDeclineDraft(null); setPurchaseRequest(null); setAcknowledged(false);
    try {
      if (JSON.parse(sessionStorage.getItem(attemptKey) ?? "null")?.review) sessionStorage.removeItem(attemptKey);
    } catch { /* Closing still works. */ }
    // Old saved decline links now open this same ticket, and cancel returns here.
    if (initiallyConfirmDecline) router.replace(closeHref, { scroll: false });
  }, [initiallyConfirmDecline, router, closeHref, attemptKey]);
  const expirePurchase = useCallback(() => {
    if (inFlight.current) return;
    close();
    setPurchaseExpired(true);
  }, [close]);
  function changeSelection(ids: string[], reviewed = false) {
    if (locked || !ids.length) return;
    updateChoice({ selected: ids, needsReview: needsReview && !reviewed });
    setError(""); setNotice(""); setPurchaseRequest(null); setPurchaseExpired(false);
  }
  function changeQuantity(quantity: number) {
    const ids = selected.slice(0, quantity);
    for (const option of options) { if (ids.length >= quantity) break; if (!ids.includes(option.completionOptionId!)) ids.push(option.completionOptionId!); }
    changeSelection(ids);
  }
  function review() {
    if (locked) return;
    setPurchaseExpired(false);
    if (needsReview) { setOverlay("options"); return; }
    setError(""); setNotice(""); setAcknowledged(false);
    if (shortfall) { setOverlay("fund"); return; }
    setPurchaseRequest({ slug: item.slug, purchaseIds: [...selected], declineIds: decline ? options.filter(option => !selected.includes(option.completionOptionId!)).map(option => option.completionOptionId!) : [], totalCents: total, requestId: crypto.randomUUID(), confirmed: true });
    saveAttempt({ review: true });
    setOverlay("purchase");
  }
  async function addFunds(retry?: CheckoutDepositAttempt) {
    if (inFlight.current || !fundingAvailable || (retry ? !depositMissing || !cards.some(saved => saved.token === retry.token) : locked || fundingBlocked || !card || !selectedCard || !acknowledged)) return;
    if (!retry && !validDeposit) { setError("Only whole-dollar amounts are accepted. Enter extra dollars such as 50, without a decimal point."); return; }
    inFlight.current = true; setBusy(true); setError("");
    const form = new FormData();
    const original = retry ?? { key: `purchase_fund_${crypto.randomUUID()}`, amount: deposit, token: card!, makeDefault: selectedCard?.isDefault ?? false };
    setDepositMissing(false);
    setDepositAttempt(original);
    saveAttempt({ deposit: original });
    form.set("idempotencyKey", original.key); form.set("amountCents", String(original.amount)); form.set("currency", "USD");
    form.set("paymentMethod", original.token); form.set("makeDefault", String(original.makeDefault)); form.set("fundingPolicy", "funding-confirmation-v1");
    try {
      const result = await fundPurchaseWallet(form);
      if ((result.status === "succeeded" || result.status === "already_credited") && "balanceCents" in result) {
        saveAttempt(null);
        setBalance(result.balanceCents); setExtra(""); setAcknowledged(false);
        setDepositAttempt(undefined); setRecovery(null);
        setNotice(`${usd(original.amount)} added to your wallet. Confirm the purchase separately.`);
        if (!retry && result.balanceCents >= total) {
          setPurchaseRequest({ slug: item.slug, purchaseIds: [...selected], declineIds: decline ? options.filter(option => !selected.includes(option.completionOptionId!)).map(option => option.completionOptionId!) : [], totalCents: total, requestId: crypto.randomUUID(), confirmed: true });
          saveAttempt({ review: true });
          setOverlay("purchase");
        } else { setOverlay(null); setNotice("Deposit saved. Review the updated balance before continuing."); }
        router.refresh();
      } else {
        setError("message" in result ? result.message : "Check the deposit in your wallet.");
        const earlyError = result.status === "error" && result.beforePayment;
        if (earlyError && !retry) { saveAttempt(null); setDepositAttempt(undefined); }
        setRecovery(earlyError && !retry ? null : "deposit");
      }
    } catch { setError("The connection was interrupted. Check Payment deposits in your wallet before adding more money. No purchase has been submitted."); setRecovery("deposit"); }
    finally { inFlight.current = false; setBusy(false); }
  }
  async function checkDeposit() {
    if (!walletId || !depositAttempt || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setDepositMissing(false);
    try {
      const result = await checkDemoDeposit(depositAttempt.key, depositAttempt.amount, walletId);
      if (result.status === "credited") {
        saveAttempt(null);
        setBalance(result.balanceCents);
        setDepositAttempt(undefined);
        setRecovery(null);
        setError("");
        setNotice("Your deposit was credited. Review your purchase before continuing.");
        router.refresh();
      } else if (result.status === "missing") {
        setError("No deposit receipt was found for this attempt. You can confirm the same demo deposit again.");
        setDepositMissing(true);
      } else setError("Open the exact deposit in your wallet to see its current status.");
    } catch { setError("We couldn’t verify this deposit yet. Check again."); }
    finally { inFlight.current = false; setBusy(false); }
  }
  function recordRecoveredPurchase(result: { href: string; cardReady: boolean; totalCents: number }) {
    clearChoice();
    setReceipt({ status: "ready", href: result.href, cardReady: result.cardReady, totalCents: result.totalCents });
    window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
  }

  async function confirm(retry = false) {
    if (!purchaseRequest || inFlight.current || (retry ? receipt?.status !== "unconfirmed" || recovery !== "purchase" : locked)) return;
    setReceipt(null);
    saveAttempt({ purchase: purchaseRequest });
    rememberReceiptUrl(purchaseRequest.requestId);
    inFlight.current = true; setBusy(true); setError("");
    try {
      const result = await completeDemoPurchaseOptions(purchaseRequest);
      if (result.status === "succeeded") {
        if (retry) recordRecoveredPurchase(result);
        else {
          saveAttempt(null);
          clearReceiptUrl();
          clearChoice();
          setRecovery("purchase");
          window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
          router.replace(result.href);
          router.refresh();
        }
        return;
      }
      setError(result.recovery === "check" ? "" : result.message);
      setRecovery(result.recovery === "offers" ? "offers" : result.recovery === "check" ? "purchase" : null);
      setOverlay(null);
      if (result.recovery !== "check") { saveAttempt(null); clearReceiptUrl(); setPurchaseRequest(null); }
      if (result.recovery === "balance") { router.refresh(); setNotice("Your balance changed. Review the updated amount before continuing."); }
    } catch { setRecovery("purchase"); setOverlay(null); }
    finally { inFlight.current = false; setBusy(false); }
  }
  async function checkPurchase() {
    if (!purchaseRequest || inFlight.current || receipt?.status === "ready") return;
    inFlight.current = true;
    setBusy(true);
    setCheckingReceipt(true);
    try {
      const result = await checkDemoPurchaseReceipt(purchaseRequest.requestId, purchaseRequest.slug);
      if (result.status === "succeeded") recordRecoveredPurchase(result);
      else setReceipt({ status: result.status === "not_found" ? "unconfirmed" : "unavailable" });
    } catch { setReceipt({ status: "unavailable" }); }
    finally { inFlight.current = false; setBusy(false); setCheckingReceipt(false); }
  }
  // Full navigation clears the locked checkout response and reads current offers.
  // The saved selection is reconciled on mount; a paid exact ticket opens its reward.
  const refreshOffersHref = `/account/purchase-options/${encodeURIComponent(item.slug)}${initiallySelectedEntryId ? `?option=${encodeURIComponent(initiallySelectedEntryId)}` : ""}`;
  const purchaseReceipt = recovery === "purchase" && purchaseRequest && !overlay ? <section className={styles.recoveryReceipt} data-state={busy ? "checking" : receipt?.status} aria-labelledby="purchase-receipt-heading">
    <div className={styles.receiptDetails} role="status">
      <div><h2 id="purchase-receipt-heading" ref={receiptHeading} tabIndex={-1}>Purchase receipt</h2><strong>{usd(receipt?.status === "ready" ? receipt.totalCents : purchaseRequest.totalCents)}</strong></div>
      <p className={styles.receiptResult}>{busy ? checkingReceipt ? "Checking this purchase…" : "Confirming this purchase…" : receipt?.status === "ready" ? receipt.cardReady ? "Gift card ready" : "Purchase completed"
        : receipt?.status === "unconfirmed" ? "No completed purchase found" : receipt?.status === "unavailable" ? "Still checking" : "Purchase status unknown"}</p>
      {receipt?.status !== "ready" && <p>{busy ? "Using the original request." : receipt?.status === "unconfirmed"
        ? "You can confirm the same purchase again without paying twice."
        : receipt?.status === "unavailable" ? "We couldn’t verify the result. Try checking again."
        : "Check whether your purchase was saved before trying again."}</p>}
    </div>
    {receipt?.status === "ready" ? <Link href={receipt.href} className={styles.primary} onClick={() => saveAttempt(null)}>{receipt.cardReady ? "Open gift card" : "View completed purchases"}</Link>
      : receipt?.status === "unconfirmed" && !busy ? <button type="button" className={styles.primary} onClick={() => void confirm(true)}>Confirm same purchase · {usd(purchaseRequest.totalCents)}</button>
        : <button type="button" className={styles.secondary} disabled={busy} onClick={() => void checkPurchase()}>{busy ? checkingReceipt ? "Checking…" : "Confirming…" : "Check this purchase"}</button>}
  </section> : null;
  const feedback = <>{error ? <p className={styles.error} role="alert">{error}</p> : null}{recovery && recovery !== "purchase" ? <div className={styles.twoButtons}>
    {recovery === "offers" ? <a className={styles.secondary} href={refreshOffersHref}>Refresh available offers</a> : null}
    {recovery === "deposit" ? <>
      {walletId && depositAttempt ? <button type="button" className={styles.secondary} disabled={busy} onClick={() => void checkDeposit()}>Check this deposit</button> : null}
      <Link className={styles.secondary} href={walletHref} onClick={rememberSelection}>{walletId && depositAttempt ? "Open deposit in wallet" : "Check this deposit"}</Link>
      {depositMissing && depositAttempt && cards.some(saved => saved.token === depositAttempt.token) ? <button type="button" className={styles.primary} disabled={busy || !fundingAvailable} onClick={() => void addFunds(depositAttempt)}>Confirm same {usd(depositAttempt.amount)} demo deposit · {demoCardFixture(depositAttempt.token)?.issuer}</button> : null}
    </> : null}
    <Link className={styles.secondary} href="/account/entries?filter=completed">View completed purchases</Link>
  </div> : null}</>;
  const money = (onPage = false) => <div className={styles.facts}><div><span>Purchase total</span><strong>{usd(total)}</strong></div><div><span>In your wallet</span><strong>{usd(balance)}</strong></div>{onPage
    ? <div className={shortfall ? styles.balanceNeeded : styles.balanceReady}>{shortfall ? <><span>Still needed to continue</span><strong>{usd(required)}</strong></> : <><span aria-hidden="true">✓</span><strong>Your wallet covers this purchase.</strong></>}</div>
    : <div className={shortfall ? styles.shortfall : styles.covered}><strong>{shortfall ? `Please add ${usd(required)} to continue.` : "Your wallet covers this purchase."}</strong></div>}</div>;
  return <div className={styles.page}><AccountSettingsLandingScroll target="purchase-options-intro" settleAfterNavigation allScreens /><div className={styles.shell}>
    <section id="purchase-options-intro" className={`${styles.ticket} ${styles.content} ${styles.refined}`} aria-label="Your purchase options">
      <h1>Your {options.length} purchase {options.length === 1 ? "option" : "options"}</h1><Product item={item} />
      <div className={singleOffer ? `${styles.quantity} ${styles.singleQuantity}` : styles.quantity}>
        {!singleOffer ? <NumberWheel label="Buying" min={1} max={options.length} value={chosen.length} disabled={locked || overlay !== null} onChange={changeQuantity} /> : null}
        <div><h3>{buyLabel}</h3><p className={styles.credit}>Your <b>{usd(paid)}</b> already paid + <b>{usd(total)}</b> remaining = <b>{usd(face)}</b><small>Your entry {chosen.length === 1 ? "dollar still counts." : "dollars still count toward their own options."}</small></p></div>
      </div>
      {rest ? <fieldset className={styles.offerChoices} disabled={locked}><legend>The other {rest} {rest === 1 ? "offer" : "offers"}</legend><div className={styles.offerTiles}>
        <button type="button" aria-pressed={decline} onClick={() => updateChoice({ decline: true })}>
          <span className={styles.choiceHeading}><span className={styles.choiceMark} aria-hidden="true">{decline ? "✓" : ""}</span><strong>Decline &amp; remove</strong></span>{" "}
          <span className={styles.choiceCount}><span>Accepting</span>{" "}<b>{chosen.length}</b></span>{" "}
          <span className={styles.choiceCount}><span>Declining &amp; removing</span>{" "}<b>{rest}</b></span>
        </button>
        <button type="button" aria-pressed={!decline} onClick={() => updateChoice({ decline: false })}>
          <span className={styles.choiceHeading}><span className={styles.choiceMark} aria-hidden="true">{!decline ? "✓" : ""}</span><strong>Keep for later</strong></span>{" "}
          <span className={styles.choiceCount}><span>Accepting</span>{" "}<b>{chosen.length}</b></span>{" "}
          <span className={styles.choiceCount}><span>Keeping for later</span>{" "}<b>{rest}</b></span>
        </button>
      </div><p className={styles.offerHelp}>{selectionSummary}</p></fieldset> : null}
      {singleOffer ? <div className={styles.singleOfferDetails}>
        <button type="button" className={styles.offerDetailsButton} aria-expanded={offerDetailsOpen} aria-controls={offerDetailsId} onClick={() => setOfferDetailsOpen(open => !open)}>
          Offer details<AccountIcon name="chevron" />
        </button>
        <div id={offerDetailsId} className={styles.offerDetailsBody} hidden={!offerDetailsOpen}>
          <strong>{ticketLabels[item.completionOptionId!]}</strong>
          <dl>
            <div><dt>Entry credit</dt><dd>{usd(item.paidCents)} applied</dd></div>
            <div><dt>Available until</dt><dd>{item.completionExpiresAt ? <time dateTime={item.completionExpiresAt}>{formatOfferDeadline(item.completionExpiresAt, timeZone)}</time> : "Original deadline"}</dd></div>
          </dl>
        </div>
      </div> : <div className={styles.optionLine}><span>{usd(item.remainingCents)} per option</span><button type="button" disabled={locked} onClick={() => setOverlay("options")}>Choose offers to complete · {chosen.length} selected</button></div>}
      {money(true)}{needsReview && <p role="status" className={styles.status}>Your available offers changed. Check which offers you want to buy before continuing.</p>}{notice ? <p className={styles.status} role="status">{notice}</p> : null}{!overlay ? feedback : null}{purchaseReceipt}
      <p className={styles.purchaseExpired} role="status">{purchaseExpired ? "Time ran out. No purchase was made." : ""}</p>
      {receipt?.status !== "ready" && <button type="button" className={`${styles.primary} ${needsReview ? "" : styles.purchaseAction}`} aria-label={needsReview ? "Review updated options" : shortfall ? `Add funds: ${usd(required)} to continue` : `Make purchase: ${usd(total)}`} disabled={locked} onClick={review}>{needsReview ? "Review updated options" : <><span>{shortfall ? "Add funds" : "Make purchase"}</span><span className={styles.actionAmount}>{usd(shortfall ? required : total)}</span></>}</button>}
      {!needsReview && recovery !== "purchase" && <p className={`${styles.footnote} ${styles.actionHelp}`}>{shortfall ? "Add funds first. Confirm your purchase next." : "Confirm your purchase in the next step."}</p>}
      <div className={styles.utility}><Link href="/account/entries?filter=completion"><span aria-hidden="true">←</span> My Activity</Link><Link href="/">Continue shopping</Link></div>
      <div className={singleOffer ? `${styles.utilityTools} ${styles.singleOfferTools}` : styles.utilityTools}><button type="button" disabled={locked || overlay !== null} onClick={() => setOverlay("decline")}>{singleOffer ? "Decline this offer" : "Decline all offers"}</button><ProductShareButton product={{ slug: item.slug, title: item.title, image: item.image, retailer: item.retailer, value: item.priceCents / 100 }} label="Share" /></div>
    </section>
    </div>{overlay === "decline" ? <DeclinePurchaseOffersDialog item={item} offeredOptionIds={available} ticketLabels={ticketLabels}
      selectedOptionIds={declineDraft} onBackToSelection={backToSelection} onClose={close} /> : overlay ? <PurchaseDialog title={overlay === "fund" ? "Add funds to continue" : overlay === "options" ? "Choose your options" : "Confirm your purchase"} onClose={close} compact>
      <Product item={item} />
      {overlay === "fund" ? <><div className={styles.purchaseRecap}><strong>{buyLabel}</strong><span>{usd(paid)} already paid + {usd(total)} remaining</span></div>{money()}
        <div className={styles.cardChoice}><FundingCardPicker tokens={cards.map(card => card.token)} value={card} disabled={locked} onChange={value => { setCard(value); setAcknowledged(false); setNotice(""); }} /></div>
        {!cards.length ? <Link className={styles.backLink} href={addCardHref} onClick={() => {
          const href = purchaseFundingHref(item.slug, selectedEntryId ?? undefined, handoffId);
          if (href) rememberWalletSelection({ href, ownerId, slug: item.slug, available, selected: [...selected], decline, needsReview });
        }}>Add a card in your wallet</Link> : null}
        <div className={styles.extraFunds}><div aria-label="Extra funds for later">{[0,25,50].map(value => <button type="button" key={value} disabled={locked} aria-pressed={extra === String(value) || (!extra && value === 0)} onClick={() => { setExtra(value ? String(value) : "");setAcknowledged(false); }}>{value ? `+$${value}` : "Just enough"}</button>)}</div></div>
        <div className={styles.extraEquation}><h3>Add a different amount</h3><div><span><small>Needed</small><strong>{usd(required)}</strong></span><b aria-hidden="true">+</b><label>Extra dollars<input type="text" inputMode="numeric" value={extra} disabled={locked} placeholder="$0" aria-invalid={!validDeposit} onChange={event => { setExtra(event.target.value.replace(/^\$/, "")); setAcknowledged(false); }} /></label></div></div>
        {validDeposit ? <p className={styles.extraNotice}>{usd(required)} + {usd(extraCents)} = {usd(deposit)} deposit{extraCents > 0 ? ` · ${usd(balance + deposit - total)} left after purchase` : ""}</p> : <p role="alert" className={styles.error}>Only whole-dollar amounts are accepted. For example: 50.</p>}
        {notice ? <p role="status" className={styles.small}>{notice}</p> : null}
        <label className={styles.check}><input type="checkbox" checked={acknowledged} disabled={locked || !selectedCard} onChange={event => setAcknowledged(event.target.checked)} /><span>I confirm adding {validDeposit ? usd(deposit) : "this amount"} using {demoCardFixture(card)?.issuer ?? "my card"}.<small>Adds funds only. Confirm purchase next.</small></span></label>
        {fundingBlocked || !fundingAvailable ? <p className={styles.error}>Check your wallet’s Payment deposits before starting another deposit. <Link href={walletHref} onClick={rememberSelection}>Open wallet</Link></p> : null}
        {feedback}<button type="button" className={styles.primary} disabled={locked || !validDeposit || !acknowledged || !selectedCard || fundingBlocked || !fundingAvailable} onClick={() => void addFunds()}>{busy ? "Adding funds…" : validDeposit ? `Add ${usd(deposit)} to wallet` : "Add funds"}</button><p className={styles.footnote}>Simulation only · No card is charged.</p><button type="button" className={styles.backLink} disabled={busy} onClick={close}>Back to purchase options</button>
      </> : overlay === "purchase" ? <>{notice ? <p className={styles.ready}>{notice}</p> : null}<ConfirmPurchase total={total} balance={balance} quantity={chosen.length} summary={selectionSummary} busy={busy} onUndo={close} onExpire={expirePurchase} onConfirm={() => void confirm()} />{feedback}</> : <><p className={styles.small}>Choose the offers you want to use or decline. Each entry’s credit applies only to its own offer.</p>
        <PurchaseOptionPicker optionIds={available} selected={declineDraft ?? selected} styles={styles} onApply={ids => { changeSelection(ids, true); close(); }}
          onDecline={ids => { setDeclineDraft(ids); setOverlay("decline"); }}>
          {draft => <div className={styles.optionDetails}>{options.map((option, index) =>
            <p key={option.completionOptionId}><strong>Option {index + 1} · {ticketLabels[option.completionOptionId!]}</strong> · {draft.includes(option.completionOptionId!) ? "Selected" : "Not selected"}<br />{usd(option.paidCents)} applied · {usd(option.remainingCents)} remaining<br />Available until {option.completionExpiresAt ? <time dateTime={option.completionExpiresAt}>{formatOfferDeadline(option.completionExpiresAt, timeZone)}</time> : "its original deadline"}</p>
          )}</div>}
        </PurchaseOptionPicker></>}
    </PurchaseDialog> : null}</div>;
}
