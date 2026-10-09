"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { revivePurchaseOption, type PurchaseOptionActionState } from "@/lib/account/lifecycle-actions";

const initialState: PurchaseOptionActionState = { status: "idle" };

export function ReviveOptionButton({ optionId, expiresAt }: { optionId: string; expiresAt: string | null }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(revivePurchaseOption, initialState);
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
  useEffect(() => {
    if (state.status === "succeeded" && state.href) router.replace(state.href);
  }, [router, state]);
  return <form action={action} className="flex flex-col items-end gap-2">
    <input type="hidden" name="completionOptionId" value={optionId} />
    <button type="submit" disabled={expired !== false || pending || state.status === "succeeded"} className="min-h-11 min-w-24 rounded-lg bg-[#31e800] px-5 font-extrabold text-[#052515] disabled:cursor-not-allowed disabled:opacity-50">{expired === null ? "Checking…" : expired ? "Expired" : pending ? "Reviving…" : "Revive"}</button>
    {state.status !== "idle" ? <span role="status" className={state.status === "error" ? "max-w-48 text-right text-xs font-semibold text-[#a93412]" : "max-w-48 text-right text-xs font-semibold text-[#12672e]"}>{state.message}</span> : null}
  </form>;
}
