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
import styles from "./decline-purchase-offers.module.css";

type Phase = "confirm" | "working" | "undo" | "undoing" | "error" | "leaving";

export function DeclinePurchaseOffersDialog({ item, count, onClose }: {
  item: ActivityItem; count: number; onClose: () => void;
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
  const savedCount = optionIds.length;
  const busy = phase === "working" || phase === "undoing" || phase === "leaving";
  const offerWord = count === 1 ? "offer" : "offers";

  const finish = useCallback(() => {
    if (inFlight.current || leaving.current) return;
    leaving.current = true;
    setUndoUntil(null);
    setPhase("leaving");
    router.replace("/account/declined-offers");
    router.refresh();
  }, [router]);

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
    if (phase === "confirm") onClose();
    else finish();
  }, [phase, onClose, finish]);

  async function decline() {
    if (inFlight.current || phase !== "confirm") return;
    inFlight.current = true;
    setPhase("working");
    try {
      const result = await declineAllDemoPurchaseOptions(item.slug);
      setMessage(result.message);
      if (result.optionIds.length) {
        setOptionIds(result.optionIds);
        setUndoUntil(Date.now() + 30_000);
        setSeconds(30);
        setPhase("undo");
      } else setPhase("error");
    } catch {
      setMessage("The connection was interrupted. Check Declined Offers before trying again; some offers may already have changed.");
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
      setUndoUntil(null);
      if (result.status === "succeeded") {
        onClose();
        router.refresh();
      } else {
        setMessage(result.message);
        setPhase("error");
      }
    } catch {
      setUndoUntil(null);
      setMessage("The connection was interrupted. Check Declined Offers to verify what was restored.");
      setPhase("error");
    } finally { inFlight.current = false; }
  }

  const title = phase === "confirm" ? `Decline ${offerWord}?`
    : phase === "error" ? "Check your offers"
      : phase === "undo" || phase === "undoing" ? "Decline submitted" : "Declining offers";

  return <PurchaseDialog title={title} onClose={dismiss} closeDisabled={busy}
    closeLabel={phase === "confirm" ? `Close and keep my ${offerWord}` : "View Declined Offers"} className={styles.dialog}>
    <div className={styles.product}>
      <Image src={item.image} alt={item.title} width={70} height={70} />
      <div><p className={styles.retailer}>{item.retailer}</p><h3>{item.title}</h3><p>{formatUsdFromCents(item.priceCents)} gift card purchase {offerWord}</p></div>
    </div>
    {phase === "confirm" ? <>
      <p className={styles.question}>Decline <span className={styles.count}>{count}</span> {offerWord}?</p>
      <p className={styles.message}>{count === 1 ? "This offer will" : "These offers will"} leave your active purchase options. No refund is issued. Your entry and wallet history stay.</p>
      <div className={styles.actions}>
        <button type="button" className={styles.keep} onClick={onClose}>Keep my {offerWord}</button>
        <button type="button" className={styles.decline} onClick={() => void decline()}>Decline {count} {offerWord}</button>
      </div>
      <p className={styles.note}>30 seconds to Undo after declining.</p>
    </> : phase === "undo" || phase === "undoing" ? <>
      <div className={styles.undoPanel}>
        <div className={styles.undoHeading}><h3>{savedCount} {savedCount === 1 ? "offer declined" : "offers declined"}.<br />{phase === "undoing" ? "Restoring…" : "Undo available."}</h3><EntryUndoCountdown seconds={seconds} compact /></div>
        <p className={styles.undoMessage} role="status">{message}</p>
        <div className={styles.actions}>
          <button ref={undoButton} type="button" className={styles.keep} disabled={busy || seconds === 0} onClick={() => void undo()}>{phase === "undoing" ? "Restoring…" : "Undo decline"}</button>
          <button type="button" className={styles.finish} disabled={busy} onClick={finish}>Finish</button>
        </div>
      </div>
    </> : phase === "error" ? <>
      <p className={styles.message} role="alert">{message}</p>
      <Link href="/account/declined-offers" className={styles.recovery}>Check Declined Offers</Link>
    </> : <p className={styles.message} role="status">{phase === "leaving" ? "Opening Declined Offers…" : "Saving your decline…"}</p>}
  </PurchaseDialog>;
}
