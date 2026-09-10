"use client";

import Link from "next/link";
import { useState } from "react";
import { PoolProgress } from "@/components/product/PoolProgress";

type Props = {
  entryPrice: number;
  sold: number;
  capacity: number;
};

export function DemoParticipationPanel({ entryPrice, sold, capacity }: Props) {
  const [quantity, setQuantity] = useState(1);
  const [messageVisible, setMessageVisible] = useState(false);
  const remaining = Math.max(0, capacity - sold);

  return (
    <aside className="rounded-3xl border border-cyan-300/30 bg-[#001b3d] p-5 shadow-[0_24px_70px_rgba(0,0,0,.24)] sm:p-7">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.13em] text-cyan-300">Entry price</p>
          <p className="mt-1 text-4xl font-extrabold">${entryPrice}</p>
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

      <div className="mt-7 flex items-center justify-between rounded-2xl bg-white/7 p-3">
        <div>
          <p className="text-xs text-white/60">Your entries</p>
          <p className="mt-0.5 font-bold">${(quantity * entryPrice).toFixed(2)} total</p>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="grid h-10 w-10 place-items-center rounded-full border border-white/20 text-xl" aria-label="Remove one entry">−</button>
          <span className="w-5 text-center font-mono font-bold">{quantity}</span>
          <button type="button" onClick={() => setQuantity((value) => Math.min(10, value + 1))} className="grid h-10 w-10 place-items-center rounded-full border border-white/20 text-xl" aria-label="Add one entry">+</button>
        </div>
      </div>

      <button type="button" onClick={() => setMessageVisible(true)} className="mt-4 w-full rounded-xl bg-[#00b9ff] px-5 py-3.5 text-base font-extrabold text-[#00132e] transition hover:bg-cyan-200">
        Enter for ${(quantity * entryPrice).toFixed(2)}
      </button>

      <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 px-4 py-3 text-sm">
        <span><span className="text-white/60">Playable Balance</span> <strong className="ml-2">$24.00</strong></span>
        <Link href="/account/wallet" className="font-bold text-cyan-300 hover:text-cyan-100">Add funds</Link>
      </div>

      <div className="mt-5 rounded-xl border border-[#31e800]/30 bg-[#31e800]/8 p-4 text-sm leading-6 text-white/85">
        <strong className="text-[#67ff42]">Your $1 still counts.</strong> If you aren&apos;t selected, the amount paid for this entry remains attached to this exact offering as a completion option, subject to the published terms.
      </div>

      {messageVisible && (
        <div role="status" className="mt-4 rounded-xl border border-cyan-300/40 bg-[#0b3158] p-4 text-sm leading-6">
          <strong>Investor demo only.</strong> The full entry checkout and outcome walkthrough will be connected in the MVP vertical slice.
          <button type="button" onClick={() => setMessageVisible(false)} className="ml-2 font-bold text-cyan-300">Dismiss</button>
        </div>
      )}
      <p className="mt-4 text-center text-[11px] leading-5 text-white/45">Demo marketplace data. No entry, payment, or inventory reservation is created.</p>
    </aside>
  );
}
