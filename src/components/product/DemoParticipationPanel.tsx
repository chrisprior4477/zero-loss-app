"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { ExtraEntryExplanation } from "./ExtraEntryExplanation";
import { PoolProgress } from "@/components/product/PoolProgress";
import { availabilityStatus } from "@/lib/catalog/availability";
import { InsufficientBalanceToast } from "@/components/product/InsufficientBalanceToast";
import { EntryUndoCountdown } from "@/components/product/EntryUndoCountdown";
import { fundingHref } from "@/lib/wallet/funding-navigation";
import { acknowledgeExtraEntryExplainer, confirmPendingEntryRequest, createPreviewEntry, resetExtraEntryExplainer, resolvePendingEntryRequest } from "@/lib/entries/actions";
import { ENTRY_REQUEST_CREATED_EVENT, ENTRY_REQUEST_EVENT, RECENT_ENTRY_STORAGE_KEY, type EntryRequest } from "@/lib/entries/request";
import type { EntryRequestHead } from "@/lib/entries/request-head";
import { clearEntryIntent, productEntryHref, saveEntryIntent } from "@/lib/entries/return-intent";
import quantityTicketStyles from "./entry-quantity-ticket.module.css";
import entryActionStyles from "./entry-action.module.css";
import compactStyles from "./product-entry-layout.module.css";

type Props = {
  productSlug: string;
  browseReturnHref?: string;
  requestKey: string;
  requestHead: EntryRequestHead;
  productTitle: string;
  retailer: string;
  productValue: number;
  entryPrice: number;
  sold: number;
  capacity: number;
  initialQuantity?: number;
  availabilityConfirmed?: boolean;
  balanceLabel?: string;
  balanceCents?: number | null;
  isDemoWallet?: boolean;
  isPreviewExperience?: boolean;
  isSignedIn?: boolean;
  highlightAfterFunding?: boolean;
  extraEntryExplainerAcknowledged?: boolean;
  signedOutCompact?: boolean;
  compact?: boolean;
};

