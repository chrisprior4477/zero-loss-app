"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { declinedOfferHref, type ActivityItem } from "@/lib/account/activity";
import { checkDeclinedOfferStatuses, declineAllDemoPurchaseOptions, undoBulkDemoPurchaseOptions, type DeclineReceipt } from "@/lib/account/bulk-decline-actions";
import { formatUsdFromCents } from "@/lib/wallet/money";
import { EntryUndoCountdown } from "@/components/product/EntryUndoCountdown";
import { PurchaseDialog } from "./PurchaseCheckoutDialog";
import { holdAccountRefresh, notifyAccountChanged } from "@/lib/account/account-state-events";
import styles from "./decline-purchase-offers.module.css";

const receiptUuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
type SavedDecline = { receipts: DeclineReceipt[]; reviewed: string[]; kept: string[]; deadline: number; message: string; check?: true; restored?: string[] };

function declineDeadline() {
  return Date.now() + 30_000;
}

type Phase = "recover" | "confirm" | "working" | "undo" | "undoing" | "error" | "leaving";

export function DeclinePurchaseOffersDialog({ item, offeredOptionIds, selectedOptionIds, ticketLabels, onBackToSelection, onClose, ownerId, recovering = false, handleBrowserBack = false, historyScope, onBackFromReview }:  {
  item: ActivityItem; ownerId?: string; recovering?: boolean; offeredOptionIds: string[]; selectedOptionIds?: string[] | null;
  ticketLabels?: Record<string, string>; onBackToSelection?: () => void; onClose?: () => void; handleBrowserBack?: boolean;
  historyScope?: string; onBackFromReview?: (ids: string[]) => void;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>(recovering ? "recover" : "confirm");
  const [message, setMessage] = useState("");
  const [unresolvedIds, setUnresolvedIds] = useState<string[]>([]);
  const [checked, setChecked] = useState<Record<string, string> | null>(null);
  const [checking, setChecking] = useState(false);
  const [receipts, setReceipts] = useState<DeclineReceipt[]>([]);
  const optionIds = receipts.map(receipt => receipt.optionId);
  const [undoUntil, setUndoUntil] = useState<number | null>(null);
  const [seconds, setSeconds] = useState(30);
  const inFlight = useRef(false);
  const leaving = useRef(false);
  const undoButton = useRef<HTMLButtonElement>(null);
  const releaseRefresh = useRef<(() => void) | null>(null);
  const selective = selectedOptionIds != null;
  const [reviewedOptionIds, setReviewedOptionIds] = useState(() => [...(selectedOptionIds ?? offeredOptionIds)]);
  const reviewed = new Set(reviewedOptionIds);
  const available = new Set(offeredOptionIds);
  const offersChanged = (!selective && reviewed.size !== available.size) || reviewedOptionIds.some(id => !available.has(id));
  const kept = offeredOptionIds.filter(id => !reviewed.has(id));
  const count = reviewedOptionIds.length;
  const savedCount = optionIds.length;
  const busy = phase === "recover" || phase === "working" || phase === "undoing" || phase === "leaving";
  const offerWord = count === 1 ? "offer" : "offers";
  const cancelReview = selective && onBackToSelection ? onBackToSelection : onClose;
  const [restoredIds, setRestoredIds] = useState<string[]>([]);
  const [restoredKept, setRestoredKept] = useState<string[] | null>(null);
  const remainingIds = restoredKept ?? kept;
  const returnToRemaining = remainingIds.length > 0 && phase === "undo" && (selective || recovering);
  const storageKey = ownerId ? `zero-loss-decline-undo:${ownerId}:${item.slug}` : null;
  const clearSaved = useCallback(() => {
    try { if (storageKey) sessionStorage.removeItem(storageKey); } catch { /* The session may block storage. */ }
  }, [storageKey]);
  useEffect(() => {
    if (!recovering || !storageKey) return;
    const frame = requestAnimationFrame(() => {
      try {
        const saved: SavedDecline | null = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
        if (saved && Number.isFinite(saved.deadline) && saved.deadline <= Date.now() + 30_000
          && Array.isArray(saved.receipts) && (saved.receipts.length || saved.check === true)
          && saved.receipts.every(receipt => receiptUuid.test(receipt.optionId) && receiptUuid.test(receipt.declineEventId))
          && Array.isArray(saved.reviewed) && saved.reviewed.every(id => receiptUuid.test(id))
          && Array.isArray(saved.kept) && saved.kept.every(id => receiptUuid.test(id)) && typeof saved.message === "string") {
          setReceipts(saved.receipts);
          setReviewedOptionIds(saved.reviewed);
          setRestoredKept(saved.kept);
          const confirmed = new Set(saved.receipts.map(receipt => receipt.optionId));
          const restored = Array.isArray(saved.restored) ? saved.restored.filter(id => saved.reviewed.includes(id)) : [];
          setRestoredIds(restored);
          setUnresolvedIds(saved.reviewed.filter(id => saved.check ? !restored.includes(id) : !confirmed.has(id)));
          setUndoUntil(saved.deadline);
          setSeconds(Math.max(0, Math.ceil((saved.deadline - Date.now()) / 1000)));
          setMessage(saved.message);
          setPhase(saved.check ? "error" : "undo");
          return;
        }
      } catch { /* Never reconstruct a receipt from URL input. */ }
      setMessage("There is no active undo confirmation in this tab. Check the saved offers for their current status.");
      setPhase("error");
    });
    return () => cancelAnimationFrame(frame);
  }, [recovering, storageKey]);

  useEffect(() => () => releaseRefresh.current?.(), []);

  const firstDeclined = receipts[0]?.optionId;
  const finish = useCallback(() => {
    if (inFlight.current || leaving.current) return;
    leaving.current = true;
    clearSaved();
    releaseRefresh.current?.();
    setUndoUntil(null);
    setPhase("leaving");
    if (returnToRemaining) onClose?.();
    router.replace(returnToRemaining ? `/account/purchase-options/${encodeURIComponent(item.slug)}` : declinedOfferHref(firstDeclined));
    router.refresh();
  }, [router, item.slug, onClose, returnToRemaining, firstDeclined, clearSaved]);

  // Keep the saved decline visible until Undo, Finish, or the original deadline.
  // An Undo already in flight must finish before any countdown navigation.
  useEffect(() => {
    if (phase !== "undo" || undoUntil === null) return;
    undoButton.current?.focus({ preventScroll: true });
    const timer = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((undoUntil - Date.now()) / 1000));
      setSeconds(left);
      if (!left && unresolvedIds.length) {
        releaseRefresh.current?.();
        setPhase("error");
      } else if (!left) finish();
    }, 250);
    return () => window.clearInterval(timer);
  }, [phase, undoUntil, finish, unresolvedIds.length]);

  const dismiss = useCallback(() => {
    if (inFlight.current || leaving.current) return;
    if (phase === "confirm") cancelReview?.();
    else finish();
  }, [phase, cancelReview, finish]);

  async function checkOffers() {
    if (inFlight.current) return;
    inFlight.current = true;
    setChecking(true);
    try {
      const status = await checkDeclinedOfferStatuses(item.slug, unresolvedIds.length ? unresolvedIds : reviewedOptionIds);
      setChecked(previous => ({ ...previous, ...status }));
    }
    catch { setChecked({}); }
    finally { inFlight.current = false; setChecking(false); }
  }

  async function decline() {
    if (inFlight.current || phase !== "confirm" || offersChanged || !count) return;
    inFlight.current = true;
    releaseRefresh.current = holdAccountRefresh();
    setPhase("working");
    try {
      const result = await declineAllDemoPurchaseOptions(item.slug, reviewedOptionIds);
      setMessage(result.message);
      if (result.receipts.length) {
        notifyAccountChanged();
        setReceipts(result.receipts);
        const confirmed = new Set(result.receipts.map(receipt => receipt.optionId));
        setUnresolvedIds(reviewedOptionIds.filter(id => !confirmed.has(id)));
        const deadline = declineDeadline();
        setUndoUntil(deadline);
        if (storageKey) try {
          sessionStorage.setItem(storageKey, JSON.stringify({ receipts: result.receipts, reviewed: reviewedOptionIds,
            kept, deadline, message: result.message } satisfies SavedDecline));
          const recoveryUrl = new URL(window.location.href);
          if (recoveryUrl.pathname === `/account/purchase-options/${item.slug}`) {
            recoveryUrl.searchParams.delete("option");
            recoveryUrl.searchParams.set("decline", "undo");
            window.history.replaceState(window.history.state, "", recoveryUrl);
          }
        } catch { /* The open dialog still shows the original undo window. */ }
        setSeconds(30);
        setPhase("undo");
      } else { releaseRefresh.current?.(); setPhase("error"); }
    } catch {
      setMessage("The connection was interrupted. Check Declined Offers before trying again; some offers may already have changed.");
      releaseRefresh.current?.();
      setPhase("error");
    } finally { inFlight.current = false; }
  }

  function keepUndoRecovery(restored: string[], feedback: string) {
    const pending = reviewedOptionIds.filter(id => !restored.includes(id));
    const matching = receipts.filter(receipt => pending.includes(receipt.optionId));
    setRestoredIds(restored);
    setUnresolvedIds(pending);
    setReceipts(matching);
    setMessage(feedback);
    if (storageKey) try {
      sessionStorage.setItem(storageKey, JSON.stringify({
        receipts: matching, reviewed: reviewedOptionIds, kept: remainingIds, deadline: undoUntil ?? Date.now(),
        message: feedback, check: true, restored,
      } satisfies SavedDecline));
    } catch { /* The dialog still shows the exact offers to check. */ }
    setPhase("error");
  }

  async function undo() {
    if (inFlight.current || phase !== "undo" || undoUntil === null) return;
    if (Date.now() >= undoUntil) { finish(); return; }
    inFlight.current = true;
    setPhase("undoing");
    try {
      const result = await undoBulkDemoPurchaseOptions(receipts);
      if (result.optionIds.length) notifyAccountChanged();
      setUndoUntil(null);
      releaseRefresh.current?.();
      if (result.status === "succeeded" && unresolvedIds.length) {
        keepUndoRecovery(result.optionIds, "The confirmed declines were restored. Check the other offers for their current status.");
      } else if (result.status === "succeeded") {
        clearSaved();
        if (storageKey && new URLSearchParams(window.location.search).get("decline") === "undo") {
          router.replace(`/account/purchase-options/${encodeURIComponent(item.slug)}`, { scroll: false });
        }
        onClose?.();
        router.refresh();
      } else {
        keepUndoRecovery(result.optionIds, result.message);
      }
    } catch {
      releaseRefresh.current?.();
      setUndoUntil(null);
      keepUndoRecovery([], "The connection was interrupted. Check these offers to verify what was restored.");
    } finally { inFlight.current = false; }
  }

  const title = phase === "recover" ? "Checking your saved decline" : phase === "confirm" ? (selective ? `Decline ${count} ${offerWord}?` : `Decline ${offerWord}?`)
    : phase === "error" ? "Check your offers"
      : phase === "undo" || phase === "undoing" ? "Decline submitted" : "Declining offers";

  function ticketList(ids: string[], label: string) {
    if (!ticketLabels || !ids.length) return null;
    return <ul aria-label={label} className={styles.ticketList}>{ids.map(id =>
      <li key={id}><strong>{ticketLabels[id] ?? `Offer #${id}`}</strong><span>{label}</span></li>)}</ul>;
  }
  const finishLabel = returnToRemaining ? "View remaining offers" : "Finish";
  return <PurchaseDialog title={title} onClose={dismiss} closeDisabled={busy} handleBrowserBack={handleBrowserBack}
    historyScope={historyScope} onBack={() => {
      if (phase === "confirm" && !offersChanged && !inFlight.current && !leaving.current) onBackFromReview?.(reviewedOptionIds);
      dismiss();
    }}
    closeLabel={phase === "confirm" ? (selective ? "Close and return to selection" : `Close and keep my ${offerWord}`) : (returnToRemaining ? "Close and view remaining offers" : "View Declined Offers")} className={styles.dialog}>
    <div className={styles.product}>
      <Image src={item.image} alt={item.title} width={70} height={70} />
      <div><p className={styles.retailer}>{item.retailer}</p><h3>{item.title}</h3><p>{formatUsdFromCents(item.priceCents)} gift card purchase {offerWord}</p></div>
    </div>
    {phase === "confirm" ? <>
      {offersChanged ? <><p className={styles.message} role="alert">Your available offers changed. Review them again before declining.</p>
        {!selective && <button type="button" className={styles.keep} onClick={() => setReviewedOptionIds([...offeredOptionIds])}>Review current offers</button>}</> : null}
      {!selective && <p className={styles.question}>Decline <span className={styles.count}>{count}</span> {offerWord}?</p>}
      <div className={styles.reviewTickets}>{ticketList(reviewedOptionIds, "Decline")}{selective && ticketList(kept, "Keep available")}</div>
      <p className={styles.message}>{selective ? `${kept.length} ${kept.length === 1 ? "offer stays" : "offers stay"} available. $0 charged.` : `${count === 1 ? "This offer will" : "These offers will"} leave your active purchase options. No refund is issued. Your entry and wallet history stay.`}</p>
      <div className={styles.actions}>
        <button type="button" className={styles.keep} onClick={cancelReview}>{selective ? "Back to selection" : `Keep my ${offerWord}`}</button>
        <button type="button" className={styles.decline} data-selective={selective} disabled={offersChanged || !count} onClick={() => void decline()}>Decline {count} {offerWord}</button>
      </div>
      <p className={styles.note}>30 seconds to Undo after declining.</p>
    </> : phase === "undo" || phase === "undoing" ? <>
      <div className={styles.undoPanel}>
        <div className={styles.undoHeading}><h3>{savedCount} {savedCount === 1 ? "offer declined" : "offers declined"}.<br />{phase === "undoing" ? "Restoring…" : "Undo available."}</h3><EntryUndoCountdown seconds={seconds} compact /></div>
        <p className={styles.undoMessage} role="status">{message}</p>
        <div className={styles.actions}>
          <button ref={undoButton} type="button" className={styles.keep} disabled={busy || seconds === 0} onClick={() => void undo()}>{phase === "undoing" ? "Restoring…" : "Undo decline"}</button>
          <button type="button" className={styles.finish} disabled={busy || checking} onClick={unresolvedIds.length ? () => void checkOffers() : finish}>{unresolvedIds.length ? checking ? "Checking…" : "Check these offers" : finishLabel}</button>
        </div>
      </div>
      {(selective || recovering) && <div className={styles.reviewTickets}>{ticketList(optionIds, "Declined")}{ticketList(remainingIds, "Still available")}</div>}
    </> : phase === "error" ? <>
      <p className={styles.message} role="alert">{message}</p>
      {ticketList(restoredIds, "Restored")}
      <button type="button" className={styles.keep} onClick={() => void checkOffers()} disabled={checking}>{checking ? "Checking…" : "Check these offers"}</button>
    </> : <p className={styles.message} role="status">{phase === "leaving" ? "Opening Declined Offers…" : "Saving your decline…"}</p>}
    {checked && <ul aria-live="polite" className={styles.reviewTickets}>
        {(unresolvedIds.length ? unresolvedIds : reviewedOptionIds).map((id, index) => <li key={id}>
          {ticketLabels?.[id] ?? `Offer ${index + 1}`} · {checked[id] === "declined"
            ? <Link href={declinedOfferHref(id)}>Declined</Link>
            : checked[id] === "available" ? "Available in Purchase Options"
            : checked[id] === "purchased" ? "Purchased" : checked[id] === "expired" ? "Expired" : checking ? "Checking…" : "Couldn’t verify"}
        </li>)}
    </ul>}
  </PurchaseDialog>;
}
