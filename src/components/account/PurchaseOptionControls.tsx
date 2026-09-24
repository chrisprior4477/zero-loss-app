"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { declinePurchaseOption, purchaseGiftCard, type PurchaseOptionActionState } from "@/lib/account/lifecycle-actions";
import { activityHref, type ActivityItem } from "@/lib/account/activity";
import { fundingHref } from "@/lib/wallet/funding-navigation";
import { formatUsdFromCents } from "@/lib/wallet/money";
import styles from "./showroom.module.css";

const initialState: PurchaseOptionActionState = { status: "idle" };

export function PurchaseOptionControls({ item }: { item: ActivityItem & { completionOptionId: string } }) {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState<"purchase" | "decline" | null>(null);
  const inFlight = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const purchaseRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const [state, action, pending] = useActionState(async (_previous: PurchaseOptionActionState, form: FormData): Promise<PurchaseOptionActionState> => {
    try {
      return await (form.get("intent") === "decline" ? declinePurchaseOption : purchaseGiftCard)(initialState, form);
    } catch {
      // Also catches a dropped browser-to-server response, not just RPC errors.
      return { status: "error", recovery: "check", message: "The connection was interrupted. Check purchase status before trying again; your last action may already be saved." };
    } finally { inFlight.current = false; }
  }, initialState);
  const finished = state.status === "succeeded";
  const needsCheck = state.status === "error" && state.recovery === "check";

  useEffect(() => {
    if (state.status === "succeeded") {
      if (state.href) router.replace(state.href);
      else router.refresh();
    }
  }, [state, router]);
  useEffect(() => { if (confirmation) headingRef.current?.focus(); }, [confirmation]);

  function cancel() {
    if (pending || inFlight.current) return;
    setConfirmation(null);
    requestAnimationFrame(() => purchaseRef.current?.focus());
  }

  return <div className={styles.optionControls} onKeyDown={event => {
    if (event.key === "Escape" && confirmation && !pending && !needsCheck) {
      event.preventDefault(); event.stopPropagation(); cancel();
    }
  }}>
    {!confirmation ? <>
      <button ref={purchaseRef} type="button" data-primary="true" disabled={pending || finished || needsCheck} onClick={() => setConfirmation("purchase")}>Complete gift-card purchase</button>
      <button type="button" disabled={pending || finished || needsCheck} onClick={() => setConfirmation("decline")}>Decline option</button>
    </> : <section aria-labelledby={titleId}>
      <h3 id={titleId} ref={headingRef} tabIndex={-1}>{confirmation === "purchase" ? "Confirm your purchase" : "Decline this option?"}</h3>
      {confirmation === "purchase" ? <>
        <p>{formatUsdFromCents(item.priceCents)} {item.retailer} gift card</p>
        <p>{formatUsdFromCents(item.paidCents)} already applied · <strong>{formatUsdFromCents(item.remainingCents)} from your playable wallet</strong></p>
        <p>For {item.title}. Sample — not redeemable. No real payment or product shipment.</p>
      </> : <p>This option will leave your active options and its reminders will stop. Your original entry will not be refunded.</p>}
      <form action={action} onSubmit={event => {
        if (inFlight.current || finished || needsCheck) { event.preventDefault(); return; }
        inFlight.current = true;
      }}>
        <input type="hidden" name="completionOptionId" value={item.completionOptionId} />
        <input type="hidden" name="intent" value={confirmation} />
        <button type="submit" data-primary={confirmation === "purchase"} disabled={pending || finished || needsCheck}>
          {pending ? "Saving…" : finished ? "Saved" : confirmation === "purchase" ? `Confirm ${formatUsdFromCents(item.remainingCents)} purchase` : "Confirm decline"}
        </button>
      </form>
      <button type="button" disabled={pending || finished || needsCheck} onClick={cancel}>Cancel</button>
    </section>}
    {state.status !== "idle" ? <p role="status" data-status={state.status}>{state.message}</p> : null}
    {needsCheck ? <a href={activityHref(item)}>Check purchase status →</a> : null}
    {state.status === "error" && state.recovery === "balance" ? <Link href={fundingHref(item.slug, item.entryId ?? undefined)}>Add funds →</Link> : null}
    {state.status === "succeeded" && state.href ? <Link href={state.href}>Open your gift card or receipt →</Link> : null}
  </div>;
}
