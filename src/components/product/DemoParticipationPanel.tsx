"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PoolProgress } from "@/components/product/PoolProgress";
import { availabilityStatus } from "@/lib/catalog/availability";
import { InsufficientBalanceToast } from "@/components/product/InsufficientBalanceToast";
import { fundingHref } from "@/lib/wallet/funding-navigation";
import { acknowledgeExtraEntryExplainer, confirmPendingEntryRequest, createPreviewEntry, resetExtraEntryExplainer, resolvePendingEntryRequest } from "@/lib/entries/actions";
import { ENTRY_REQUEST_CREATED_EVENT, ENTRY_REQUEST_EVENT, RECENT_ENTRY_STORAGE_KEY, type EntryRequest } from "@/lib/entries/request";
import { clearEntryIntent, productEntryHref, saveEntryIntent } from "@/lib/entries/return-intent";
import quantityTicketStyles from "./entry-quantity-ticket.module.css";

type Props = {
  productSlug: string;
  requestKey: string;
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
  extraEntryExplainerAcknowledged?: boolean;
  signedOutCompact?: boolean;
};

export function DemoParticipationPanel({
  productSlug,
  requestKey,
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
  extraEntryExplainerAcknowledged = false,
  signedOutCompact = false,
}: Props) {
  const router = useRouter();
  const availability = availabilityStatus(capacity, sold);
  const remaining = availability.remaining;
  const maxQuantity = Math.min(10, remaining);
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
  const [sharePromptOpen, setSharePromptOpen] = useState(false);
  const [balanceNoticeOpen, setBalanceNoticeOpen] = useState(false);
  const [dismissedBalanceError, setDismissedBalanceError] = useState<typeof state | null>(null);
  const entryFormRef = useRef<HTMLFormElement>(null);
  const shareChoiceRef = useRef<HTMLInputElement>(null);
  const shareChoiceConfirmed = useRef(false);
  const remainingBalance = Math.max(0, productValue - entryPrice);
  const totalCents = quantity * Math.round(entryPrice * 100);
  const total = totalCents / 100;
  const knownBalance = typeof balanceCents === "number" && Number.isSafeInteger(balanceCents) ? balanceCents : null;
  const serverBalanceError = state.status === "error" && state.code === "insufficient_balance";
  const showBalanceNotice = balanceNoticeOpen || (serverBalanceError && dismissedBalanceError !== state);
  const entryLoginHref = `/login?next=${encodeURIComponent(productEntryHref(productSlug, quantity))}`;
  const addFundsHref = fundingHref(productSlug, undefined, quantity);
  const rememberEntry = (selected = quantity) => saveEntryIntent(productSlug, productTitle, selected);

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
    if (state.status === "error") shareChoiceConfirmed.current = false;
  }, [state]);

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
        shareChoiceConfirmed.current = false;
      }
    };
    window.addEventListener(ENTRY_REQUEST_EVENT, receive);
    return () => window.removeEventListener(ENTRY_REQUEST_EVENT, receive);
  }, [productSlug]);

  useEffect(() => {
    if (state.status === "request") {
      window.dispatchEvent(new CustomEvent(ENTRY_REQUEST_CREATED_EVENT, { detail: state.request.requestId }));
      window.dispatchEvent(new CustomEvent(ENTRY_REQUEST_EVENT, { detail: state.request }));
    }
  }, [state]);

  useEffect(() => {
    if (requestReceipt?.status !== "pending") return;
    const timer = window.setInterval(() => setUndoNow(performance.now()), 250);
    return () => window.clearInterval(timer);
  }, [requestReceipt?.status]);

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
        router.replace("/account/entries");
      } else if (result.request.status === "pending") {
        setUndoError("Still checking this saved request. Confirm again or wait for the automatic result.");
      } else {
        setUndoError("This submission could not be confirmed. Its reserved funds were returned to your Playable Wallet.");
        router.refresh();
      }
    } catch { setUndoError("Connection interrupted. Check the saved entry before retrying."); }
    finally { setUndoBusy(false); }
  }

  const chooseEntrySharing = (share: boolean) => {
    if (shareChoiceRef.current) shareChoiceRef.current.value = share ? "yes" : "no";
    shareChoiceConfirmed.current = true;
    setSharePromptOpen(false);
    window.setTimeout(() => entryFormRef.current?.requestSubmit(), 0);
  };

  return (
    <aside id="enter-entry" className={`scroll-mt-[180px] rounded-2xl border border-cyan-300/30 bg-[#001b3d] p-4 shadow-[0_24px_70px_rgba(0,0,0,.24)] sm:p-5 md:scroll-mt-32 ${signedOutCompact && !isSignedIn ? "mt-0" : "mt-3"}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-3xl font-extrabold leading-none">${entryPrice.toFixed(2)} <span className="text-sm font-bold text-white/80">per entry</span></p>
        </div>
        <span className="rounded-full px-2.5 py-1 text-right text-xs font-extrabold leading-4 text-[#00132e]" style={{ backgroundColor: availabilityConfirmed ? availability.color : "#8ba5bd" }}>
          {availabilityConfirmed ? <>{availability.label}<br />{remaining === 0 ? "No entries left" : `${remaining.toLocaleString()} left`}</> : "Availability unverified"}
        </span>
      </div>

      {availabilityConfirmed ? <div className="mt-3">
        <PoolProgress ticketsSold={sold} ticketCapacity={capacity} showRemainingLabel={false} />
        <div className="mt-1 flex justify-between text-xs text-white/60">
          <span>{sold.toLocaleString()} entries</span>
          <span>{remaining.toLocaleString()} remaining</span>
        </div>
        <p className="mt-1 text-xs leading-4 text-white/60">Under the proposed model, when all available entries for an offer are filled, one entry is selected.</p>
      </div> : null}

      {availabilityConfirmed && initialQuantity > maxQuantity && maxQuantity > 0 ? <p role="status" className="mt-3 text-xs font-semibold text-cyan-200">Only {maxQuantity} {maxQuantity === 1 ? "entry remains" : "entries remain"}, so your saved selection was adjusted.</p> : null}

      <div className="relative mt-3">
        {selectedTicketsToast !== null ? <div role="status" aria-live="polite" className="pointer-events-none absolute bottom-[calc(100%+8px)] right-0 z-20 w-full max-w-80 rounded-xl border border-[#67ff42]/60 bg-[#083a43] px-4 py-3 text-sm text-white shadow-[0_12px_30px_rgba(0,0,0,.4),0_0_18px_rgba(81,255,59,.22)]">
          <strong className="block text-[#8aff6f]">{selectedTicketsToast} tickets selected</strong>
          <span>Separate chances. Nothing is entered until you press Enter for ${(selectedTicketsToast * entryPrice).toFixed(2)}.</span>
        </div> : null}
        <fieldset disabled={uncertain} data-testid="entry-quantity-ticket" className={quantityTicketStyles.ticket}>
          <p className={quantityTicketStyles.label}>Want to add extra entries?<span className={quantityTicketStyles.hint}>Click + to add one.</span></p>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => { const next = Math.max(1, quantity - 1); setQuantity(next); rememberEntry(next); setSelectedTicketsToast(null); }} disabled={quantity === 1 || entryBusy} className="grid h-10 w-10 place-items-center rounded-full border border-[#91b2cf] text-xl transition hover:border-[#0b1940] hover:bg-white disabled:cursor-not-allowed disabled:opacity-35" aria-label="Remove one entry">−</button>
            <span className="w-5 text-center font-mono font-bold" data-testid="entry-quantity">{quantity}</span>
            <button type="button" onClick={requestAdditionalEntry} disabled={quantity >= maxQuantity || entryBusy} className="grid h-10 w-10 place-items-center rounded-full border border-[#56ff3b] bg-[#123e27] text-xl font-black text-[#67ff42] shadow-[0_0_12px_rgba(81,255,59,.85),inset_0_0_12px_rgba(81,255,59,.2)] transition hover:bg-[#1b5834] hover:shadow-[0_0_18px_rgba(81,255,59,1),inset_0_0_14px_rgba(81,255,59,.28)] disabled:cursor-not-allowed disabled:opacity-35" aria-label="Add one entry" aria-haspopup={!additionalEntryTermsSeen && !skipFutureExplainer ? "dialog" : undefined}>+</button>
          </div>
        </fieldset>
      </div>
      {signedOutCompact && !isSignedIn ? null : <p className="mt-2 text-xs leading-4 text-white/70">Each ${entryPrice.toFixed(2)} entry stands alone. If not selected, its payment stays with this {retailer} offering as its own completion option. Entries and completion options never combine.{isPreviewExperience ? "" : " Terms apply."}</p>}
      {isPreviewExperience && isDemoWallet && isSignedIn && skipFutureExplainer ? <button type="button" onClick={() => void resetExplanation()} disabled={preferenceResetting} className="mt-1 inline-block text-xs font-semibold text-cyan-300 underline underline-offset-2 hover:text-cyan-100 disabled:opacity-60">{preferenceResetting ? "Resetting…" : "Reset Entry Toast"}</button> : null}
      {preferenceResetMessage ? <p role="status" className="mt-1 text-xs text-cyan-200">{preferenceResetMessage}</p> : null}
      {requestReceipt?.status === "pending" ? <div className="mt-3 rounded-xl border border-[#ff9a45] bg-[#ff6a00] p-3 text-sm text-[#00132e]" role="status">
        <p className="font-extrabold">{undoSeconds > 0 ? `Entry submitted · Undo available for ${undoSeconds}s` : "Checking your saved entry…"}</p>
        <p className="mt-1 text-xs text-[#00132e]/80">{requestReceipt.quantity} {requestReceipt.quantity === 1 ? "ticket" : "tickets"} · ${(requestReceipt.amountCents / 100).toFixed(2)} reserved from your Playable Wallet.</p>
        {undoError ? <p role="alert" className="mt-2 text-xs font-bold text-[#00132e]">{undoError}</p> : null}
        <div className={`mt-2 grid gap-2 ${undoSeconds > 0 ? "grid-cols-2" : "grid-cols-1"}`}>
          {undoSeconds > 0 ? <button type="button" disabled={undoBusy} onClick={() => void undoEntry()} className="min-h-11 rounded-lg bg-[#bcecff] px-2 font-bold text-[#00132e] transition hover:bg-[#def6ff] disabled:opacity-60">Undo entry</button> : null}
          <button type="button" disabled={undoBusy} onClick={() => void confirmEntry()} className="min-h-11 rounded-lg bg-[#31e800] px-2 font-extrabold text-[#002719] transition hover:bg-[#66f34c] disabled:opacity-60">{undoBusy ? "Checking…" : "Confirm entry"}</button>
        </div>
      </div> : null}
      {requestReceipt && requestReceipt.status !== "pending" ? <div className="mt-2 flex flex-wrap items-baseline gap-x-2 rounded-lg bg-[#062b4d] px-3 py-2 text-xs leading-4" role="status">
        <p>{requestReceipt.status === "accepted" ? `Previous ${requestReceipt.quantity}-ticket submission saved. A new entry is separate.` : "Your previous submission was not entered. You can start a new submission below."}</p>
        {requestReceipt.href ? <Link href={requestReceipt.href} className="font-bold text-cyan-300 underline">View previous submission →</Link> : null}
      </div> : null}

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
          if (entryBusy) { event.preventDefault(); return; }
          // Retry the original intent, not new balance/quantity/sharing choices.
          if (uncertain) return;
          if (knownBalance !== null && knownBalance < totalCents) {
            event.preventDefault();
            shareChoiceConfirmed.current = false;
            setSharePromptOpen(false);
            setBalanceNoticeOpen(true);
            return;
          }
          if (shareChoiceConfirmed.current) return;
          event.preventDefault();
          setSharePromptOpen(true);
        }}>
          <input type="hidden" name="offeringSlug" value={productSlug} />
          <input type="hidden" name="idempotencyKey" value={submissionKey} />
          <input type="hidden" name="previousRequestId" value={requestReceipt?.status !== "pending" ? requestReceipt?.requestId ?? "" : ""} />
          <input type="hidden" name="quantity" value={quantity} />
          <input ref={shareChoiceRef} type="hidden" name="shareWithCrew" value="no" />
          <button type="submit" disabled={entryBusy} className="mt-3 min-h-12 w-full rounded-xl bg-[#00b9ff] px-5 py-3 text-base font-extrabold text-[#00132e] transition hover:bg-cyan-200 disabled:cursor-wait disabled:opacity-60">
            {pending ? `Confirming ${quantity === 1 ? "entry" : "entries"}…` : uncertain ? "Check saved submission" : requestReceipt?.status === "pending" ? "Entry awaiting confirmation…" : state.status === "succeeded" ? `${quantity === 1 ? "Entry" : "Entries"} confirmed` : `Enter for $${total.toFixed(2)}`}
          </button>
        </form>
      ) : (
        <Link href={entryLoginHref} onClick={() => rememberEntry()} className="mt-3 grid min-h-12 w-full place-items-center rounded-xl bg-[#00b9ff] px-5 py-3 text-base font-extrabold text-[#00132e] transition hover:bg-cyan-200">
          Sign in to enter
        </Link>
      )}

      <div className={`${signedOutCompact && !isSignedIn ? "mt-2" : "mt-3"} flex items-center justify-between gap-3 rounded-xl border border-white/10 px-3 py-2 text-xs sm:text-sm`}>
        <span><span className="text-white/60">{isDemoWallet ? "Demo Playable Balance" : "Playable Balance"}</span> <strong className="ml-2" data-testid="product-wallet-balance">{balanceLabel}</strong></span>
        <Link href={isSignedIn ? addFundsHref : `/login?next=${encodeURIComponent(addFundsHref)}&focus=email#login-form`} onClick={() => rememberEntry()} className="font-bold text-cyan-300 hover:text-cyan-100">Add funds</Link>
      </div>

      {state.status !== "idle" && state.status !== "request" && !serverBalanceError ? (
        <div role="status" className={`mt-4 rounded-xl border p-4 text-sm leading-6 ${state.status === "error" ? "border-[#ff796c]/50 bg-[#4b1c25]" : "border-[#31e800]/40 bg-[#0b412b]"}`}>
          <strong>{state.message}</strong>
          {state.status === "succeeded" ? <span className="block text-white/65">Opening the stored result for {productTitle}…</span> : null}
        </div>
      ) : null}

      {showBalanceNotice ? <InsufficientBalanceToast quantity={quantity} totalCents={totalCents} balanceCents={serverBalanceError ? null : knownBalance} fundingHref={addFundsHref} onAddFunds={() => rememberEntry()} onClose={() => {
        setBalanceNoticeOpen(false);
        setDismissedBalanceError(state);
      }} /> : null}

      {additionalEntryNoticeOpen ? createPortal((
        <div className="fixed inset-0 z-[200] grid place-items-end bg-[#000914]/75 p-2 backdrop-blur-sm sm:place-items-center sm:p-4" role="presentation" onMouseDown={(event) => {
          if (event.currentTarget === event.target) setAdditionalEntryNoticeOpen(false);
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="additional-entry-title" className="max-h-[94dvh] w-full max-w-xl overflow-y-auto rounded-[1.75rem] border border-cyan-300/55 bg-[#001b3d] text-left shadow-[0_28px_90px_rgba(0,0,0,.68),0_0_30px_rgba(0,185,255,.24)] md:grid md:max-h-[90dvh] md:max-w-[820px] md:grid-cols-2 md:items-center">
            <h2 id="additional-entry-title" className="sr-only">How Extra Chances Work</h2>
            <div className="relative md:self-stretch">
              <Image src="/account/extra-entry-explainer-seamless-neon.jpg" alt="How extra chances work: each entry is a separate chance and never combines into one discount" width={2286} height={2922} className="h-auto w-full md:h-full md:object-contain" priority sizes="(max-width: 767px) calc(100vw - 16px), 410px" />
              <button type="button" onClick={() => setAdditionalEntryNoticeOpen(false)} className="absolute right-[.5%] top-0 h-9 w-9 rounded-full bg-transparent transition hover:bg-[#001b3d]/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300" aria-label="Close extra entry explanation" />
            </div>

            <div className="space-y-4 px-4 pb-5 pt-4 sm:px-6 sm:pb-6 md:py-5">
            <details className="group rounded-xl border border-cyan-300/35 bg-[#001632] open:border-cyan-300/60">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-bold text-white marker:hidden">
                <span className="flex items-center gap-3"><span className="grid h-7 w-7 place-items-center rounded-full bg-[#00b9ff] text-[#00132e]">?</span>Why does each entry stand alone?</span>
                <span aria-hidden="true" className="text-xl text-cyan-300 transition group-open:rotate-180">⌄</span>
              </summary>
              <div className="border-t border-cyan-300/20 px-4 py-4">
                <ol className="space-y-3 text-sm leading-6 text-white/78">
                  <li><strong className="text-white">1. Another entry means another independent chance.</strong> Each entry receives the same chance of selection, subject to the published pool rules.</li>
                  <li><strong className="text-white">2. Non-selected entries do not become wallet cash.</strong> Each non-selected paid entry has its own optional 30-day right to complete this exact offering.</li>
                  <li><strong className="text-white">3. The options cannot be stacked.</strong> Entry payments and completion options cannot be combined with one another or with Playable Balance.</li>
                  <li><strong className="text-white">4. Each option requires its own remaining payment.</strong> For this ${productValue.toLocaleString()} {retailer} offering, one ${entryPrice.toFixed(2)} entry would leave ${remainingBalance.toFixed(2)} to complete one purchase.</li>
                  <li><strong className="text-white">5. The option stays with this entry and retailer.</strong> It cannot move to a different product, retailer, account, entry, or cash withdrawal.</li>
                </ol>
                <div className="mt-4 rounded-xl border border-[#31e800]/30 bg-[#31e800]/8 p-3 text-sm leading-6">
                  <strong className="text-[#67ff42]">Example with three entries:</strong> You receive three separate chances for {productTitle}. If none is selected, you have three separate optional 30-day completion rights—not a combined ${(entryPrice * 3).toFixed(2)} credit. Completing all three purchases would require three separate remaining payments of ${remainingBalance.toFixed(2)} each.
                </div>
              </div>
            </details>

            {isSignedIn ? (
              <>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/15 bg-white/5 p-3">
                  <input type="checkbox" checked={rememberExplanation} onChange={(event) => setRememberExplanation(event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#55ff3b]" />
                  <span><strong className="block text-sm">I understand how extra entries work.</strong><span className="mt-0.5 block text-xs leading-5 text-white/60">Please stop showing this explanation again.</span></span>
                </label>
                {preferenceError ? <p role="alert" className="mt-3 rounded-xl border border-[#ff796c]/40 bg-[#4b1c25] p-3 text-sm">{preferenceError}</p> : null}
                <button type="button" onClick={acknowledgeAndAddEntry} disabled={!rememberExplanation || preferenceSaving} className="w-full rounded-xl bg-[#00b9ff] px-4 py-3.5 font-extrabold text-[#00132e] transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-[#0b668b] disabled:text-white/55">{preferenceSaving ? "Saving your choice…" : "I understand — save my choice"}</button>
              </>
            ) : (
              <>
                <p className="text-xs leading-5 text-white/60">Sign in to choose extra entries and save this explanation preference.</p>
                <Link href={entryLoginHref} onClick={() => rememberEntry()} className="grid w-full place-items-center rounded-xl bg-[#00b9ff] px-4 py-3.5 font-extrabold text-[#00132e] transition hover:bg-cyan-200">Sign in to add entries</Link>
              </>
            )}
            </div>
          </section>
        </div>
      ), document.body) : null}

      {sharePromptOpen ? createPortal((
        <div className="fixed inset-0 z-[210] grid place-items-center bg-[#000914]/80 p-3 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSharePromptOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="crew-share-title" className="w-full max-w-md rounded-2xl border border-cyan-300/60 bg-[#072744] p-5 text-white shadow-[0_20px_70px_#000a,0_0_25px_#00b9ff44] sm:p-7">
            <p className="text-xs font-extrabold uppercase tracking-[.16em] text-cyan-300">One last choice</p>
            <h2 id="crew-share-title" className="mt-2 text-2xl font-black">Share this pick with your Crew?</h2>
            {requestReceipt?.status === "accepted" ? <p className="mt-3 rounded-lg border border-cyan-300/35 p-3 text-sm">Your previous {requestReceipt.quantity === 1 ? "ticket is" : `${requestReceipt.quantity} tickets are`} already saved. This is a new, additional submission for ${total.toFixed(2)}.</p> : null}
            <p className="mt-3 text-sm leading-6 text-white/75">Only people you approve for your Crew can see that you picked <strong className="text-white">{productTitle}</strong>. They won’t see your payment details or wallet. This does not change your entry or chances.</p>
            <p className="mt-3 text-xs leading-5 text-white/60">You can turn sharing on or off for each entry anytime in <Link href="/account/crew" className="font-bold text-cyan-300 underline">Account → Your Crew</Link>. Nothing is shared publicly.</p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => chooseEntrySharing(false)} className="min-h-12 rounded-lg border border-cyan-300/50 bg-[#0c3154] px-4 py-2 font-bold hover:bg-[#13547a]">Keep private &amp; enter</button>
              <button type="button" onClick={() => chooseEntrySharing(true)} className="min-h-12 rounded-lg bg-[#55ee43] px-4 py-2 font-black text-[#052329] hover:bg-[#8bff7c]">Share with Crew &amp; enter</button>
            </div>
            <button type="button" onClick={() => setSharePromptOpen(false)} className="mt-3 w-full py-2 text-sm text-white/60 hover:text-white">Cancel</button>
          </section>
        </div>
      ), document.body) : null}

      <p className="mt-4 text-center text-[11px] leading-5 text-white/45">Preview-only activity. The debit, entry and result are written atomically to the development/test database. No real reward is issued.</p>
    </aside>
  );
}
