"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { businessSignupPath } from "@/lib/business/application";
import { authNavigationHref } from "@/lib/auth/entry-return";
import { revealBelowHeader } from "@/lib/account/landing-position";

type AccountPath = "pleasure" | "business";
const businessSignupReturnKey = "zero-loss-business-signup-return";

export function SignUpExperience({ initialAccountPath = "pleasure", returnTo = null }: { initialAccountPath?: AccountPath; returnTo?: string | null }) {
  const [accountPath, setAccountPath] = useState<AccountPath>(initialAccountPath);
  const router = useRouter();
  const setupRef = useRef<HTMLDivElement>(null);
  const businessChoice = useRef<HTMLButtonElement>(null);
  const isPleasure = accountPath === "pleasure";
  useEffect(() => {
    const timers: number[] = [];
    function cancelRestore() { timers.splice(0).forEach(clearTimeout); }
    function restoreChoice() {
      if (!businessChoice.current || window.location.hash === "#personal-signup-heading") return;
      let restore = Boolean(window.history.state?.zeroLossBusinessSignupReturn);
      try {
        const saved = JSON.parse(sessionStorage.getItem(businessSignupReturnKey) ?? "null");
        restore ||= saved?.href === window.location.href && saved?.expires >= Date.now();
      } catch { /* The browser history marker can still restore focus. */ }
      if (!restore) return;
      const href = window.location.href;
      const focusChoice = () => {
        const button = businessChoice.current;
        const focused = document.activeElement;
        if (!button || window.location.href !== href
          || focused !== document.body && focused?.id !== "main-content" && focused?.id !== "personal-signup-heading") return;
        button.focus({ preventScroll: true });
        revealBelowHeader(button);
        const state = { ...window.history.state };
        delete state.zeroLossBusinessSignupReturn;
        window.history.replaceState(state, "");
        try { sessionStorage.removeItem(businessSignupReturnKey); } catch { /* Focus is already restored. */ }
      };
      cancelRestore();
      for (const delay of [0, 150, 400]) timers.push(window.setTimeout(focusChoice, delay));
    }
    restoreChoice();
    window.addEventListener("popstate", restoreChoice);
    window.addEventListener("pageshow", restoreChoice);
    window.addEventListener("pointerdown", cancelRestore);
    window.addEventListener("keydown", cancelRestore);
    return () => {
      cancelRestore();
      window.removeEventListener("popstate", restoreChoice);
      window.removeEventListener("pageshow", restoreChoice);
      window.removeEventListener("pointerdown", cancelRestore);
      window.removeEventListener("keydown", cancelRestore);
    };
  }, []);

  function chooseAccountPath(nextPath: AccountPath) {
    if (nextPath === "business") {
      const form = setupRef.current?.querySelector("form");
      if (form && [...new FormData(form).entries()].some(([key, value]) =>
        ["legal_first_name", "legal_last_name", "date_of_birth", "dob_month", "dob_day", "dob_year", "dob_year_input", "email", "password", "confirm_password"].includes(key)
        && typeof value === "string" && value.trim())
        && !window.confirm("Leave this personal signup? The details you entered will be cleared.")) return;
      window.history.replaceState({ ...window.history.state, zeroLossBusinessSignupReturn: true }, "");
      try {
        sessionStorage.setItem(businessSignupReturnKey, JSON.stringify({ href: window.location.href, expires: Date.now() + 300_000 }));
      } catch { /* The history state handles this when available. */ }
      router.push(returnTo && returnTo !== businessSignupPath ? `${businessSignupPath}&next=${encodeURIComponent(returnTo)}` : businessSignupPath);
      return;
    }
    flushSync(() => setAccountPath(nextPath));
    setupRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
    const firstField = setupRef.current?.querySelector<HTMLInputElement>("#legal_first_name");
    firstField?.focus({ preventScroll: true });
  }

  if (returnTo === businessSignupPath) {
    return <section><h2 id="personal-signup-heading" tabIndex={-1} className="text-3xl font-black">Create your business account</h2>
      <p className="my-4 text-sm text-white/70">Verify your email and sign in to continue your business application. Already registered? <Link className="font-bold text-cyan-300 underline" href={authNavigationHref("/login", returnTo)}>Sign in</Link></p>
      <SignUpForm returnTo={returnTo} />
    </section>;
  }
  return (
    <>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff8a45]">What brings you to Zero Loss?</p>
      <div className="mt-3 grid grid-cols-2 gap-3" role="group" aria-label="Choose account type">
        <button type="button" aria-pressed={isPleasure} onClick={() => chooseAccountPath("pleasure")} className={`min-h-[76px] rounded-2xl border px-3 py-3 text-left transition ${isPleasure ? "border-[#31e800] bg-[#31e800]/12" : "border-white/12 bg-white/5 hover:border-white/25"}`}>
          <strong className={`block text-base font-black ${isPleasure ? "text-[#72ff4e]" : "text-white"}`}>For personal use</strong>
          <span className="mt-1 block text-xs leading-4 text-white/50">Enter and explore</span>
        </button>
        <button ref={businessChoice} type="button" aria-pressed={!isPleasure} onClick={() => chooseAccountPath("business")} className={`min-h-[76px] rounded-2xl border px-3 py-3 text-left transition ${!isPleasure ? "border-cyan-300 bg-cyan-300/12" : "border-white/12 bg-white/5 hover:border-white/25"}`}>
          <strong className={`block text-base font-black ${!isPleasure ? "text-cyan-300" : "text-white"}`}>For business</strong>
          <span className="mt-1 block text-xs leading-4 text-white/50">Offer products or rewards</span>
        </button>
      </div>

      <div ref={setupRef} className="mt-8 scroll-mt-[184px]">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff8a45]">{isPleasure ? "Create an account" : "Business launch setup"}</p>
        <h2 id="personal-signup-heading" tabIndex={-1} className="mt-2 text-3xl font-black tracking-[-0.04em]">{isPleasure ? "Let’s get you set up." : "Launch an offer on Zero Loss."}</h2>
        <p className="mt-2 text-sm leading-6 text-white/60">
          {isPleasure ? <>Already registered? <Link href={authNavigationHref("/login", returnTo)} onNavigate={() => {
            const email = setupRef.current?.querySelector<HTMLInputElement>('input[name="email"]')?.value.trim();
            try {
              sessionStorage.removeItem("zero-loss-login-email");
              if (email) sessionStorage.setItem("zero-loss-login-email", JSON.stringify({ email, destination: returnTo, expires: Date.now() + 300_000 }));
            } catch { /* The sign-in link still works. */ }
          }} className="font-bold text-cyan-300 underline-offset-4 hover:underline">Sign in instead</Link></> : "Create the account, offer, creative plan, and campaign in one guided flow."}
        </p>
        <div className="mt-7">
          <SignUpForm returnTo={returnTo} />
        </div>
      </div>

      <p className="mt-5 text-center text-xs leading-5 text-white/40">Creating an account does not require a purchase or create an entry.</p>
    </>
  );
}
