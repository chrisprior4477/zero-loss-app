"use client";

import Link from "next/link";
import { useState } from "react";
import { PoolProgress } from "@/components/product/PoolProgress";

type Props = {
  productTitle: string;
  retailer: string;
  productValue: number;
  entryPrice: number;
  sold: number;
  capacity: number;
};

export function DemoParticipationPanel({ productTitle, retailer, productValue, entryPrice, sold, capacity }: Props) {
  const [quantity, setQuantity] = useState(1);
  const [messageVisible, setMessageVisible] = useState(false);
  const [additionalEntryNoticeOpen, setAdditionalEntryNoticeOpen] = useState(false);
  const [additionalEntryTermsSeen, setAdditionalEntryTermsSeen] = useState(false);
  const remaining = Math.max(0, capacity - sold);
  const remainingBalance = Math.max(0, productValue - entryPrice);

  const requestAdditionalEntry = () => {
    if (!additionalEntryTermsSeen) {
      setAdditionalEntryNoticeOpen(true);
      return;
    }
    setQuantity((value) => Math.min(10, value + 1));
  };

  const acknowledgeAndAddEntry = () => {
    setAdditionalEntryTermsSeen(true);
    setQuantity((value) => Math.min(10, value + 1));
    setAdditionalEntryNoticeOpen(false);
  };

  return (
    <aside id="enter-entry" className="scroll-mt-32 rounded-3xl border border-cyan-300/30 bg-[#001b3d] p-5 shadow-[0_24px_70px_rgba(0,0,0,.24)] sm:p-7">
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
          <button type="button" onClick={requestAdditionalEntry} className="grid h-10 w-10 place-items-center rounded-full border border-white/20 text-xl" aria-label="Add one entry">+</button>
        </div>
      </div>
      <p className="mt-2 text-[11px] leading-5 text-white/55">Each entry is separate. Entry amounts and completion options never combine.</p>

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

      {additionalEntryNoticeOpen && (
        <div className="fixed inset-0 z-[100] grid place-items-end bg-[#000914]/75 p-3 backdrop-blur-sm sm:place-items-center" role="presentation" onMouseDown={(event) => {
          if (event.currentTarget === event.target) setAdditionalEntryNoticeOpen(false);
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="additional-entry-title" className="max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-cyan-300/40 bg-[#001b3d] p-5 text-left shadow-[0_28px_90px_rgba(0,0,0,.55)] sm:p-7">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-cyan-300">Before you add another entry</p>
            <h2 id="additional-entry-title" className="mt-2 text-2xl font-extrabold">Every entry stands on its own.</h2>
            <ol className="mt-5 space-y-3 text-sm leading-6 text-white/80">
              <li><strong className="text-white">1. Another entry means another independent chance.</strong> Each entry receives the same chance of selection, subject to the published pool rules.</li>
              <li><strong className="text-white">2. Non-selected entries do not become wallet cash.</strong> Each qualifying non-selected entry creates its own option to complete this exact offering.</li>
              <li><strong className="text-white">3. The options cannot be stacked.</strong> Entry payments and completion options cannot be combined with one another or with Playable Balance.</li>
              <li><strong className="text-white">4. Each option requires its own remaining payment.</strong> For this ${productValue.toLocaleString()} {retailer} offering, one ${entryPrice.toFixed(2)} entry would leave ${remainingBalance.toFixed(2)} to complete one purchase.</li>
              <li><strong className="text-white">5. The option stays with this entry and retailer.</strong> It cannot move to a different product, retailer, account, entry, or cash withdrawal.</li>
            </ol>
            <div className="mt-5 rounded-2xl border border-[#31e800]/30 bg-[#31e800]/8 p-4 text-sm leading-6">
              <strong className="text-[#67ff42]">Example with three entries:</strong> You receive three separate chances for {productTitle}. If none is selected, you may receive three separate completion options—not a combined $3 credit. Completing all three ${productValue.toLocaleString()} purchases would produce ${(
                productValue * 3
              ).toLocaleString()} in total retailer value and require three separate payments of ${remainingBalance.toFixed(2)} (${(
                remainingBalance * 3
              ).toFixed(2)} total remaining payment).
            </div>
            <p className="mt-4 text-xs leading-5 text-white/55">Founder-approved prototype wording; eligibility, free-entry method, entry limits, expiration, and final legal terms remain governed by the official rules.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => setAdditionalEntryNoticeOpen(false)} className="rounded-xl border border-white/20 px-4 py-3 font-bold text-white hover:bg-white/8">Keep one entry</button>
              <button type="button" onClick={acknowledgeAndAddEntry} className="rounded-xl bg-[#00b9ff] px-4 py-3 font-extrabold text-[#00132e] hover:bg-cyan-200">I understand — add entry</button>
            </div>
            <Link href="/account/preview/official-rules" className="mt-4 block text-center text-sm font-bold text-cyan-300 hover:text-white">View official rules &amp; free-entry information →</Link>
          </section>
        </div>
      )}
      <p className="mt-4 text-center text-[11px] leading-5 text-white/45">Demo marketplace data. No entry, payment, or inventory reservation is created.</p>
    </aside>
  );
}
