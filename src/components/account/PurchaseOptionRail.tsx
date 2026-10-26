"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { ActivityItem } from "@/lib/account/activity";
import { declineAllDemoPurchaseOptions, undoBulkDemoPurchaseOptions } from "@/lib/account/bulk-decline-actions";
import { formatUsdFromCents } from "@/lib/wallet/money";
import { EntryUndoCountdown } from "@/components/product/EntryUndoCountdown";
import { PurchaseQuantityPicker } from "./PurchaseQuantityPicker";
import { completeDemoPurchaseOptions, type BulkPurchaseRequest, type BulkPurchaseResult } from "@/lib/account/bulk-purchase-actions";
import { NOTIFICATIONS_CHANGED_EVENT } from "@/lib/account/notification-events";
import { fundingHref } from "@/lib/wallet/funding-navigation";
import styles from "./purchase-options.module.css";
import { ProductShareButton } from "@/components/product/ProductShareButton";

export function PurchaseOptionRail({ title, options, initiallySelectedEntryId, initiallyConfirmDecline = false, canBulkDecline = false, showSummary = false }: { title: string; options: ActivityItem[]; initiallySelectedEntryId?: string; initiallyConfirmDecline?: boolean; canBulkDecline?: boolean; showSummary?: boolean }) {
  const router = useRouter();
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set([initiallySelectedEntryId && options.some(option => option.entryId === initiallySelectedEntryId) ? initiallySelectedEntryId : options[0]?.entryId].filter((id): id is string => Boolean(id))));
  const [bulkPhase, setBulkPhase] = useState<"idle" | "confirm" | "working" | "undo" | "undoing" | "error">(initiallyConfirmDecline && canBulkDecline ? "confirm" : "idle");
  const [bulkMessage, setBulkMessage] = useState("");
  const [bulkOptionIds, setBulkOptionIds] = useState<string[]>([]);
  const [undoUntil, setUndoUntil] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(30);
  const count = options.length;
  const [declineRest, setDeclineRest] = useState(true);
  const [purchaseRequest, setPurchaseRequest] = useState<BulkPurchaseRequest | null>(null);
  const [purchaseResult, setPurchaseResult] = useState<BulkPurchaseResult | null>(null);
  const [purchasePending, startPurchase] = useTransition();
  const purchaseInFlight = useRef(false);
  const reviewRef = useRef<HTMLDivElement>(null);
  const purchaseErrorRef = useRef<HTMLDivElement>(null);
  const selectedOptions = options.filter(option => option.entryId && selected.has(option.entryId));
  const totalCents = selectedOptions.reduce((total, option) => total + option.remainingCents, 0);
  const canPurchase = canBulkDecline && options.every(option => Boolean(option.completionOptionId));
  const purchaseLocked = purchasePending || purchaseResult?.status === "succeeded" || (purchaseResult?.status === "error" && purchaseResult.recovery === "check");
  const item = options[0];

  useEffect(() => {
    if (purchaseRequest) { reviewRef.current?.focus(); reviewRef.current?.scrollIntoView?.({ block: "center" }); }
  }, [purchaseRequest]);

  useEffect(() => {
    if (purchaseResult?.status === "error") purchaseErrorRef.current?.scrollIntoView?.({ block: "center", behavior: "auto" });
  }, [purchaseResult]);

  function changeQuantity(quantity: number) {
    if (purchaseLocked) return;
    setSelected(previous => {
      const ids = options.filter(option => option.entryId && previous.has(option.entryId)).map(option => option.entryId!).slice(0, quantity);
      for (const option of options) { if (ids.length >= quantity) break; if (option.entryId && !ids.includes(option.entryId)) ids.push(option.entryId); }
      return new Set(ids);
    });
  }

  function reviewPurchases() {
    if (!canPurchase || purchaseLocked || !selectedOptions.length) return;
    setPurchaseResult(null);
    setPurchaseRequest({ slug: item.slug, purchaseIds: selectedOptions.map(option => option.completionOptionId!),
      declineIds: declineRest ? options.filter(option => !selected.has(option.entryId!)).map(option => option.completionOptionId!) : [],
      totalCents, requestId: crypto.randomUUID(), confirmed: true });
  }

  function confirmPurchases() {
    if (!purchaseRequest || purchaseInFlight.current || purchaseLocked) return;
    purchaseInFlight.current = true;
    startPurchase(async () => {
      try {
        const result = await completeDemoPurchaseOptions(purchaseRequest);
        setPurchaseResult(result);
        if (result.status === "error" && result.recovery === "balance") {
          router.push(fundingHref(item.slug, selectedOptions[0]?.entryId ?? undefined));
        }
        if (result.status === "succeeded") {
          window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
          router.replace(result.href);
          router.refresh();
        }
      } catch {
        setPurchaseResult({ status: "error", recovery: "check", message: "The connection was interrupted. Check your purchases before trying again; they may already be saved." });
      } finally { purchaseInFlight.current = false; }
    });
  }

  const quantityPicker = canPurchase && selected.size > 0 ? <PurchaseQuantityPicker quantity={selected.size} count={count} totalCents={totalCents}
    declineRest={declineRest} disabled={purchaseLocked || bulkPhase !== "idle" || Boolean(purchaseRequest)} onQuantity={changeQuantity}
    onDeclineRest={setDeclineRest} onContinue={reviewPurchases} /> : null;

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
    if (purchaseLocked || purchaseRequest) return;
    setSelected(previous => {
      const next = new Set(previous);
      if (canPurchase && next.size === 1 && next.has(entryId)) return previous;
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

  function finishDecline() {
    if (bulkPhase !== "undo" || undoUntil === null) return;
    setUndoUntil(null);
    router.replace("/account/declined-offers");
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

  return <>
    {showSummary ? <section id="purchase-options-intro" className={styles.hero} aria-label="Purchase option summary">
      <div className={styles.heroImage}><Image src={item.image} alt={item.title} fill sizes="(max-width: 640px) 100px, (max-width: 900px) 150px, 190px" /></div>
      <div className={styles.heroCopy}><p className={styles.retailer}>{item.retailer}</p><h2>{title}</h2><span className={styles.status}>Purchase options available</span></div>
      <div className={styles.heroNote}><p>Each entry’s credit applies only to its own purchase option.</p><ProductShareButton product={{ slug: item.slug, title: item.title, image: item.image, retailer: item.retailer, value: item.priceCents / 100 }} label="Share" className={styles.optionShare} /></div>
      <div className={styles.heroBulkControls}>
        <div className={styles.heroChoiceHeading}>
          <a href="#purchase-option-rail" className={styles.heroCount}><span className={styles.heroCircle}>{count}</span><span>Purchase {count === 1 ? "option" : "options"}</span></a>
          {canBulkDecline ? <button type="button" className={styles.heroDeclineAll} disabled={purchaseLocked || bulkPhase !== "idle" || Boolean(purchaseRequest)} onClick={() => { setBulkPhase("confirm"); document.getElementById("purchase-option-rail")?.scrollIntoView({ block: "start" }); }}>Decline all offers</button> : null}
        </div>
        {quantityPicker}
      </div>
    </section> : null}
    <section id="purchase-option-rail" className={styles.rail} aria-label={`Your separate purchase options for ${title}`}>
    <div className={styles.railHeading}>
      <h2>Your {count} purchase {count === 1 ? "option" : "options"}</h2>
      <p>{canPurchase ? "Choose a quantity or tap the exact tickets you want to purchase." : "Tap any numbered ticket to see its own purchase details. You can open more than one."}</p>
    </div>
    {bulkPhase === "idle" && !showSummary ? <div className={styles.railQuantity}>{quantityPicker}</div> : null}
    {purchaseRequest ? <div ref={reviewRef} tabIndex={-1} className={styles.purchaseConfirmation} role="group" aria-label="Confirm selected purchases" onKeyDown={event => { if (event.key === "Escape" && !purchaseLocked) { setPurchaseRequest(null); setPurchaseResult(null); } }}>
      <h3>Confirm your purchases</h3>
      <p>{purchaseRequest.purchaseIds.length} separate retailer gift {purchaseRequest.purchaseIds.length === 1 ? "card" : "cards"} for {title}.</p>
      <p><strong>{formatUsdFromCents(purchaseRequest.totalCents)} from your playable wallet.</strong> Each entry’s credit applies only to its own option.</p>
      <p>{purchaseRequest.declineIds.length ? `The other ${purchaseRequest.declineIds.length} offers will be declined only after all selected purchases succeed.` : "Your other offers stay available until their original deadlines."}</p>
      <p>Sample — not redeemable. No real payment or product shipment.</p>
      <button type="button" className={styles.makePurchases} disabled={purchaseLocked} onClick={confirmPurchases}>{purchasePending ? "Saving your purchases…" : `Confirm ${formatUsdFromCents(purchaseRequest.totalCents)} purchase${purchaseRequest.purchaseIds.length === 1 ? "" : "s"}`}</button>
      <button type="button" className={styles.heroDeclineAll} disabled={purchaseLocked} onClick={() => { setPurchaseRequest(null); setPurchaseResult(null); }}>Cancel</button>
      {purchaseResult?.status === "error" ? <div ref={purchaseErrorRef} role="alert"><p>{purchaseResult.message}</p>{purchaseResult.recovery === "balance" ? <Link href={fundingHref(item.slug, selectedOptions[0]?.entryId ?? undefined)}>Add funds →</Link> : null}{purchaseResult.recovery === "check" ? <a href={`/account/purchase-options/${encodeURIComponent(item.slug)}`}>Reload purchase status →</a> : null}<Link href="/account/wallet">Check Gift Cards & Rewards →</Link></div> : null}
    </div> : null}
    {bulkPhase === "confirm" ? <div className={styles.bulkPanel} role="group" aria-label="Confirm declining all offers"><strong>Decline all {count} offers for {title}?</strong><p>They will leave your active purchase options. Your original entries and wallet history will not be refunded or removed.</p><div className={styles.bulkButtons}><button type="button" onClick={() => void declineAll()}>Confirm decline all</button><button type="button" onClick={() => { setBulkPhase("idle"); router.replace(`/account/purchase-options/${encodeURIComponent(options[0].slug)}`); }}>Keep my offers</button></div></div> : null}
    {bulkPhase === "working" || bulkPhase === "undo" || bulkPhase === "undoing" || bulkPhase === "error" ? <div className={styles.bulkPanel} role="status">
      <div className={styles.bulkStatus}>
        <div><strong>{bulkPhase === "working" ? "Declining your offers…" : bulkPhase === "undoing" ? "Restoring your offers…" : bulkPhase === "undo" ? "Offers declined · Undo available" : "Check your offers"}</strong><p>{bulkMessage}</p></div>
        {bulkPhase === "undo" && undoUntil !== null ? <EntryUndoCountdown seconds={secondsLeft} /> : null}
      </div>
      {bulkPhase === "undo" ? <>
        <button type="button" className={`${styles.undoAll} ${styles.confirmDecline}`} onClick={finishDecline} disabled={undoUntil === null}>Confirm decline</button>
        <button type="button" className={styles.undoAll} onClick={() => void undoAll()} disabled={secondsLeft === 0 || undoUntil === null}>Undo decline all</button>
      </> : null}
      {bulkPhase === "error" ? <Link href="/account/declined-offers">Check Declined Offers →</Link> : null}
    </div> : null}
    {bulkPhase === "idle" ? <div className={styles.compactTickets} aria-label="Choose purchase options">
      {options.map((option, index) => {
        const entryId = option.entryId!;
        const isSelected = selected.has(entryId);
        return <button key={entryId} type="button" className={styles.compactTicket} data-selected={isSelected} aria-expanded={isSelected} disabled={purchaseLocked || Boolean(purchaseRequest)} aria-label={`${isSelected ? "Hide" : "Show"} purchase option ${index + 1} of ${count}`} onClick={() => toggle(entryId)}><small>OPTION</small><strong>{index + 1}</strong></button>;
      })}
    </div> : null}
    {bulkPhase === "idle" && selected.size > 0 ? <><p className={styles.selectionCount}>{selected.size} selected</p><div className={`${styles.optionList} ${selected.size === 1 ? styles.singleOptionList : ""}`} aria-label="Selected purchase option details">
      {options.map((option, index) => {
        if (!option.entryId || !selected.has(option.entryId)) return null;
        const href = `/account/entries?item=${encodeURIComponent(option.slug)}&entry=${encodeURIComponent(option.entryId)}&filter=completion&from=purchase-options`;
        return <article key={option.entryId} className={styles.optionTicket} aria-label={`Purchase option ${index + 1} of ${count}`}>
          <details>
            <summary className={styles.optionSummary}>
              <span><strong>Purchase option {index + 1}</strong><small>{formatUsdFromCents(option.paidCents)} applied · {formatUsdFromCents(option.remainingCents)} remaining</small></span>
              <span className={styles.detailsLabel}>Details <span aria-hidden="true">→</span></span>
            </summary>
            <div className={styles.optionExpanded}>
          <div className={styles.optionImage}><Image src={option.image} alt={option.title} fill sizes="(max-width: 640px) 75px, 110px" /></div>
          <div className={styles.optionCopy}>
            <div className={styles.optionHeading}><span className={styles.numberCircle}>{index + 1}</span><div><p className={styles.optionKicker}>PURCHASE OPTION {index + 1} OF {count}</p><h3>{option.title}</h3></div></div>
          </div>
          <div className={styles.optionFacts}>
            <div className={styles.optionMath}><strong>{formatUsdFromCents(option.paidCents)} applied</strong><strong>{formatUsdFromCents(option.remainingCents)} remaining</strong></div>
            <div className={styles.optionMeta}><p>Entry #{option.entryId.slice(-8)}</p>{option.completionExpiresAt ? <><p>Available until</p><time dateTime={option.completionExpiresAt}>{new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" }).format(new Date(option.completionExpiresAt))} ET</time></> : null}</div>
          </div>
          <Link href={href} className={styles.reviewOption} aria-label={`Complete purchase for option ${index + 1} of ${count} for ${option.title}`}>Complete this purchase <span aria-hidden="true">→</span></Link>
            </div>
          </details>
        </article>;
      })}
    </div></> : null}
  </section></>;
}
