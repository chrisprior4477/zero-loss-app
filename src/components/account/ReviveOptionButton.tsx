"use client";

import { useActionState, useEffect, useState } from "react";
import { unstable_rethrow } from "next/navigation";
import { revivePurchaseOption, type PurchaseOptionActionState } from "@/lib/account/lifecycle-actions";

const initialState: PurchaseOptionActionState = { status: "idle" };

export function ReviveOptionButton({ optionId, expiresAt, statusHref = "/account/entries?filter=completion" }: { optionId: string; expiresAt: string | null; statusHref?: string }) {
  const [state, action, pending] = useActionState(async (previous: PurchaseOptionActionState, data: FormData): Promise<PurchaseOptionActionState> => {
    try { return await revivePurchaseOption(previous, data); }
    catch (error) {
      unstable_rethrow(error);
      return { status: "error", recovery: "check", message: "We couldn’t confirm whether this offer was revived. Check its saved status before trying again." };
    }
  }, initialState);
  const needsCheck = state.status === "error" && state.recovery === "check";
  const [expired, setExpired] = useState<boolean | null>(null);
  useEffect(() => {
    const deadline = expiresAt ? new Date(expiresAt).getTime() : 0;
    let timer: number | undefined;
    const checkDeadline = () => {
      const remaining = deadline - Date.now();
      setExpired(remaining <= 0);
      if (remaining > 0) timer = window.setTimeout(checkDeadline, Math.min(remaining, 60_000));
    };
    timer = window.setTimeout(checkDeadline, 0);
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [expiresAt]);
  return <form action={action} className="flex flex-col items-end gap-2">
    <input type="hidden" name="completionOptionId" value={optionId} />
    <button type="submit" disabled={expired !== false || pending || state.status === "succeeded" || needsCheck} className="min-h-11 min-w-24 rounded-lg bg-[#31e800] px-5 font-extrabold text-[#052515] disabled:cursor-not-allowed disabled:opacity-50">{expired === null ? "Checking…" : expired ? "Expired" : pending ? "Reviving…" : "Revive"}</button>
    {state.status !== "idle" ? <span role="status" className={state.status === "error" ? "max-w-48 text-right text-xs font-semibold text-[#a93412]" : "max-w-48 text-right text-xs font-semibold text-[#12672e]"}>{state.message}</span> : null}
    {needsCheck ? <a href={statusHref} className="text-right text-sm font-bold text-[#0069b3] underline">Check this offer →</a> : null}
  </form>;
}
