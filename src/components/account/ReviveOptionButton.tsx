"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { unstable_rethrow } from "next/navigation";
import { readDeclineForRevival, revivePurchaseOption, type PurchaseOptionActionState } from "@/lib/account/lifecycle-actions";
import { PurchaseDialog } from "./PurchaseCheckoutDialog";
import styles from "./my-activity.module.css";
import dialogStyles from "./decline-purchase-offers.module.css";

const initialState: PurchaseOptionActionState = { status: "idle" };

export function ReviveOptionButton({ optionId, ticketLabel, productTitle, expiresAt, statusHref = "/account/entries?filter=completion" }: {
  optionId: string; ticketLabel: string; productTitle: string; expiresAt: string | null; statusHref?: string;
}) {
  const [state, action, pending] = useActionState(async (previous: PurchaseOptionActionState, data: FormData): Promise<PurchaseOptionActionState> => {
    try { return await revivePurchaseOption(previous, data); }
    catch (error) {
      unstable_rethrow(error);
      return { status: "error", recovery: "check", message: "We couldn’t confirm whether this offer was revived. Check its saved status before trying again." };
    }
  }, initialState);
  const needsCheck = state.status === "error" && state.recovery === "check";
  const [reviewing, setReviewing] = useState(false);
  const [reading, setReading] = useState(false);
  const [declineEventId, setDeclineEventId] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState("");
  async function openReview() {
    if (reading) return;
    setReading(true);
    setReviewError("");
    try {
      const id = await readDeclineForRevival(optionId);
      if (!id) { setReviewError("We couldn’t verify this decline. Refresh and try again."); return; }
      setDeclineEventId(id);
      setReviewing(true);
    } catch { setReviewError("We couldn’t verify this decline. Refresh and try again."); }
    finally { setReading(false); }
  }
  const closeReview = useCallback(() => { if (!pending) setReviewing(false); }, [pending]);
  const confirmButton = useRef<HTMLButtonElement>(null);
  const expiryNotice = useRef<HTMLParagraphElement>(null);
  const restoreAfterExpiry = useRef(false);
  const [expired, setExpired] = useState<boolean | null>(null);
  const deadline = Date.parse(expiresAt ?? "");
  const hasDeadline = Number.isFinite(deadline);
  useEffect(() => {
    if (!hasDeadline) return;
    let timer: number | undefined;
    const checkDeadline = () => {
      const remaining = deadline - Date.now();
      if (remaining <= 0 && document.activeElement === confirmButton.current) restoreAfterExpiry.current = true;
      setExpired(!(remaining > 0));
      if (remaining > 0) timer = window.setTimeout(checkDeadline, Math.min(remaining, 60_000));
    };
    timer = window.setTimeout(checkDeadline, 0);
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [deadline, hasDeadline]);
  useEffect(() => {
    if (!expired || !reviewing || !restoreAfterExpiry.current) return;
    restoreAfterExpiry.current = false;
    const close = expiryNotice.current?.closest('[role="dialog"]')?.querySelector<HTMLButtonElement>('button[aria-label="Close revive confirmation"]');
    close?.focus();
  }, [expired, reviewing]);
  const disabled = !hasDeadline || expired !== false || pending || state.status === "succeeded" || needsCheck;
  const feedback = <>
    {state.status !== "idle" ? <span role="status" className={state.status === "error" ? "max-w-48 text-right text-xs font-semibold text-[#a93412]" : "max-w-48 text-right text-xs font-semibold text-[#12672e]"}>{state.message}</span> : null}
    {needsCheck ? <a href={statusHref} onClick={event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (event.currentTarget.pathname !== window.location.pathname) return;
      event.preventDefault();
      window.history.replaceState(window.history.state, "", statusHref);
      window.location.reload();
    }} className="text-right text-sm font-bold text-[#0069b3] underline">Check this offer →</a> : null}
  </>;
  return <div className={`${styles.declinedRevive} flex flex-col items-end gap-2`}>
    <button type="button" aria-haspopup="dialog" onClick={() => void openReview()} disabled={disabled || reading}
      className="min-h-11 min-w-24 rounded-lg bg-[#31e800] px-5 font-extrabold text-[#052515] disabled:cursor-not-allowed disabled:opacity-50">
      {!hasDeadline ? "Deadline unavailable" : expired === null || reading ? "Checking…" : expired ? "Expired" : pending ? "Reviving…" : "Revive"}
    </button>
    {reviewError ? <span role="alert" className={dialogStyles.message}>{reviewError}</span> : null}
    {reviewing ? <PurchaseDialog handleBrowserBack title="Revive this offer?" onClose={closeReview} closeDisabled={pending} closeLabel="Close revive confirmation" className={dialogStyles.dialog}>
      <p className="font-extrabold">{productTitle}</p>
      <p className="break-all text-sm font-bold">{ticketLabel}</p>
      <p className={dialogStyles.message}>This returns the offer to Purchase Options for free. Its original deadline stays the same.</p>
      {expired ? <p ref={expiryNotice} role="alert" className={dialogStyles.message}>This offer expired. It can no longer be revived.</p> : null}
      <form action={action} className={dialogStyles.actions}>
        <input type="hidden" name="completionOptionId" value={optionId} />
        <input type="hidden" name="declineEventId" value={declineEventId ?? ""} />
        <button type="button" onClick={closeReview} disabled={pending} className={dialogStyles.keep}>Cancel</button>
        <button ref={confirmButton} type="submit" disabled={disabled} className={`${dialogStyles.finish} disabled:opacity-50`}>
          {!hasDeadline ? "Deadline unavailable" : expired ? "Expired" : pending ? "Reviving…" : "Confirm revive"}
        </button>
      </form>
      {feedback}
    </PurchaseDialog> : feedback}
  </div>;
}