export function DemoParticipationPanel({
  productSlug,
  browseReturnHref,
  requestKey,
  requestHead,
  productTitle,
  retailer,
  productValue,
  entryPrice,
  sold,
  capacity,
  initialQuantity = 1,
  availabilityConfirmed = true,
  balanceLabel = "Unavailable",
  balanceCents = null,
  isDemoWallet = false,
  isPreviewExperience = false,
  isSignedIn = false,
  highlightAfterFunding = false,
  extraEntryExplainerAcknowledged = false,
  signedOutCompact = false,
  compact = false,
}: Props) {
  const router = useRouter();
  const availability = availabilityStatus(capacity, sold);
  const remaining = availability.remaining;
  const maxQuantity = remaining;
  // A lost response must retry the exact intent. Server comparison also protects
  // reloads/new tabs, where this transient form memory has been lost.
  const attemptedForm = useRef<FormData | null>(null);
  const [state, action, pending] = useActionState(async (previous: Parameters<typeof createPreviewEntry>[0], data: FormData) => {
    const payload = previous.status === "error" && previous.code === "outcome_unknown" && attemptedForm.current ? attemptedForm.current : data;
    attemptedForm.current = payload;
    try { return await createPreviewEntry(previous, payload); }
    catch { return { status: "error" as const, code: "outcome_unknown" as const, message: "The connection was interrupted. Check the saved submission before starting another entry." }; }
  }, { status: "idle" });
  const [quantity, setQuantity] = useState(() => Math.min(Math.max(1, initialQuantity), Math.max(1, maxQuantity)));
  const [selectedTicketsToast, setSelectedTicketsToast] = useState<number | null>(null);
  const [submissionKey, setSubmissionKey] = useState(requestKey);
  const [requestReceipt, setRequestReceipt] = useState<EntryRequest | null>(null);
  const [undoNow, setUndoNow] = useState(0);
  const [receiptReceivedAt, setReceiptReceivedAt] = useState(0);
  const [undoBusy, setUndoBusy] = useState(false);
  const [undoError, setUndoError] = useState("");
  const receivedRequests = useRef(new Map<string, EntryRequest["status"]>());
  const latestReceipt = useRef<EntryRequest | null>(null);
  const uncertain = state.status === "error" && state.code === "outcome_unknown";
  const entryBusy = pending || state.status === "succeeded" || requestReceipt?.status === "pending";
  const [additionalEntryNoticeOpen, setAdditionalEntryNoticeOpen] = useState(false);
  const [additionalEntryTermsSeen, setAdditionalEntryTermsSeen] = useState(false);
  const [rememberExplanation, setRememberExplanation] = useState(false);
  const [skipFutureExplainer, setSkipFutureExplainer] = useState(extraEntryExplainerAcknowledged);
  const [preferenceSaving, setPreferenceSaving] = useState(false);
  const [preferenceError, setPreferenceError] = useState<string | null>(null);
  const [preferenceResetting, setPreferenceResetting] = useState(false);
  const [preferenceResetMessage, setPreferenceResetMessage] = useState<string | null>(null);
  const [balanceNoticeOpen, setBalanceNoticeOpen] = useState(false);
  const [entryActionTouched, setEntryActionTouched] = useState(false);
  const [dismissedBalanceError, setDismissedBalanceError] = useState<typeof state | null>(null);
  const entryFormRef = useRef<HTMLFormElement>(null);
  const pendingReceiptRef = useRef<HTMLDivElement>(null);
  const totalCents = quantity * Math.round(entryPrice * 100);
  const total = totalCents / 100;
  const knownBalance = typeof balanceCents === "number" && Number.isSafeInteger(balanceCents) ? balanceCents : null;
  const showFundingSweep = highlightAfterFunding && !entryActionTouched && !entryBusy && isDemoWallet && isSignedIn && requestHead.ready
    && availabilityConfirmed && remaining > 0 && knownBalance !== null && knownBalance >= totalCents;
  const serverBalanceError = state.status === "error" && state.code === "insufficient_balance";
  const showBalanceNotice = balanceNoticeOpen || (serverBalanceError && dismissedBalanceError !== state);
  const entryLoginHref = `/login?next=${encodeURIComponent(productEntryHref(productSlug, quantity, browseReturnHref))}`;
  const addFundsHref = fundingHref(productSlug, undefined, quantity, browseReturnHref);
  const rememberEntry = (selected = quantity, resumeAfter?: "funding" | "sign-in") => saveEntryIntent(productSlug, productTitle, selected, browseReturnHref, resumeAfter);

  const addNextEntry = () => {
    const next = Math.min(maxQuantity, quantity + 1);
    if (next === quantity) return;
    setQuantity(next);
    rememberEntry(next);
    setSelectedTicketsToast(next);
  };

  const requestAdditionalEntry = () => {
    if (entryBusy || uncertain || quantity >= maxQuantity) return;
    if (!additionalEntryTermsSeen && !skipFutureExplainer) {
      setAdditionalEntryNoticeOpen(true);
      return;
    }
    addNextEntry();
  };

  const acknowledgeAndAddEntry = async () => {
    setPreferenceError(null);
    if (!rememberExplanation) {
      setPreferenceError("Check the acknowledgment before saving your choice.");
      return;
    }
    setPreferenceSaving(true);
    const preference = await acknowledgeExtraEntryExplainer();
    setPreferenceSaving(false);
    if (preference.status === "error") {
      setPreferenceError(preference.message);
      return;
    }
    setSkipFutureExplainer(true);
    setAdditionalEntryTermsSeen(true);
    addNextEntry();
    setAdditionalEntryNoticeOpen(false);
  };

  const resetExplanation = async () => {
    setPreferenceResetting(true);
    setPreferenceResetMessage(null);
    const result = await resetExtraEntryExplainer();
    setPreferenceResetting(false);
    if (result.status === "error") {
      setPreferenceResetMessage(result.message);
      return;
    }
    setSkipFutureExplainer(false);
    setAdditionalEntryTermsSeen(false);
    setRememberExplanation(false);
    setAdditionalEntryNoticeOpen(false);
    setPreferenceResetMessage("Extra-entry explanation reset. Tap + to see it again.");
    router.refresh();
  };

  useEffect(() => {
    if (selectedTicketsToast === null) return;
    const timer = window.setTimeout(() => setSelectedTicketsToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [selectedTicketsToast]);

  useEffect(() => {
    if (state.status !== "succeeded") return;
    const timer = window.setTimeout(() => router.push(state.href), 350);
    return () => window.clearTimeout(timer);
  }, [router, state]);

  useEffect(() => {
    if (state.status === "request" || state.status === "succeeded") clearEntryIntent(productSlug);
  }, [productSlug, state.status]);

  useEffect(() => {
    const receive = (event: Event) => {
      const request = (event as CustomEvent<EntryRequest>).detail;
      if (request.slug !== productSlug) return;
      if (latestReceipt.current && (Date.parse(request.undoUntil) < Date.parse(latestReceipt.current.undoUntil) ||
        (request.requestId === latestReceipt.current.requestId && latestReceipt.current.status !== "pending" && request.status === "pending"))) return;
      if (receivedRequests.current.get(request.requestId) === request.status) return;
      latestReceipt.current = request;
      setReceiptReceivedAt(performance.now());
      receivedRequests.current.set(request.requestId, request.status);
      setRequestReceipt(request);
      setUndoNow(performance.now());
      setUndoError("");
      if (request.status === "pending") { setQuantity(request.quantity); clearEntryIntent(productSlug); }
      if (request.status !== "pending") {
        setSubmissionKey(crypto.randomUUID());
      }
    };
    window.addEventListener(ENTRY_REQUEST_EVENT, receive);
    return () => window.removeEventListener(ENTRY_REQUEST_EVENT, receive);
  }, [productSlug]);

  useEffect(() => {
    if (state.status === "request") {
      if (!state.request.duplicate) window.dispatchEvent(new CustomEvent(ENTRY_REQUEST_CREATED_EVENT, { detail: state.request.requestId }));
      window.dispatchEvent(new CustomEvent(ENTRY_REQUEST_EVENT, { detail: state.request }));
    }
  }, [state]);

  useEffect(() => {
    if (requestReceipt?.status !== "pending") return;
    const timer = window.setInterval(() => setUndoNow(performance.now()), 250);
    return () => window.clearInterval(timer);
  }, [requestReceipt?.status]);

  useEffect(() => {
    if (requestReceipt?.status !== "pending") return;
    const frame = window.requestAnimationFrame(() => pendingReceiptRef.current?.scrollIntoView({ block: "center", behavior: "auto" }));
    return () => window.cancelAnimationFrame(frame);
  }, [requestReceipt?.requestId, requestReceipt?.status]);

  const undoSeconds = requestReceipt?.status === "pending"
    ? Math.max(0, Math.ceil((Date.parse(requestReceipt.undoUntil) - Date.parse(requestReceipt.serverNow)
      - (undoNow - receiptReceivedAt)) / 1000)) : 0;
  async function undoEntry() {
    if (requestReceipt?.status !== "pending" || undoBusy || undoSeconds === 0) return;
    setUndoBusy(true);
    setUndoError("");
    try {
      const result = await resolvePendingEntryRequest(requestReceipt.requestId, true);
      if (result.request) {
        window.dispatchEvent(new CustomEvent(ENTRY_REQUEST_EVENT, { detail: result.request }));
        router.refresh();
      } else setUndoError(result.error ?? "Could not check the saved submission. Try again.");
    } catch { setUndoError("Connection interrupted. Try again to check the saved submission."); }
    finally { setUndoBusy(false); }
  }

  async function confirmEntry() {
    if (requestReceipt?.status !== "pending" || undoBusy) return;
    setUndoBusy(true);
    setUndoError("");
    try {
      const result = await confirmPendingEntryRequest(requestReceipt.requestId);
      if (!result.request) {
        setUndoError(result.error ?? "Could not check the saved entry. Try again.");
        return;
      }
      window.dispatchEvent(new CustomEvent(ENTRY_REQUEST_EVENT, { detail: result.request }));
      if (result.request.status === "accepted") {
        try {
          const entryId = result.request.href ? new URL(result.request.href, window.location.origin).searchParams.get("entry") : null;
          sessionStorage.setItem(RECENT_ENTRY_STORAGE_KEY, JSON.stringify({ slug: result.request.slug, entryId, at: Date.now() }));
        } catch { /* The accepted entry is still saved in the database. */ }
        router.replace(result.request.href ?? "/account/entries");
      } else if (result.request.status === "pending") {
        setUndoError("Still checking this saved request. Confirm again or wait for the automatic result.");
      } else {
        setUndoError("This submission could not be confirmed. Its reserved funds were returned to your Playable Wallet.");
        router.refresh();
      }
    } catch { setUndoError("Connection interrupted. Check the saved entry before retrying."); }
    finally { setUndoBusy(false); }
  }


  const resetButton = isPreviewExperience && isDemoWallet && isSignedIn && (skipFutureExplainer || compact) ? <button type="button" onClick={() => void resetExplanation()} disabled={preferenceResetting} className={`${compact ? compactStyles.reset : "mt-1"} inline-block text-xs font-semibold text-cyan-300 underline underline-offset-2 hover:text-cyan-100 disabled:opacity-60`}>{preferenceResetting ? "Resetting…" : "Reset Entry Toast"}</button> : null;

  return (
    <aside id="enter-entry" className={compact ? compactStyles.panel : `scroll-mt-[calc(var(--site-header-height,163px)+17px)] rounded-2xl border border-cyan-300/30 bg-[#001b3d] p-4 shadow-[0_24px_70px_rgba(0,0,0,.24)] sm:p-5 md:scroll-mt-32 ${signedOutCompact && !isSignedIn ? "mt-0" : "mt-3"}`}>
      {compact ? <>
        <div className={compactStyles.price}><strong>${entryPrice.toFixed(2)}</strong><span>per entry</span></div>
        <div className={compactStyles.progress}>
          {availabilityConfirmed ? <>
            <div className={compactStyles.progressLabels}><strong style={{ color: availability.color }}>{remaining ? `${remaining.toLocaleString()} left` : "No entries left"}</strong><span>{availability.label}</span></div>
            <PoolProgress ticketsSold={sold} ticketCapacity={capacity} showRemainingLabel={false} />
            <small>{sold.toLocaleString()} entries · Proposed model: one selected when the pool fills.</small>
          </> : <small>Availability unverified</small>}
        </div>
      </> : <><div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-3xl font-extrabold leading-none">${entryPrice.toFixed(2)} <span className="text-sm font-bold text-white/80">per entry</span></p>
        </div>
        <span className="flex min-h-12 min-w-24 shrink-0 flex-col items-center justify-center rounded-xl px-3 py-1.5 text-center text-xs font-extrabold leading-4 sm:min-w-28" style={{ backgroundColor: availabilityConfirmed ? availability.color : "#8ba5bd", color: availabilityConfirmed && availability.almostFull ? "#fff" : "#00132e" }}>
          {availabilityConfirmed ? <><span>{availability.label}</span><span>{remaining === 0 ? "No entries left" : `${remaining.toLocaleString()} left`}</span></> : "Availability unverified"}
        </span>
      </div>

      {availabilityConfirmed ? <div className="mt-3">
        <PoolProgress ticketsSold={sold} ticketCapacity={capacity} showRemainingLabel={false} />
        <div className="mt-1 flex justify-between text-xs text-white/60">
          <span>{sold.toLocaleString()} entries</span>
          <span>{remaining.toLocaleString()} remaining</span>
        </div>
        <p className="mt-1 text-xs leading-4 text-white/60">Under the proposed model, when all available entries for an offer are filled, one entry is selected.</p>
      </div> : null}</>}

      {availabilityConfirmed && initialQuantity > maxQuantity && maxQuantity > 0 ? <p role="status" className="mt-3 text-xs font-semibold text-cyan-200">Only {maxQuantity} {maxQuantity === 1 ? "entry remains" : "entries remain"}, so your saved selection was adjusted.</p> : null}

      <div className="relative mt-3">
        {selectedTicketsToast !== null ? <div role="status" aria-live="polite" className="pointer-events-none absolute bottom-[calc(100%+8px)] right-0 z-20 w-full max-w-80 rounded-xl border border-[#67ff42]/60 bg-[#083a43] px-4 py-3 text-sm text-white shadow-[0_12px_30px_rgba(0,0,0,.4),0_0_18px_rgba(81,255,59,.22)]">
          <strong className="block text-[#8aff6f]">{selectedTicketsToast} tickets selected</strong>
          <span>Separate chances. Nothing is entered until you press Enter for ${(selectedTicketsToast * entryPrice).toFixed(2)}.</span>
        </div> : null}
        <fieldset disabled={uncertain} data-testid="entry-quantity-ticket" className={`${quantityTicketStyles.ticket} ${compact ? compactStyles.quantity : ""}`}>
          <p className={quantityTicketStyles.label}>Add extra entries</p>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => { const next = Math.max(1, quantity - 1); setQuantity(next); rememberEntry(next); setSelectedTicketsToast(null); }} disabled={quantity === 1 || entryBusy} className="grid h-10 w-10 place-items-center rounded-full border border-[#91b2cf] text-xl transition hover:border-[#0b1940] hover:bg-white disabled:cursor-not-allowed disabled:opacity-35" aria-label="Remove one entry">−</button>
            <span className="min-w-5 text-center font-mono font-bold" data-testid="entry-quantity">{quantity}</span>
            <button type="button" onClick={requestAdditionalEntry} disabled={quantity >= maxQuantity || entryBusy} className="grid h-10 w-10 place-items-center rounded-full border border-[#29ed14] bg-[#43f027] text-xl font-black text-[#002719] shadow-[0_0_15px_rgba(67,240,39,.72)] transition hover:bg-[#6aff50] hover:shadow-[0_0_22px_rgba(81,255,59,.95)] disabled:cursor-not-allowed disabled:border-[#91b2cf] disabled:bg-[#d9e9f5] disabled:text-[#7794ac] disabled:shadow-none" aria-label="Add one entry" aria-haspopup={!additionalEntryTermsSeen && !skipFutureExplainer ? "dialog" : undefined}>+</button>
          </div>
        </fieldset>
      </div>
      {signedOutCompact && !isSignedIn && !compact ? null : <p className={compact ? compactStyles.terms : "mt-2 text-xs leading-4 text-white/70"}>Each ${entryPrice.toFixed(2)} entry stands alone. If not selected, its payment stays with this {retailer} offering as its own completion option. Entries and completion options never combine.{isPreviewExperience ? "" : " Terms apply."}{compact && resetButton ? <> {resetButton}</> : null}</p>}
      {!compact ? resetButton : null}
      {preferenceResetMessage ? <p role="status" className="mt-1 text-xs text-cyan-200">{preferenceResetMessage}</p> : null}
      {requestReceipt?.status === "pending" ? <div ref={pendingReceiptRef} className="mt-3 rounded-xl border border-[#ff9a45] bg-[#ff6a00] p-3 text-sm text-[#00132e]" role="status">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-extrabold">{undoSeconds > 0 ? "Entry submitted · Undo available" : "Checking your saved entry…"}</p>
            <p className="mt-1 text-xs text-[#00132e]/80">{requestReceipt.quantity} {requestReceipt.quantity === 1 ? "ticket" : "tickets"} · ${(requestReceipt.amountCents / 100).toFixed(2)} reserved from your Playable Wallet.</p>
            <p className="mt-1 text-xs text-[#00132e]/80">The header counts active entries after confirmation. Undo releases this hold.</p>
          </div>
          <EntryUndoCountdown seconds={undoSeconds} />
        </div>
        {undoError ? <p role="alert" className="mt-2 text-xs font-bold text-[#00132e]">{undoError}</p> : null}
        <div className={`mt-2 grid gap-2 ${undoSeconds > 0 ? "grid-cols-2" : "grid-cols-1"}`}>
          {undoSeconds > 0 ? <button type="button" disabled={undoBusy} onClick={() => void undoEntry()} className="min-h-11 rounded-lg bg-[#bcecff] px-2 font-bold text-[#00132e] transition hover:bg-[#def6ff] disabled:opacity-60">Undo entry</button> : null}
          <button type="button" disabled={undoBusy} onClick={() => void confirmEntry()} className="min-h-11 rounded-lg bg-[#31e800] px-2 font-extrabold text-[#002719] transition hover:bg-[#66f34c] disabled:opacity-60">{undoBusy ? "Checking…" : "Confirm entry"}</button>
        </div>
      </div> : null}
      {requestReceipt && requestReceipt.status !== "pending" ? <div className="mt-2 flex flex-wrap items-baseline gap-x-2 rounded-lg bg-[#062b4d] px-3 py-2 text-xs leading-4" role="status">
        <p>{state.status === "request" && state.request.duplicate && state.request.requestId === requestReceipt.requestId
          ? "This earlier submission was already saved. This attempt did not add entries or charge your balance."
          : requestReceipt.status === "accepted" ? `Previous ${requestReceipt.quantity}-ticket submission saved. A new entry is separate.` : "Your previous submission was not entered. You can start a new submission below."}</p>
        {requestReceipt.href ? <Link href={requestReceipt.href} className="font-bold text-cyan-300 underline">View previous submission →</Link> : null}
      </div> : null}

      {isSignedIn && !requestHead.ready ? <div role="status" className="mt-3 rounded-xl border border-cyan-300/40 bg-[#062b4d] p-3 text-sm"><p>We couldn’t check your latest saved submission. Refresh before entering; your balance has not been charged.</p><button type="button" onClick={() => router.refresh()} className="mt-3 min-h-11 rounded-lg bg-[#00b9ff] px-4 py-2 font-bold text-[#00132e]">Refresh entry status</button></div> : null}
      {!availabilityConfirmed ? (
        <div role="status" className="mt-3 rounded-xl border border-cyan-300/40 bg-[#062b4d] p-3 text-sm">
          <p>We couldn’t refresh availability. Your balance has not been charged.</p>
          <button type="button" onClick={() => router.refresh()} className="mt-3 min-h-11 rounded-lg bg-[#00b9ff] px-4 py-2 font-bold text-[#00132e]">Refresh availability</button>
        </div>
      ) : remaining === 0 ? (
        <button type="button" disabled className="mt-3 w-full rounded-xl bg-[#0b668b] px-5 py-3 text-base font-extrabold text-white/60">No entries remaining</button>
      ) : isSignedIn ? (
        <form ref={entryFormRef} action={action} onSubmit={(event) => {
          setSelectedTicketsToast(null);
          if (entryBusy || !requestHead.ready) { event.preventDefault(); return; }
          setEntryActionTouched(true);
          // Retry the original intent, not new balance/quantity/sharing choices.
          if (uncertain) return;
          if (knownBalance !== null && knownBalance < totalCents) {
            event.preventDefault();
            rememberEntry();
            setBalanceNoticeOpen(true);
            return;
          }
          // Once a request is sent, recovery belongs to its server receipt.
          // Never describe an in-flight or uncertain submission as "Not submitted".
          clearEntryIntent(productSlug);
        }}>
          <input type="hidden" name="offeringSlug" value={productSlug} />
          <input type="hidden" name="idempotencyKey" value={submissionKey} />
          <input type="hidden" name="previousRequestId" value={requestReceipt?.status !== "pending" ? requestReceipt?.requestId ?? requestHead.requestId ?? "" : requestHead.requestId ?? ""} />
          <input type="hidden" name="quantity" value={quantity} />
          <input type="hidden" name="shareWithCrew" value="no" />
          <button type="submit" disabled={entryBusy || !requestHead.ready} data-funding-cue={showFundingSweep ? "light-sweep" : undefined} className={`${compact ? compactStyles.enter : "mt-3"} min-h-12 w-full rounded-xl bg-[#31e800] px-5 py-3 text-base font-extrabold text-[#00132e] transition hover:bg-[#66f34c] disabled:cursor-wait disabled:opacity-60 ${showFundingSweep ? entryActionStyles.fundingSweep : ""}`}>
            <span className={showFundingSweep ? entryActionStyles.buttonLabel : undefined}>{pending ? `Confirming ${quantity === 1 ? "entry" : "entries"}…` : uncertain ? "Check saved submission" : requestReceipt?.status === "pending" ? "Entry awaiting confirmation…" : state.status === "succeeded" ? `${quantity === 1 ? "Entry" : "Entries"} confirmed` : `Enter for $${total.toFixed(2)}`}</span>
          </button>
        </form>
      ) : (
        <Link href={entryLoginHref} onClick={() => rememberEntry(quantity, "sign-in")} className={`${compact ? compactStyles.enter : "mt-3"} grid min-h-12 w-full place-items-center rounded-xl bg-[#00b9ff] px-5 py-3 text-base font-extrabold text-[#00132e] transition hover:bg-cyan-200`}>
          Sign in to enter
        </Link>
      )}

      <div className={`${compact ? compactStyles.wallet : signedOutCompact && !isSignedIn ? "mt-2" : "mt-3"} flex items-center justify-between gap-3 rounded-xl border border-white/10 px-3 py-2 text-xs sm:text-sm`}>
        <span><span className="text-white/60">{isDemoWallet ? "Demo Playable Balance" : "Playable Balance"}</span> <strong className="ml-2" data-testid="product-wallet-balance">{balanceLabel}</strong></span>
        <Link href={isSignedIn ? addFundsHref : `/login?next=${encodeURIComponent(addFundsHref)}&focus=email#login-form`} onClick={() => rememberEntry(quantity, "funding")} className="font-bold text-cyan-300 hover:text-cyan-100">Add funds</Link>
      </div>

      {state.status !== "idle" && state.status !== "request" && !serverBalanceError ? (
        <div role="status" className={`mt-4 rounded-xl border p-4 text-sm leading-6 ${state.status === "error" ? "border-[#ff796c]/50 bg-[#4b1c25]" : "border-[#31e800]/40 bg-[#0b412b]"}`}>
          <strong>{state.message}</strong>
          {state.status === "succeeded" ? <span className="block text-white/65">Opening the stored result for {productTitle}…</span> : null}
        </div>
      ) : null}

      {showBalanceNotice ? <InsufficientBalanceToast quantity={quantity} totalCents={totalCents} balanceCents={serverBalanceError ? null : knownBalance} fundingHref={addFundsHref} onAddFunds={() => rememberEntry(quantity, "funding")} onClose={() => {
        setBalanceNoticeOpen(false);
        setDismissedBalanceError(state);
      }} /> : null}

      {additionalEntryNoticeOpen ? <ExtraEntryExplanation
        productTitle={productTitle} productValue={productValue} retailer={retailer} entryPrice={entryPrice}
        isSignedIn={isSignedIn} remember={rememberExplanation} saving={preferenceSaving} error={preferenceError}
        loginHref={entryLoginHref} onRemember={setRememberExplanation} onSave={() => void acknowledgeAndAddEntry()}
        onClose={() => setAdditionalEntryNoticeOpen(false)} onSignIn={() => rememberEntry(quantity, "sign-in")}
      /> : null}


      <p className={compact ? compactStyles.simulation : "mt-4 text-center text-[11px] leading-5 text-white/45"}>{compact ? "Demo activity. No real payment or reward is issued." : "Preview-only activity. The debit, entry and result are written atomically to the development/test database. No real reward is issued."}</p>
    </aside>
  );
}
