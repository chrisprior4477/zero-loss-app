"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

type Props = {
  quantity: number;
  totalCents: number;
  balanceCents: number | null;
  fundingHref: string;
  onClose: () => void;
};

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export function InsufficientBalanceToast({ quantity, totalCents, balanceCents, fundingHref, onClose }: Props) {
  const fundingLink = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    fundingLink.current?.focus({ preventScroll: true });
    return () => {
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", dismiss);
    return () => document.removeEventListener("keydown", dismiss);
  }, [onClose]);

  return createPortal(
    <section aria-label="Insufficient playable balance" className="fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-[220] mx-auto max-h-[calc(100dvh-24px)] max-w-lg overflow-y-auto rounded-2xl border border-cyan-300/60 bg-[#001b3d] p-5 text-white shadow-[0_16px_60px_#0009,0_0_25px_#00b9ff26] sm:bottom-6 sm:p-6">
      <button type="button" onClick={onClose} aria-label="Dismiss balance notice" className="absolute right-2 top-2 grid h-11 w-11 place-items-center rounded-full text-2xl text-cyan-200 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-cyan-300">×</button>
      <div role="status" aria-live="polite" aria-atomic="true" className="pr-7">
        <p className="text-xs font-extrabold uppercase tracking-[.14em] text-[#ff8a45]">Playable balance</p>
        <h2 className="mt-2 text-2xl font-extrabold">A little more to enter</h2>
        <p className="mt-3 text-sm leading-6 text-white/80">
          {balanceCents !== null
            ? <>Your {quantity === 1 ? "entry costs" : `${quantity} entries cost`} <strong className="text-white">{money(totalCents)}</strong>. You have <strong className="text-white">{money(balanceCents)}</strong>—add <strong className="text-cyan-200">{money(Math.max(0, totalCents - balanceCents))}</strong> more to continue.</>
            : <>Your balance no longer covers {quantity === 1 ? "this entry" : "these entries"}. Open Add funds to see your latest balance and top up.</>}
        </p>
        <p className="mt-2 text-xs leading-5 text-white/60">No entries were placed. You’ll return to this prize to confirm.</p>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link ref={fundingLink} href={fundingHref} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#31e800] px-5 font-extrabold text-[#00132e] hover:bg-[#67ff42] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-200">Add funds <span aria-hidden="true">→</span></Link>
        <button type="button" onClick={onClose} className="min-h-12 flex-1 rounded-xl border border-cyan-300/40 px-5 font-bold text-cyan-200 hover:bg-cyan-300/10">Keep browsing</button>
      </div>
    </section>, document.body,
  );
}
