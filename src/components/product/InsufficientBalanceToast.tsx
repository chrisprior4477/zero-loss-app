"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import popupStyles from "@/components/layout/responsive-popup.module.css";
import { InsufficientFundsNotice } from "@/components/wallet/InsufficientFundsNotice";

type Props = {
  quantity: number;
  totalCents: number;
  balanceCents: number | null;
  fundingHref: string;
  onAddFunds?: () => void;
  onClose: () => void;
};

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export function InsufficientBalanceToast({ quantity, totalCents, balanceCents, fundingHref, onAddFunds, onClose }: Props) {
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
    <section aria-label="Insufficient playable balance" className={`${popupStyles.notice} ${popupStyles.balanceNotice} fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-[220] mx-auto max-h-[calc(100dvh-24px)] max-w-lg overflow-y-auto rounded-2xl border border-cyan-300/60 bg-[#001b3d] p-5 text-white shadow-[0_16px_60px_#0009,0_0_25px_#00b9ff26] sm:bottom-6 sm:p-6`}>
      <button type="button" onClick={onClose} aria-label="Dismiss balance notice" className="absolute right-2 top-2 grid h-11 w-11 place-items-center rounded-full text-2xl text-cyan-200 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-cyan-300">×</button>
      <div className="mt-7">
      <InsufficientFundsNotice href={fundingHref} onAddFunds={onAddFunds} linkRef={fundingLink}>
        <p>
          {balanceCents !== null
            ? <>Your {quantity === 1 ? "entry costs" : `${quantity} entries cost`} <strong>{money(totalCents)}</strong>. You have <strong>{money(balanceCents)}</strong>—add <strong>{money(Math.max(0, totalCents - balanceCents))}</strong> more to continue.</>
            : <>Your balance no longer covers {quantity === 1 ? "this entry" : "these entries"}. Open Add funds to see your latest balance and top up.</>}
        </p>
        <p>No entries were placed. You’ll return to this prize to confirm.</p>
      </InsufficientFundsNotice>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={onClose} className="min-h-12 w-full rounded-xl border border-cyan-300/40 px-5 font-bold text-cyan-200 hover:bg-cyan-300/10 sm:w-auto sm:flex-1">Keep browsing</button>
      </div>
    </section>, document.body,
  );
}
