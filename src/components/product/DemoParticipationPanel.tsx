"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { PoolProgress } from "@/components/product/PoolProgress";
import { walletHistoryHref } from "@/lib/account/activity";
import { createPreviewEntry } from "@/lib/entries/actions";

type Props = {
  productSlug: string;
  requestKey: string;
  productTitle: string;
  retailer: string;
  productValue: number;
  entryPrice: number;
  sold: number;
  capacity: number;
  balanceLabel?: string;
  isDemoWallet?: boolean;
  isSignedIn?: boolean;
};

export function DemoParticipationPanel({
  productSlug,
  requestKey,
  productTitle,
  retailer,
  productValue,
  entryPrice,
  sold,
  capacity,
  balanceLabel = "Unavailable",
  isDemoWallet = false,
  isSignedIn = false,
}: Props) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createPreviewEntry, { status: "idle" });
  const remaining = Math.max(0, capacity - sold);
  const remainingBalance = Math.max(0, productValue - entryPrice);

  useEffect(() => {
    if (state.status !== "succeeded") return;
    const timer = window.setTimeout(() => router.push(state.href), 350);
    return () => window.clearTimeout(timer);
  }, [router, state]);

  return (
    <aside id="enter-entry" className="scroll-mt-32 rounded-3xl border border-cyan-300/30 bg-[#001b3d] p-5 shadow-[0_24px_70px_rgba(0,0,0,.24)] sm:p-7">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.13em] text-cyan-300">Entry price</p>
          <p className="mt-1 text-4xl font-extrabold">${entryPrice.toFixed(2)}</p>
        </div>
        <span className="rounded-full bg-[#ff630f] px-3 py-1.5 text-xs font-extrabold text-black">Ending soon</span>
      </div>

      <div className="mt-8">
        <PoolProgress ticketsSold={sold} ticketCapacity={capacity} />
        <div className="mt-3 flex justify-between text-xs text-white/65">
          <span>{sold.toLocaleString()} entries</span>
          <span>{remaining.toLocaleString()} remaining</span>
        </div>
      </div>

      <div className="mt-7 rounded-2xl bg-white/7 p-3">
        <p className="text-xs text-white/60">This entry</p>
        <div className="mt-0.5 flex items-center justify-between gap-3">
          <p className="font-bold">1 independent entry</p>
          <p className="font-mono font-bold">${entryPrice.toFixed(2)}</p>
        </div>
      </div>

      {isSignedIn ? (
        <form action={action}>
          <input type="hidden" name="offeringSlug" value={productSlug} />
          <input type="hidden" name="idempotencyKey" value={requestKey} />
          <button type="submit" disabled={pending || state.status === "succeeded"} className="mt-4 w-full rounded-xl bg-[#00b9ff] px-5 py-3.5 text-base font-extrabold text-[#00132e] transition hover:bg-cyan-200 disabled:cursor-wait disabled:opacity-60">
            {pending ? "Confirming entry…" : state.status === "succeeded" ? "Entry confirmed" : `Enter for $${entryPrice.toFixed(2)}`}
          </button>
        </form>
      ) : (
        <Link href="/login" className="mt-4 grid w-full place-items-center rounded-xl bg-[#00b9ff] px-5 py-3.5 text-base font-extrabold text-[#00132e] transition hover:bg-cyan-200">
          Sign in to enter
        </Link>
      )}

      <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 px-4 py-3 text-sm">
        <span><span className="text-white/60">{isDemoWallet ? "Demo Playable Balance" : "Playable Balance"}</span> <strong className="ml-2" data-testid="product-wallet-balance">{balanceLabel}</strong></span>
        <Link href={walletHistoryHref} className="font-bold text-cyan-300 hover:text-cyan-100">Add funds</Link>
      </div>

      <div className="mt-5 rounded-xl border border-[#31e800]/30 bg-[#31e800]/8 p-4 text-sm leading-6 text-white/85">
        <strong className="text-[#67ff42]">Your entry stays attached to this product.</strong> If it is not selected, the ${entryPrice.toFixed(2)} paid remains recorded on this exact {retailer} offering and leaves ${remainingBalance.toFixed(2)} to complete it.
      </div>

      {state.status !== "idle" ? (
        <div role="status" className={`mt-4 rounded-xl border p-4 text-sm leading-6 ${state.status === "error" ? "border-[#ff796c]/50 bg-[#4b1c25]" : "border-[#31e800]/40 bg-[#0b412b]"}`}>
          <strong>{state.message}</strong>
          {state.status === "succeeded" ? <span className="block text-white/65">Opening the stored result for {productTitle}…</span> : null}
        </div>
      ) : null}

      <p className="mt-4 text-center text-[11px] leading-5 text-white/45">Preview-only activity. The debit, entry and result are written atomically to the development/test database. No real reward is issued.</p>
    </aside>
  );
}
