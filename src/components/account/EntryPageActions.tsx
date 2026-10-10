"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { confirmPendingEntryRequest, createPreviewEntry, resolvePendingEntryRequest, type PreviewEntryActionState } from "@/lib/entries/actions";
import { ENTRY_REQUEST_EVENT, type EntryRequest } from "@/lib/entries/request";
import type { EntryRequestHead } from "@/lib/entries/request-head";
import { initializeSampleCrewPreview, sampleCrewPeople, useSampleCrewPreviews } from "@/lib/crew/sample-preview";
import { formatUsdFromCents } from "@/lib/wallet/money";
import { EntryOutcomeEmailPreference } from "./EntryOutcomeEmailPreference";
import { sharePrizeWithCrew } from "@/lib/crew/actions";
import styles from "./entry-page.module.css";

type CrewMember = { id: string; name: string; avatarUrl: string | null };

function shortPrizeName(slug: string, title: string) {
  if (slug === "playstation-5-slim") return "PlayStation 5";
  if (slug === "samsung-m70h-tv") return "Samsung TV";
  return title.length <= 26 ? title : "this prize";
}

export function EntryPageActions({ itemTitle, slug, remaining, entryPriceCents, balanceCents, entryEnabled, requestKey, requestHead, crew, senderName, emailEnabled, returnHref }: {
  itemTitle: string; slug: string; remaining: number | null; entryPriceCents: number | null; balanceCents: number | null; entryEnabled: boolean; requestKey: string;
  requestHead: EntryRequestHead; crew: CrewMember[]; senderName: string; emailEnabled: boolean | null; returnHref: string;
}) {
  const router = useRouter();
  const [nextOpen, setNextOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [approved, setApproved] = useState(false);
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState("");
  const [result, setResult] = useState<PreviewEntryActionState>({ status: "idle" });
  const [receipt, setReceipt] = useState<EntryRequest | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [submissionKey, setSubmissionKey] = useState(requestKey);
  const [latestRequestId, setLatestRequestId] = useState(requestHead.requestId);
  const [createdHereRequestId, setCreatedHereRequestId] = useState<string | null>(null);
  const attemptedForm = useRef<FormData | null>(null);
  const activeRequestId = useRef<string | null>(null);
  const crewRail = useRef<HTMLDivElement>(null);
  const railDrag = useRef<{ pointerId: number; startX: number; scrollLeft: number } | null>(null);
  const sampleNames = useSampleCrewPreviews();
  const sampleNamesKey = sampleNames.join("|");
  const [selectedCrew, setSelectedCrew] = useState<string[]>([]);
  const [demoAlertPrepared, setDemoAlertPrepared] = useState(false);
  const [crewSharePending, setCrewSharePending] = useState(false);
  const [crewShareMessage, setCrewShareMessage] = useState("");
  const [crewShareError, setCrewShareError] = useState(false);
  const maxQuantity = Math.min(10, Math.max(0, remaining ?? 0));
  const totalCents = quantity * (entryPriceCents ?? 0);
  const insufficientBalance = balanceCents !== null && totalCents > balanceCents;
  const canEnter = entryEnabled && requestHead.ready && entryPriceCents !== null && balanceCents !== null;
  const busy = working || receipt?.status === "pending";
  const uncertain = result.status === "error" && result.code === "outcome_unknown";

  useEffect(() => { initializeSampleCrewPreview(); }, []);
  useEffect(() => {
    if (crewRail.current) crewRail.current.scrollLeft = 0;
  }, [sampleNamesKey, crew.length]);
  useEffect(() => {
    const onReceipt = (event: Event) => {
      const updated = (event as CustomEvent<EntryRequest>).detail;
      if (updated.requestId !== activeRequestId.current) return;
      setReceipt(updated);
      setLatestRequestId(updated.requestId);
      if (updated.status !== "pending") {
        setSubmissionKey(crypto.randomUUID());
        attemptedForm.current = null;
        router.refresh();
      }
    };
    window.addEventListener(ENTRY_REQUEST_EVENT, onReceipt);
    return () => window.removeEventListener(ENTRY_REQUEST_EVENT, onReceipt);
  }, [router]);
  useEffect(() => {
    if (!receipt || receipt.status !== "pending") return;
    const serverOffset = Date.parse(receipt.serverNow) - Date.now();
    const update = () => setSecondsLeft(Math.max(0, Math.ceil((Date.parse(receipt.undoUntil) - Date.now() - serverOffset) / 1000)));
    update();
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [receipt]);

  const displayCrew = [
    ...crew.map(member => ({ ...member, sample: false })),
    ...sampleCrewPeople.filter(person => sampleNames.includes(person.name)).map(person => ({ id: `sample:${person.name}`, name: person.name, avatarUrl: person.photo as string, sample: true })),
  ];

  async function sendCrewShare() {
    const realRecipientIds = selectedCrew.filter(id => !id.startsWith("sample:"));
    if (!realRecipientIds.length) {
      setDemoAlertPrepared(true);
      setCrewShareMessage("No emails or messages were actually delivered.");
      return;
    }
    setCrewSharePending(true);
    setCrewShareError(false);
    try {
      const result = await sharePrizeWithCrew(slug, realRecipientIds);
      setCrewShareMessage(result.message + (selectedCrew.length > realRecipientIds.length ? " Sample profiles were not emailed." : ""));
      setCrewShareError(!result.ok);
      setDemoAlertPrepared(result.ok);
    } catch {
      setCrewShareError(true);
      setCrewShareMessage("We couldn’t confirm the Crew share. Refresh and check before trying again.");
    } finally {
      setCrewSharePending(false);
    }
  }

  async function submitInlineEntry() {
    if (!canEnter || !approved || insufficientBalance || busy || maxQuantity === 0) return;
    const form = uncertain && attemptedForm.current ? attemptedForm.current : new FormData();
    if (!uncertain || !attemptedForm.current) {
      form.set("offeringSlug", slug);
      form.set("quantity", String(quantity));
      form.set("idempotencyKey", submissionKey);
      const previousRequestId = receipt?.status !== "pending" ? receipt?.requestId ?? latestRequestId ?? requestHead.requestId : latestRequestId ?? requestHead.requestId;
      if (previousRequestId) form.set("previousRequestId", previousRequestId);
      attemptedForm.current = form;
    }
    setWorking(true);
    setActionError("");
    try {
      const response = await createPreviewEntry({ status: "idle" }, form);
      setResult(response);
      if (response.status === "request") {
        activeRequestId.current = response.request.requestId;
        setCreatedHereRequestId(response.request.duplicate ? null : response.request.requestId);
        setLatestRequestId(response.request.requestId);
        setReceipt(response.request);
        // The global coordinator auto-finalizes, but only product-checkout-created requests navigate away.
        window.dispatchEvent(new CustomEvent(ENTRY_REQUEST_EVENT, { detail: response.request }));
      } else if (response.status === "succeeded") {
        attemptedForm.current = null;
        setSubmissionKey(crypto.randomUUID());
        router.refresh();
      }
    } catch {
      setResult({ status: "error", code: "outcome_unknown", message: "The connection was interrupted. Check this saved submission before starting another entry." });
    } finally { setWorking(false); }
  }

  async function resolveEntry(undo: boolean) {
    if (!receipt || receipt.status !== "pending" || working) return;
    setWorking(true);
    setActionError("");
    try {
      const response = undo ? await resolvePendingEntryRequest(receipt.requestId, true) : await confirmPendingEntryRequest(receipt.requestId);
      if (response.request) window.dispatchEvent(new CustomEvent(ENTRY_REQUEST_EVENT, { detail: response.request }));
      else setActionError(response.error ?? "Please check this entry again.");
    } catch { setActionError("Please check this entry again. You won’t be charged twice."); }
    finally { setWorking(false); }
  }

  function adjustQuantity(next: number) {
    setQuantity(next);
    setApproved(false);
    setCheckoutOpen(false);
    setActionError("");
  }

  function startRailDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || event.button !== 0 || (event.target as HTMLElement).closest("button, a")) return;
    railDrag.current = { pointerId: event.pointerId, startX: event.clientX, scrollLeft: event.currentTarget.scrollLeft };
    event.currentTarget.dataset.dragging = "true";
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function moveRailDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (railDrag.current?.pointerId !== event.pointerId) return;
    event.currentTarget.scrollLeft = railDrag.current.scrollLeft - (event.clientX - railDrag.current.startX);
  }

  function endRailDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (railDrag.current?.pointerId !== event.pointerId) return;
    railDrag.current = null;
    delete event.currentTarget.dataset.dragging;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return <>
    <button type="button" className={styles.nextButton} aria-expanded={nextOpen} onClick={() => setNextOpen(open => !open)}>What happens next <span aria-hidden="true">{nextOpen ? "−" : "+"}</span></button>
    {nextOpen ? <div className={styles.nextPanel}><p>The pool stays open until its available tickets are filled. Once the result is posted, your outcome will appear in My Activity and Notifications. If your entry is not selected, any optional purchase offer and its deadline will be shown separately.</p></div> : null}
    <div className={styles.actionGrid}>
      <section className={`${styles.actionPanel} ${styles.entryActionPanel}`} aria-labelledby="add-entries-title">
        <h3 id="add-entries-title">Want to help this pool close faster?</h3>
        <p>Add more separate chances for {itemTitle}, right here on this page.</p>
        {maxQuantity > 0 ? <>
          <div className={styles.quantityControls} aria-label="Choose additional entries">
            <div className={styles.quantityStepper}>
              <button type="button" aria-label="Remove one extra entry" onClick={() => adjustQuantity(Math.max(1, quantity - 1))} disabled={quantity === 1 || busy || uncertain}>−</button>
              <output aria-live="polite">{quantity}</output>
              <button type="button" aria-label="Add one extra entry" onClick={() => adjustQuantity(Math.min(maxQuantity, quantity + 1))} disabled={quantity === maxQuantity || busy || uncertain}>+</button>
            </div>
            <span>{quantity === 1 ? "extra entry" : "extra entries"}</span>
          </div>
          {!checkoutOpen ? <button type="button" className={styles.primaryLink} onClick={() => setCheckoutOpen(true)}>Add {quantity === 1 ? "more entries" : `${quantity} more entries`} to {shortPrizeName(slug, itemTitle)}</button> : null}
          {checkoutOpen ? <div className={styles.inlineCheckout} aria-label="Additional entry checkout">
            <h4>Review additional entries</h4>
            <p>{quantity} separate {quantity === 1 ? "entry" : "entries"} × {formatUsdFromCents(entryPriceCents ?? 0)} = <strong>{formatUsdFromCents(totalCents)}</strong></p>
            <p>Demo Playable Balance: <strong>{balanceCents === null ? "Unavailable" : formatUsdFromCents(balanceCents)}</strong></p>
            {insufficientBalance ? <p className={styles.checkoutError}>Not enough demo funds for this quantity. <Link href="/account/wallet">Add funds</Link></p> : null}
            {!requestHead.ready ? <p className={styles.checkoutError}>We couldn’t check your latest saved submission. Refresh before entering; your balance has not been charged.</p> : !canEnter ? <p className={styles.checkoutError}>This demo checkout is unavailable for this account right now.</p> : null}
            {receipt?.status === "pending" ? <div className={styles.receiptBox} role="status"><strong>{createdHereRequestId === receipt.requestId ? `Entry submitted · Undo available for ${secondsLeft}s` : "An earlier submission is still pending"}</strong><span>{createdHereRequestId === receipt.requestId ? `${receipt.quantity} ${receipt.quantity === 1 ? "entry" : "entries"} · ${formatUsdFromCents(receipt.amountCents)} reserved from your demo balance.` : "No second reservation or charge was made."}</span><small>The header counts active entries after confirmation. Undo releases this hold.</small><div className={styles.receiptActions}><button type="button" onClick={() => void resolveEntry(true)} disabled={working || secondsLeft === 0}>Undo entry</button><button type="button" onClick={() => void resolveEntry(false)} disabled={working}>Confirm entry</button></div></div> : null}
            {receipt?.status === "accepted" ? <p role="status" className={styles.checkoutSuccess}>{createdHereRequestId === receipt.requestId ? `Your ${receipt.quantity === 1 ? "new entry is" : `${receipt.quantity} new entries are`} confirmed and saved in My Activity. You can stay on this page.` : "That earlier submission was already saved. No additional entries were added or charged by this attempt. Refresh to review your entries."}</p> : null}
            {receipt?.status === "cancelled" || receipt?.status === "rejected" ? <p role="status" className={styles.checkoutError}>This submission was not entered. Any reservation was released.</p> : null}
            {result.status === "succeeded" ? <p role="status" className={styles.checkoutSuccess}>{result.message} You can stay on this page.</p> : null}
            {result.status === "error" ? <p role="alert" className={styles.checkoutError}>{result.message}</p> : null}
            {actionError ? <p role="alert" className={styles.checkoutError}>{actionError}</p> : null}
            {receipt?.status !== "pending" && receipt?.status !== "accepted" && result.status !== "succeeded" ? <>
              <label className={styles.approval}><input type="checkbox" checked={approved} onChange={event => setApproved(event.target.checked)} disabled={working} />I approve this demo entry transaction.</label>
              <button type="button" className={styles.checkoutConfirm} disabled={!approved || !canEnter || insufficientBalance || working} onClick={() => void submitInlineEntry()}>{working ? "Saving…" : uncertain ? "Check saved submission" : `Confirm ${quantity === 1 ? "entry" : `${quantity} entries`} for ${formatUsdFromCents(totalCents)}`}</button>
            </> : null}
            {receipt?.status === "accepted" || result.status === "succeeded" ? <button type="button" className={styles.addAgain} onClick={() => { setReceipt(null); setResult({ status: "idle" }); setApproved(false); setCheckoutOpen(false); }}>Add another entry</button> : null}
          </div> : null}
        </> : <p className={styles.unavailable}>No additional tickets are available right now.</p>}
        <div className={styles.preference}><EntryOutcomeEmailPreference initialEnabled={emailEnabled} placement="entry-page" /></div>
      </section>
      <section className={`${styles.actionPanel} ${styles.crewPanel}`} aria-labelledby="crew-title">
        <h3 id="crew-title">Invite your Crew to this prize</h3>
        <p>Choose who to notify about {itemTitle}. Only selected, approved Crew members can receive email; sample people remain a visual demo.</p>
        <div className={styles.crewRailWrap}>
          <button type="button" className={styles.railArrow} aria-label="Scroll Crew left" onClick={() => crewRail.current?.scrollBy({ left: -220, behavior: "smooth" })}>‹</button>
          <div className={styles.crewRail} ref={crewRail} aria-label="Crew members" onPointerDown={startRailDrag} onPointerMove={moveRailDrag} onPointerUp={endRailDrag} onPointerCancel={endRailDrag}>
            {displayCrew.map(member => {
              const selected = selectedCrew.includes(member.id);
              return <div className={styles.crewCard} key={member.id}>
                <div className={styles.crewAvatar}>{member.avatarUrl ? <Image src={member.avatarUrl} alt="" fill sizes="72px" unoptimized={member.avatarUrl.startsWith("http")} /> : <span aria-hidden="true">{member.name.charAt(0).toUpperCase()}</span>}</div>
                <strong>{member.name}</strong>
                <button type="button" className={`${styles.notifyButton} ${selected ? styles.notifySelected : ""}`} aria-pressed={selected} aria-label={`${selected ? "Remove" : "Notify"} ${member.name}`} onClick={() => { setSelectedCrew(current => selected ? current.filter(id => id !== member.id) : [...current, member.id]); setDemoAlertPrepared(false); setCrewShareMessage(""); }}>{selected ? "Selected ✓" : "Notify"}</button>
                <small>{member.sample ? "Sample preview" : "Approved Crew"}</small>
              </div>;
            })}
            <Link href="/account/crew" className={styles.addCrewCard}><span aria-hidden="true">＋</span><strong>Add to your Crew</strong></Link>
          </div>
          <button type="button" className={styles.railArrow} aria-label="Scroll Crew right" onClick={() => crewRail.current?.scrollBy({ left: 220, behavior: "smooth" })}>›</button>
        </div>
        <button type="button" className={styles.crewSend} disabled={!selectedCrew.length || demoAlertPrepared || crewSharePending} onClick={() => void sendCrewShare()}>{crewSharePending ? "Saving…" : demoAlertPrepared ? selectedCrew.every(id => id.startsWith("sample:")) ? "Crew preview prepared" : "Share request saved" : "Send to My Crew"}</button>
        {crewShareMessage ? <div role={crewShareError ? "alert" : "status"} className={styles.demoNotice}><p>Preview from {senderName} for {selectedCrew.length} selected {selectedCrew.length === 1 ? "person" : "people"}: <Link href={`/items/${slug}`}>View the {itemTitle} prize page</Link>.</p><p>{crewShareMessage}</p></div> : null}
      </section>
    </div>
    <Link href={returnHref} className={styles.returnButton}>Return to My Activity →</Link>
  </>;
}
