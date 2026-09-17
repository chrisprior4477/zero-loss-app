"use client";

import { useState } from "react";

type RewardRedemptionActionsProps = {
  displayCode: string | null;
  isPreview: boolean;
  appleWalletUrl?: string | null;
  googleWalletUrl?: string | null;
};

export function RewardRedemptionActions({
  displayCode,
  isPreview,
  appleWalletUrl = null,
  googleWalletUrl = null,
}: RewardRedemptionActionsProps) {
  const [message, setMessage] = useState("");

  async function copyCode() {
    if (!displayCode) return;
    try {
      await navigator.clipboard.writeText(displayCode.replaceAll(" ", ""));
      setMessage(isPreview ? "Sample number copied." : "Reward number copied.");
    } catch {
      setMessage("Copy is unavailable in this browser. Press and hold the number instead.");
    }
  }

  return <>
    <div className="mt-4 grid gap-3">
      <button
        type="button"
        onClick={copyCode}
        disabled={!displayCode}
        className="flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-[#1878d5] bg-white px-4 text-sm font-black text-[#061630] transition hover:bg-[#edf9ff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00b9ff] disabled:cursor-not-allowed disabled:opacity-45"
      >
        <span aria-hidden="true" className="text-lg">▣</span>
        Copy number
      </button>
      <button
        type="button"
        onClick={() => setMessage(isPreview ? "This is a sample barcode and cannot be used at checkout." : "A redeemable barcode has not been issued yet.")}
        disabled={!displayCode}
        className="flex min-h-14 items-center justify-center gap-3 rounded-xl bg-[#31e800] px-4 text-base font-black text-[#062218] shadow-[0_8px_28px_rgba(49,232,0,.25)] transition hover:bg-[#65f33d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-45"
      >
        <span aria-hidden="true" className="text-xl">▱</span>
        Present in store
      </button>
    </div>

    {message ? <p role="status" className="mt-3 text-center text-xs font-bold text-[#173d5e]">{message}</p> : null}

    <section aria-labelledby="mobile-wallet-heading" className="mt-5 border-t border-[#0d5688]/20 pt-5">
      <h3 id="mobile-wallet-heading" className="text-center text-xs font-black uppercase tracking-[0.18em] text-[#31536d]">Save for faster checkout</h3>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {appleWalletUrl ? <a href={appleWalletUrl} className="flex min-h-12 items-center justify-center rounded-xl bg-black px-4 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00b9ff]">Add to Apple Wallet</a> : <button type="button" disabled className="flex min-h-12 cursor-not-allowed items-center justify-center rounded-xl bg-black px-4 text-sm font-bold text-white opacity-70">Add to Apple Wallet</button>}
        {googleWalletUrl ? <a href={googleWalletUrl} className="flex min-h-12 items-center justify-center rounded-xl border border-[#d7e1e8] bg-white px-4 text-sm font-bold text-[#182435] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00b9ff]">Save to Google Wallet</a> : <button type="button" disabled className="flex min-h-12 cursor-not-allowed items-center justify-center rounded-xl border border-[#d7e1e8] bg-white px-4 text-sm font-bold text-[#182435] opacity-70">Save to Google Wallet</button>}
      </div>
      {!appleWalletUrl && !googleWalletUrl ? <p className="mt-2 text-center text-[11px] leading-4 text-[#4a667c]">Wallet passes are not connected in this preview yet.</p> : null}
    </section>
  </>;
}
