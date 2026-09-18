"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { declinePurchaseOption, purchaseGiftCard, type PurchaseOptionActionState } from "@/lib/account/lifecycle-actions";
import styles from "./showroom.module.css";

const initialState: PurchaseOptionActionState = { status: "idle" };

export function PurchaseOptionControls({ optionId }: { optionId: string }) {
  const router = useRouter();
  const [purchaseState, purchaseAction, purchasePending] = useActionState(purchaseGiftCard, initialState);
  const [declineState, declineAction, declinePending] = useActionState(declinePurchaseOption, initialState);
  const finished = purchaseState.status === "succeeded" || declineState.status === "succeeded";

  useEffect(() => {
    if (finished) router.refresh();
  }, [finished, router]);

  return <div className={styles.optionControls}>
    <form action={purchaseAction}>
      <input type="hidden" name="completionOptionId" value={optionId} />
      <button
        type="submit"
        disabled={purchasePending || declinePending || finished}
        onClick={event => {
          if (!window.confirm("Use your playable preview balance to buy this retailer gift card? The original entry amount is already applied.")) event.preventDefault();
        }}
      >{purchasePending ? "Completing…" : purchaseState.status === "succeeded" ? "Gift card ready" : "Complete gift-card purchase"}</button>
    </form>
    <form action={declineAction}>
      <input type="hidden" name="completionOptionId" value={optionId} />
      <button
        type="submit"
        disabled={purchasePending || declinePending || finished}
        onClick={event => {
          if (!window.confirm("Decline this purchase option? It will leave your active options and reminders will stop. Your original entry will not be refunded.")) event.preventDefault();
        }}
      >{declinePending ? "Declining…" : declineState.status === "succeeded" ? "Option declined" : "Decline option"}</button>
    </form>
    {purchaseState.status !== "idle" ? <p role="status" data-status={purchaseState.status}>{purchaseState.message}</p> : null}
    {declineState.status !== "idle" ? <p role="status" data-status={declineState.status}>{declineState.message}</p> : null}
  </div>;
}
