"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { claimReward, type PurchaseOptionActionState } from "@/lib/account/lifecycle-actions";

const initialState: PurchaseOptionActionState = { status: "idle" };

export function RewardClaimControl({ rewardId }: { rewardId: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(claimReward, initialState);
  useEffect(() => { if (state.status === "succeeded") router.refresh(); }, [router, state.status]);
  return <form action={action} className="mt-5 rounded-xl border border-[#00a31d]/25 bg-white/70 p-4 text-center">
    <input type="hidden" name="rewardId" value={rewardId} />
    <p className="text-sm font-bold text-[#173d5e]">Claim this retailer gift card to reveal its barcode and number.</p>
    <button type="submit" disabled={pending || state.status === "succeeded"} className="mt-4 min-h-12 w-full rounded-xl bg-[#31e800] px-4 text-base font-black text-[#062218] disabled:opacity-60">
      {pending ? "Claiming…" : state.status === "succeeded" ? "Reward claimed" : "Claim reward"}
    </button>
    {state.status !== "idle" ? <p role="status" className={`mt-3 text-xs font-bold ${state.status === "error" ? "text-[#a32900]" : "text-[#08721c]"}`}>{state.message}</p> : null}
  </form>;
}
