"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ActivityItem } from "@/lib/account/activity";
import { declineAllDemoPurchaseOptions, undoBulkDemoPurchaseOptions } from "@/lib/account/bulk-decline-actions";
import { formatUsdFromCents } from "@/lib/wallet/money";
import { EntryUndoCountdown } from "@/components/product/EntryUndoCountdown";
import styles from "./purchase-options.module.css";

export function PurchaseOptionRail({ title, options, initiallySelectedEntryId, initiallyConfirmDecline = false, canBulkDecline = false }: { title: string; options: ActivityItem[]; initiallySelectedEntryId?: string; initiallyConfirmDecline?: boolean; canBulkDecline?: boolean }) {
  const router = useRouter();
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set([initiallySelectedEntryId && options.some(option => option.entryId === initiallySelectedEntryId) ? initiallySelectedEntryId : options[0]?.entryId].filter((id): id is string => Boolean(id))));
  const [bulkPhase, setBulkPhase] = useState<"idle" | "confirm" | "working" | "undo" | "undoing" | "error">(initiallyConfirmDecline && canBulkDecline ? "confirm" : "idle");
  const [bulkMessage, setBulkMessage] = useState("");
  const [bulkOptionIds, setBulkOptionIds] = useState<string[]>([]);
  const [undoUntil, setUndoUntil] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(30);
  const count = options.length;

  useEffect(() => {
    if (undoUntil === null) return;
    const update = () => {
      const remaining = Math.max(0, Math.ceil((undoUntil - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) {
        setUndoUntil(null);
        router.replace("/account/declined-offers");
      }
    };
    update();
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [undoUntil, router]);

  function toggle(entryId: string) {
    setSelected(previous => {
      const next = new Set(previous);
      if (next.has(entryId)) next.delete(entryId);
      else next.add(entryId);
      return next;
    });
  }

  async function declineAll() {
    if (!canBulkDecline || bulkPhase !== "confirm") return;
    setBulkPhase("working");
    try {
      const result = await declineAllDemoPurchaseOptions(options[0].slug);
      setBulkMessage(result.message);
      if (result.optionIds.length > 0) {
        setBulkOptionIds(result.optionIds);
        setUndoUntil(Date.now() + 30_000);
        setSecondsLeft(30);
        setBulkPhase("undo");
      } else setBulkPhase("error");
    } catch {
      setBulkMessage("The connection was interrupted. Check Declined Offers before trying again; some offers may already have changed.");
      setBulkPhase("error");
    }
  }

  async function undoAll() {
    if (bulkPhase !== "undo" || undoUntil === null || Date.now() >= undoUntil) return;
    setBulkPhase("undoing");
    try {
      const result = await undoBulkDemoPurchaseOptions(bulkOptionIds);
      setBulkMessage(result.message);
      setUndoUntil(null);
      setBulkPhase(result.status === "succeeded" ? "idle" : "error");
      if (result.status === "succeeded") {
        router.replace(`/account/purchase-options/${encodeURIComponent(options[0].slug)}`);
        router.refresh();
      }
    } catch {
      setBulkMessage("The connection was interrupted. Check Declined Offers to verify what was restored.");
      setUndoUntil(null);
      setBulkPhase("error");
    }
  }

  return <section id="purchase-option-rail" className={styles.rail} aria-label={`Your separate purchase options for ${title}`}>
    <div className={styles.railHeading}>
      <h2>Your {count} purchase {count === 1 ? "option" : "options"}</h2>
      <p>Tap any numbered ticket to see its own purchase details. You can open more than one.</p>
    </div>
    {bulkPhase === "confirm" ? <div className={styles.bulkPanel} role="group" aria-label="Confirm declining all offers"><strong>Decline all {count} offers for {title}?</strong><p>They will leave your active purchase options. Your original entries and wallet history will not be refunded or removed.</p><div className={styles.bulkButtons}><button type="button" onClick={() => void declineAll()}>Confirm decline all</button><button type="button" onClick={() => { setBulkPhase("idle"); router.replace(`/account/purchase-options/${encodeURIComponent(options[0].slug)}`); }}>Keep my offers</button></div></div> : null}
    {bulkPhase === "working" || bulkPhase === "undo" || bulkPhase === "undoing" || bulkPhase === "error" ? <div className={styles.bulkPanel} role="status"><div className={styles.bulkStatus}><div><strong>{bulkPhase === "working" ? "Declining your offers…" : bulkPhase === "undoing" ? "Restoring your offers…" : bulkPhase === "undo" ? "Offers declined · Undo available" : "Check your offers"}</strong><p>{bulkMessage}</p></div>{bulkPhase === "undo" ? <EntryUndoCountdown seconds={secondsLeft} /> : null}</div>{bulkPhase === "undo" ? <button type="button" className={styles.undoAll} onClick={() => void undoAll()} disabled={secondsLeft === 0}>Undo decline all</button> : null}{bulkPhase === "error" ? <Link href="/account/declined-offers">Check Declined Offers →</Link> : null}</div> : null}
    {bulkPhase === "idle" ? <div className={styles.compactTickets} aria-label="Choose purchase options">
      {options.map((option, index) => {
        const entryId = option.entryId!;
        const isSelected = selected.has(entryId);
        return <button key={entryId} type="button" className={styles.compactTicket} data-selected={isSelected} aria-expanded={isSelected} aria-label={`${isSelected ? "Hide" : "Show"} purchase option ${index + 1} of ${count}`} onClick={() => toggle(entryId)}><small>OPTION</small><strong>{index + 1}</strong></button>;
      })}
    </div> : null}
    {bulkPhase === "idle" && selected.size > 0 ? <div className={`${styles.optionList} ${selected.size === 1 ? styles.singleOptionList : ""}`} aria-label="Selected purchase option details">
      {options.map((option, index) => {
        if (!option.entryId || !selected.has(option.entryId)) return null;
        const href = `/account/entries?item=${encodeURIComponent(option.slug)}&entry=${encodeURIComponent(option.entryId)}&filter=completion&from=purchase-options`;
        return <article key={option.entryId} className={styles.optionTicket} aria-label={`Purchase option ${index + 1} of ${count}`}>
          <div className={styles.optionImage}><Image src={option.image} alt={option.title} fill sizes="(max-width: 640px) 75px, 110px" /></div>
          <div className={styles.optionCopy}>
            <div className={styles.optionHeading}><span className={styles.numberCircle}>{index + 1}</span><div><p className={styles.optionKicker}>PURCHASE OPTION {index + 1} OF {count}</p><h3>{option.title}</h3></div></div>
          </div>
          <div className={styles.optionFacts}>
            <div className={styles.optionMath}><strong>{formatUsdFromCents(option.paidCents)} applied</strong><strong>{formatUsdFromCents(option.remainingCents)} remaining</strong></div>
            <div className={styles.optionMeta}><p>Entry #{option.entryId.slice(-8)}</p>{option.completionExpiresAt ? <><p>Available until</p><time dateTime={option.completionExpiresAt}>{new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(option.completionExpiresAt))}</time></> : null}</div>
          </div>
          <Link href={href} className={styles.reviewOption} aria-label={`Complete purchase for option ${index + 1} of ${count} for ${option.title}`}>Complete this purchase <span aria-hidden="true">→</span></Link>
        </article>;
      })}
    </div> : null}
  </section>;
}
