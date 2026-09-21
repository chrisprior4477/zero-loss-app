"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { claimReward, type RewardClaimActionState } from "@/lib/account/lifecycle-actions";
import { DemoVerificationDialog } from "@/components/identity/DemoVerificationDialog";

const initialState: RewardClaimActionState = { status: "idle" };

export function RewardClaimControl({ rewardId }: { rewardId: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(claimReward, initialState);
  const [verificationOpen, setVerificationOpen] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const claimButton = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (state.status === "succeeded") router.refresh(); }, [router, state.status]);
  useEffect(() => {
    // The server, not the client, decides whether this claim needs verification.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state.status === "verification_required") setVerificationOpen(true);
  }, [state]);
  return <><form ref={form} action={action} className="mt-5 rounded-xl border border-[#00a31d]/25 bg-white/70 p-4 text-center">
    <input type="hidden" name="rewardId" value={rewardId} />
    <p className="text-sm font-bold text-[#173d5e]">Claim this retailer gift card to reveal its barcode and number.</p>
    <button ref={claimButton} type="submit" disabled={pending || state.status === "succeeded"} className="mt-4 min-h-12 w-full rounded-xl bg-[#31e800] px-4 text-base font-black text-[#062218] disabled:opacity-60">
      {pending ? "Claiming…" : state.status === "succeeded" ? "Reward claimed" : "Claim reward"}
    </button>
    {state.status !== "idle" ? <p role="status" className={`mt-3 text-xs font-bold ${state.status === "error" ? "text-[#a32900]" : "text-[#08721c]"}`}>{state.message}</p> : null}
  </form>{verificationOpen ? <DemoVerificationDialog rewardId={rewardId} onClose={() => { setVerificationOpen(false); claimButton.current?.focus(); }} onComplete={() => {
    setVerificationOpen(false);
    form.current?.requestSubmit();
  }} /> : null}</>;
}
