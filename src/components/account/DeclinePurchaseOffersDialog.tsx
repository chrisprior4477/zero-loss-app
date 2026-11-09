"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ActivityItem } from "@/lib/account/activity";
import { declineAllDemoPurchaseOptions, undoBulkDemoPurchaseOptions } from "@/lib/account/bulk-decline-actions";
import { formatUsdFromCents } from "@/lib/wallet/money";
import { EntryUndoCountdown } from "@/components/product/EntryUndoCountdown";
import { PurchaseDialog } from "./PurchaseCheckoutDialog";
import { holdAccountRefresh, notifyAccountChanged } from "@/lib/account/account-state-events";
import styles from "./decline-purchase-offers.module.css";

type Phase = "confirm" | "working" | "undo" | "undoing" | "error" | "leaving";

export function DeclinePurchaseOffersDialog({ item, offeredOptionIds, selectedOptionIds, ticketLabels, onBackToSelection, onClose }: {
  item: ActivityItem; offeredOptionIds: string[]; selectedOptionIds?: string[] | null;
  ticketLabels?: Record<string, string>; onBackToSelection?: () => void; onClose: () => void;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("confirm");
  const [message, setMessage] = useState("");
  const [optionIds, setOptionIds] = useState<string[]>([]);
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
  const busy = phase === "working" || phase === "undoing" || phase === "leaving";
  const offerWord = count === 1 ? "offer" : "offers";
  const cancelReview = selective && onBackToSelection ? onBackToSelection : onClose;
  const returnToRemaining = selective && kept.length > 0 && phase === "undo";

  useEffect(() => () => releaseRefresh.current?.(), []);

  const finish = useCallback(() => {
    if (inFlight.current || leaving.current) return;
    leaving.current = true;
    releaseRefresh.current?.();
    setUndoUntil(null);
    setPhase("leaving");
    if (returnToRemaining) onClose();
    router.replace(returnToRemaining ? `/account/purchase-options/${encodeURIComponent(item.slug)}` : "/account/declined-offers");
    router.refresh();
  }, [router, item.slug, onClose, returnToRemaining]);

  // Keep the saved decline visible until Undo, Finish, or the original deadline.
  // An Undo already in flight must finish before any countdown navigation.
  useEffect(() => {
    if (phase !== "undo" || undoUntil === null) return;
    undoButton.current?.focus({ preventScroll: true });
    const timer = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((undoUntil - Date.now()) / 1000));
      setSeconds(left);
      if (!left) finish();
    }, 250);
    return () => window.clearInterval(timer);
  }, [phase, undoUntil, finish]);

  const dismiss = useCallback(() => {
    if (inFlight.current || leaving.current) return;
    if (phase === "confirm") cancelReview();
    else finish();
  }, [phase, cancelReview, finish]);

  async function decline() {
    if (inFlight.current || phase !== "confirm" || offersChanged || !count) return;
    inFlight.current = true;
    releaseRefresh.current = holdAccountRefresh();
    setPhase("working");
    try {
      const result = await declineAllDemoPurchaseOptions(item.slug, reviewedOptionIds);
      setMessage(result.message);
      if (result.optionIds.length) {
        notifyAccountChanged();
        setOptionIds(result.optionIds);
        setUndoUntil(Date.now() + 30_000);
        setSeconds(30);
        setPhase("undo");
      } else { releaseRefresh.current?.(); setPhase("error"); }
    } catch {
      setMessage("The connection was interrupted. Check Declined Offers before trying again; some offers may already have changed.");
      releaseRefresh.current?.();
      setPhase("error");
    } finally { inFlight.current = false; }
  }

  async function undo() {
    if (inFlight.current || phase !== "undo" || undoUntil === null) return;
    if (Date.now() >= undoUntil) { finish(); return; }
    inFlight.current = true;
    setPhase("undoing");
    try {
      // Restore only the IDs the server confirmed, including a partial decline.
      const result = await undoBulkDemoPurchaseOptions(optionIds);
      if (result.optionIds.length) notifyAccountChanged();
      setUndoUntil(null);
      releaseRefresh.current?.();
      if (result.status === "succeeded") {
        onClose();
        router.refresh();
      } else {
        setMessage(result.message);
        setPhase("error");
      }
    } catch {
      releaseRefresh.current?.();
      setUndoUntil(null);
      setMessage("The connection was interrupted. Check Declined Offers to verify what was restored.");
      setPhase("error");
    } finally { inFlight.current = false; }
  }

  const title = phase === "confirm" ? (selective ? `Decline ${count} ${offerWord}?` : `Decline ${offerWord}?`)
    : phase === "error" ? "Check your offers"
      : phase === "undo" || phase === "undoing" ? "Decline submitted" : "Declining offers";

  function ticketList(ids: string[], label: string) {
    if (!ticketLabels || !ids.length) return null;
    return <ul aria-label={label} className={styles.ticketList}>{ids.map(id =>
      <li key={id}><strong>{ticketLabels[id] ?? `Offer #${id}`}</strong><span>{label}</span></li>)}</ul>;
  }
  const finishLabel = returnToRemaining ? "View remaining offers" : "Finish";
  return <PurchaseDialog title={title} onClose={dismiss} closeDisabled={busy}
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
          <button type="button" className={styles.finish} disabled={busy} onClick={finish}>{finishLabel}</button>
        </div>
      </div>
      {selective && <div className={styles.reviewTickets}>{ticketList(optionIds, "Declined")}{ticketList(kept, "Still available")}</div>}
    </> : phase === "error" ? <>
      <p className={styles.message} role="alert">{message}</p>
      <Link href="/account/declined-offers" className={styles.recovery}>Check Declined Offers</Link>
    </> : <p className={styles.message} role="status">{phase === "leaving" ? "Opening Declined Offers…" : "Saving your decline…"}</p>}
  </PurchaseDialog>;
}
