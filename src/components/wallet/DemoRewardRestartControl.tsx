"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { restartPreviewReward } from "@/lib/account/lifecycle-actions";

export function DemoRewardRestartControl({ rewardId }: { rewardId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState(restartPreviewReward, { status: "idle" });

  useEffect(() => {
    if (state.status === "succeeded" && state.href) router.push(state.href);
  }, [router, state]);

  return <section className="mt-3" aria-label="Demo reward restart">
    {!confirming ? <button type="button" onClick={() => setConfirming(true)} className="flex min-h-11 w-full items-center justify-center rounded-lg bg-[#ff7417] px-3 py-2.5 text-center text-xs font-extrabold text-[#17213b] transition hover:bg-[#ff934f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087feb] sm:text-sm">
      Remove sample reward &amp; restart demo
    </button> : <div className="rounded-xl border border-[#ff7417]/70 bg-[#fff4e9] p-3 text-[#17213b]">
      <p className="text-xs leading-5">This hides the sample reward from your demo view. Your original entry, purchase, and wallet history stay saved.</p>
      <form action={action} className="mt-3 flex flex-wrap gap-2">
        <input type="hidden" name="rewardId" value={rewardId} />
        <button type="submit" disabled={pending || state.status === "succeeded"} className="min-h-11 flex-1 rounded-lg bg-[#ff7417] px-3 text-xs font-extrabold text-[#17213b] disabled:opacity-55">{pending ? "Restarting…" : "Remove & restart demo"}</button>
        <button type="button" onClick={() => setConfirming(false)} disabled={pending} className="min-h-11 rounded-lg border border-[#17213b]/30 px-3 text-xs font-bold disabled:opacity-55">Keep reward</button>
      </form>
    </div>}
    {state.status !== "idle" ? <p role="status" className="mt-2 text-xs font-bold text-[#173d5e]">{state.message}</p> : null}
  </section>;
}
