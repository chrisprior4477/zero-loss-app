"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { BusinessOnboardingForm } from "@/components/auth/BusinessOnboardingForm";

type AccountPath = "pleasure" | "business";

export function SignUpExperience({ initialAccountPath = "pleasure" }: { initialAccountPath?: AccountPath }) {
  const [accountPath, setAccountPath] = useState<AccountPath>(initialAccountPath);
  const setupRef = useRef<HTMLDivElement>(null);
  const isPleasure = accountPath === "pleasure";

  function chooseAccountPath(nextPath: AccountPath) {
    flushSync(() => setAccountPath(nextPath));
    setupRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    const firstField = setupRef.current?.querySelector<HTMLInputElement>(
      nextPath === "business" ? "#business_name" : "#legal_first_name",
    );
    firstField?.focus({ preventScroll: true });
  }

  return (
    <>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff8a45]">What brings you to Zero Loss?</p>
      <div className="mt-3 grid grid-cols-2 gap-3" role="group" aria-label="Choose account type">
        <button type="button" aria-pressed={isPleasure} onClick={() => chooseAccountPath("pleasure")} className={`min-h-[76px] rounded-2xl border px-3 py-3 text-left transition ${isPleasure ? "border-[#31e800] bg-[#31e800]/12" : "border-white/12 bg-white/5 hover:border-white/25"}`}>
          <strong className={`block text-base font-black ${isPleasure ? "text-[#72ff4e]" : "text-white"}`}>For personal use</strong>
          <span className="mt-1 block text-xs leading-4 text-white/50">Enter and explore</span>
        </button>
        <button type="button" aria-pressed={!isPleasure} onClick={() => chooseAccountPath("business")} className={`min-h-[76px] rounded-2xl border px-3 py-3 text-left transition ${!isPleasure ? "border-cyan-300 bg-cyan-300/12" : "border-white/12 bg-white/5 hover:border-white/25"}`}>
          <strong className={`block text-base font-black ${!isPleasure ? "text-cyan-300" : "text-white"}`}>For business</strong>
          <span className="mt-1 block text-xs leading-4 text-white/50">Offer products or rewards</span>
        </button>
      </div>

      <div ref={setupRef} className="mt-8 scroll-mt-[184px]">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff8a45]">{isPleasure ? "Create an account" : "Business launch setup"}</p>
        <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">{isPleasure ? "Let’s get you set up." : "Launch an offer on Zero Loss."}</h2>
        <p className="mt-2 text-sm leading-6 text-white/60">
          {isPleasure ? <>Already registered? <Link href="/login" className="font-bold text-cyan-300 underline-offset-4 hover:underline">Sign in instead</Link></> : "Create the account, offer, creative plan, and campaign in one guided flow."}
        </p>
        <div className="mt-7">
          {isPleasure ? (
            <SignUpForm />
          ) : (
            <BusinessOnboardingForm />
          )}
        </div>
      </div>

      <p className="mt-5 text-center text-xs leading-5 text-white/40">Creating an account does not require a purchase or create an entry.</p>
      <div className="mt-5 border-t border-white/10 pt-5 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300">Investor preview</p>
        <Link href="/account/preview/entries" className="mt-3 inline-flex min-h-11 items-center rounded-full border border-cyan-300/40 bg-cyan-300/10 px-5 text-sm font-extrabold text-cyan-200 transition hover:bg-cyan-300 hover:text-[#00132e]">Preview a signed-in account →</Link>
        <p className="mt-2 text-xs leading-5 text-white/35">Opens the demonstration account without creating a customer account.</p>
      </div>
    </>
  );
}
