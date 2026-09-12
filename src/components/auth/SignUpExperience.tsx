"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { SignUpForm } from "@/components/auth/SignUpForm";

type AccountPath = "pleasure" | "business";

const inputClassName =
  "mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-[#00132e]/75 px-4 text-base text-white outline-none transition placeholder:text-white/25 hover:border-white/25 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-300/10";

function BusinessInterestForm() {
  const [submitted, setSubmitted] = useState(false);

  function submitPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div role="status" className="rounded-2xl border border-cyan-300/35 bg-cyan-300/10 p-6 text-center">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Business preview</p>
        <h3 className="mt-3 text-2xl font-black">Your interest is ready for review.</h3>
        <p className="mt-3 text-sm leading-6 text-white/65">This demonstration does not submit company information yet. The production workflow will route qualified partners to the Zero Loss team.</p>
        <button type="button" onClick={() => setSubmitted(false)} className="mt-5 rounded-full border border-cyan-300/40 px-5 py-2.5 text-sm font-bold text-cyan-200 hover:bg-cyan-300 hover:text-[#00132e]">Back to the form</button>
      </div>
    );
  }

  return (
    <form onSubmit={submitPreview} className="space-y-5">
      <div>
        <label htmlFor="business_name" className="block text-sm font-bold text-white/85">Business name</label>
        <input id="business_name" name="business_name" required autoComplete="organization" className={inputClassName} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="business_contact" className="block text-sm font-bold text-white/85">Your name</label>
          <input id="business_contact" name="business_contact" required autoComplete="name" className={inputClassName} />
        </div>
        <div>
          <label htmlFor="business_email" className="block text-sm font-bold text-white/85">Work email</label>
          <input id="business_email" name="business_email" type="email" required autoComplete="email" className={inputClassName} />
        </div>
      </div>
      <div>
        <label htmlFor="business_website" className="block text-sm font-bold text-white/85">Company website <span className="font-normal text-white/40">(optional)</span></label>
        <input id="business_website" name="business_website" type="url" inputMode="url" placeholder="https://" autoComplete="url" className={inputClassName} />
      </div>
      <div>
        <label htmlFor="business_interest" className="block text-sm font-bold text-white/85">How would you like to work with Zero Loss?</label>
        <select id="business_interest" name="business_interest" required defaultValue="" className={inputClassName}>
          <option value="" disabled>Choose one</option>
          <option value="offer-products">Offer products or rewards</option>
          <option value="fulfillment">Provide digital fulfillment</option>
          <option value="brand-campaign">Create a brand campaign</option>
          <option value="other">Explore another partnership</option>
        </select>
      </div>
      <button type="submit" className="inline-flex min-h-13 w-full items-center justify-center rounded-xl bg-[#00b9ff] px-5 text-base font-black text-[#00132e] transition hover:bg-cyan-200">Continue as a business</button>
      <p className="text-center text-xs leading-5 text-white/40">Business onboarding is an investor preview and does not submit information yet.</p>
    </form>
  );
}

export function SignUpExperience({ initialAccountPath = "pleasure" }: { initialAccountPath?: AccountPath }) {
  const [accountPath, setAccountPath] = useState<AccountPath>(initialAccountPath);
  const isPleasure = accountPath === "pleasure";

  return (
    <>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff8a45]">What brings you to Zero Loss?</p>
      <div className="mt-3 grid grid-cols-2 gap-3" role="group" aria-label="Choose account type">
        <button type="button" aria-pressed={isPleasure} onClick={() => setAccountPath("pleasure")} className={`min-h-[76px] rounded-2xl border px-3 py-3 text-left transition ${isPleasure ? "border-[#31e800] bg-[#31e800]/12" : "border-white/12 bg-white/5 hover:border-white/25"}`}>
          <strong className={`block text-base font-black ${isPleasure ? "text-[#72ff4e]" : "text-white"}`}>For personal use</strong>
          <span className="mt-1 block text-xs leading-4 text-white/50">Enter and explore</span>
        </button>
        <button type="button" aria-pressed={!isPleasure} onClick={() => setAccountPath("business")} className={`min-h-[76px] rounded-2xl border px-3 py-3 text-left transition ${!isPleasure ? "border-cyan-300 bg-cyan-300/12" : "border-white/12 bg-white/5 hover:border-white/25"}`}>
          <strong className={`block text-base font-black ${!isPleasure ? "text-cyan-300" : "text-white"}`}>For business</strong>
          <span className="mt-1 block text-xs leading-4 text-white/50">Offer products or rewards</span>
        </button>
      </div>

      <div className="mt-8">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff8a45]">{isPleasure ? "Create an account" : "Business partnership"}</p>
        <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">{isPleasure ? "Let’s get you set up." : "Let’s build something together."}</h2>
        <p className="mt-2 text-sm leading-6 text-white/60">
          {isPleasure ? <>Already registered? <Link href="/login" className="font-bold text-cyan-300 underline-offset-4 hover:underline">Sign in instead</Link></> : "Tell us a little about your company and how you would like to participate."}
        </p>
        <div className="mt-7">
          {isPleasure ? (
            <SignUpForm />
          ) : (
            <BusinessInterestForm />
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
