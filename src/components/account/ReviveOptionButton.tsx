"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { unstable_rethrow } from "next/navigation";
import { revivePurchaseOption, type PurchaseOptionActionState } from "@/lib/account/lifecycle-actions";
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
  const closeReview = useCallback(() => { if (!pending) setReviewing(false); }, [pending]);
  const [expired, setExpired] = useState<boolean | null>(null);
  useEffect(() => {
    const deadline = expiresAt ? new Date(expiresAt).getTime() : 0;
    let timer: number | undefined;
    const checkDeadline = () => {
      const remaining = deadline - Date.now();
      setExpired(!(remaining > 0));
      if (remaining > 0) timer = window.setTimeout(checkDeadline, Math.min(remaining, 60_000));
    };
    timer = window.setTimeout(checkDeadline, 0);
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [expiresAt]);
  const disabled = expired !== false || pending || state.status === "succeeded" || needsCheck;
  const feedback = <>
    {state.status !== "idle" ? <span role="status" className={state.status === "error" ? "max-w-48 text-right text-xs font-semibold text-[#a93412]" : "max-w-48 text-right text-xs font-semibold text-[#12672e]"}>{state.message}</span> : null}
    {needsCheck ? <a href={statusHref} className="text-right text-sm font-bold text-[#0069b3] underline">Check this offer →</a> : null}
  </>;
  return <div className={`${styles.declinedRevive} flex flex-col items-end gap-2`}>
    <button type="button" aria-haspopup="dialog" onClick={() => setReviewing(true)} disabled={disabled}
      className="min-h-11 min-w-24 rounded-lg bg-[#31e800] px-5 font-extrabold text-[#052515] disabled:cursor-not-allowed disabled:opacity-50">
      {expired === null ? "Checking…" : expired ? "Expired" : pending ? "Reviving…" : "Revive"}
    </button>
    {reviewing ? <PurchaseDialog title="Revive this offer?" onClose={closeReview} closeDisabled={pending} closeLabel="Close revive confirmation" className={dialogStyles.dialog}>
      <p className="font-extrabold">{productTitle}</p>
      <p className="break-all text-sm font-bold">{ticketLabel}</p>
      <p className={dialogStyles.message}>This returns the offer to Purchase Options for free. Its original deadline stays the same.</p>
      <form action={action} className={dialogStyles.actions}>
        <input type="hidden" name="completionOptionId" value={optionId} />
        <button type="button" onClick={closeReview} disabled={pending} className={dialogStyles.keep}>Cancel</button>
        <button type="submit" disabled={disabled} className={`${dialogStyles.finish} disabled:opacity-50`}>
          {expired ? "Expired" : pending ? "Reviving…" : "Confirm revive"}
        </button>
      </form>
      {feedback}
    </PurchaseDialog> : feedback}
  </div>;
}
