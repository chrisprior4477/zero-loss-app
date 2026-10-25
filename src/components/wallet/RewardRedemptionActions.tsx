"use client";

import Link from "next/link";
import Image from "next/image";
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
  const walletButton = "flex min-h-12 min-w-0 items-center justify-center gap-1 rounded-xl px-2 text-[11px] font-bold min-[380px]:text-xs sm:text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00b9ff] disabled:cursor-not-allowed";
  const appleLabel = <><span>Add to</span><Image src="/brands/apple-mark.svg" width={16} height={19} alt="" aria-hidden="true" /><span>Wallet</span></>;
  const googleLabel = <><span>Add to</span><Image src="/brands/google-g.png" width={18} height={18} alt="" aria-hidden="true" /><span>Wallet</span></>;

  return <>
    <div className="mt-4 grid max-[700px]:mt-3">
      <button
        type="button"
        onClick={copyCode}
        disabled={!displayCode}
        className="flex min-h-11 items-center justify-center gap-2 rounded-lg border-2 border-[#1878d5] bg-white px-4 text-sm font-black text-[#061630] transition hover:bg-[#edf9ff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00b9ff] disabled:cursor-not-allowed disabled:opacity-45"
      >
        <span aria-hidden="true" className="text-lg">▣</span>
        Copy number
      </button>
    </div>

    {message ? <p role="status" className="mt-3 text-center text-xs font-bold text-[#173d5e]">{message}</p> : null}

    <section aria-labelledby="mobile-wallet-heading" className="mt-4 border-t border-[#0d5688]/20 pt-4 max-[700px]:mt-3 max-[700px]:pt-3">
      <h3 id="mobile-wallet-heading" className="text-center text-[10px] font-black uppercase tracking-[0.16em] text-[#31536d]">Save for faster checkout</h3>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {appleWalletUrl ? <a href={appleWalletUrl} aria-label="Add to Apple Wallet" className={`${walletButton} bg-black text-white`}>{appleLabel}</a> : <button type="button" disabled aria-label="Add to Apple Wallet" className={`${walletButton} bg-[#494949] text-white`}>{appleLabel}</button>}
        {googleWalletUrl ? <a href={googleWalletUrl} aria-label="Add to Google Wallet" className={`${walletButton} border border-[#d7e1e8] bg-white text-[#182435]`}>{googleLabel}</a> : <button type="button" disabled aria-label="Add to Google Wallet" className={`${walletButton} border border-[#d7e1e8] bg-white text-[#526171]`}>{googleLabel}</button>}
      </div>
      <Link href="/" className="mt-3 flex min-h-12 w-full items-center justify-center rounded-xl bg-[#31e800] px-4 py-3 text-sm font-black text-[#061630] transition hover:bg-[#65f33d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00b9ff] max-[700px]:mt-2">Continue Shopping</Link>
      {!appleWalletUrl && !googleWalletUrl ? <p className="mt-4 text-center text-[11px] leading-4 text-[#4a667c]">Wallet passes are not connected in this preview yet.</p> : null}
    </section>
  </>;
}
