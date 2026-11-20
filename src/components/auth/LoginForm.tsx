"use client";

import Link from "next/link";
import { ResendVerificationForm } from "./ResendVerificationForm";
import { authNavigationHref } from "@/lib/auth/entry-return";
import { accountReturnPath } from "@/lib/auth/account-return";
import { useActionState, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { recoverAuthForm } from "./recover-auth-form";
import {
  signInAction,
  type AuthActionState,
} from "@/lib/auth/actions";

const initialState: AuthActionState = {
  ok: false,
  message: null,
};

type LoginFormProps = {
  allowResend?: boolean;
  initialError?: string | null;
  initialNotice?: string | null;
  focusOnMount?: boolean;
  returnTo?: string | null;
};

const signIn = recoverAuthForm<AuthActionState>(signInAction, () => ({
  ok: false,
  message: "We couldn’t confirm your sign-in. Check your connection, re-enter your password, and try again.",
}));

function subscribeToHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function useLoginDestination(returnTo: string | null) {
  // An account redirect can inherit the original fragment in the browser.
  const inheritedHash = useSyncExternalStore(subscribeToHash, () => window.location.hash, () => "");
  if (returnTo?.startsWith("/account/notifications")
      && ["#alert-settings", "#favorite-alert-preference"].includes(inheritedHash)) {
    return accountReturnPath(returnTo.split("#")[0] + inheritedHash) ?? returnTo;
  }
  if (!inheritedHash || !returnTo || returnTo.includes("#")) return returnTo;
  if (returnTo === "/account/wallet?view=history" && inheritedHash === "#payment-deposits") {
    return accountReturnPath(`${returnTo}&panel=deposits${inheritedHash}`) ?? returnTo;
  }
  return accountReturnPath(`${returnTo}${inheritedHash}`) ?? returnTo;
}

export function AuthDestinationLink({ returnTo, page, className, children }: {
  returnTo: string | null; page: "/login" | "/signup" | "/forgot-password"; className?: string; children: ReactNode;
}) {
  const destination = useLoginDestination(returnTo);
  return <Link href={authNavigationHref(page, destination)} className={className}>{children}</Link>;
}

export function LoginForm({
  allowResend = false,
  initialError = null,
  initialNotice = null,
  focusOnMount = false,
  returnTo = null,
}: LoginFormProps) {
  const [state, formAction, pending] = useActionState(
    signIn,
    initialState
  );

  const message = state.message ?? initialError;
  const notice = state.message ? null : initialNotice;
  const [email, setEmail] = useState("");
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const restoreErrorFocus = useRef(false);
  const destination = useLoginDestination(returnTo);
  useEffect(() => {
    if (pending || !state.message || !restoreErrorFocus.current) return;
    restoreErrorFocus.current = false;
    if (document.activeElement === document.body) {
      const field = emailRef.current?.validity.valid ? passwordRef.current : emailRef.current;
      field?.focus();
    }
  }, [state, pending]);

  useEffect(() => {
    // Every mobile sign-in route should land on the form, including plain
    // /login links that do not carry the explicit focus=email parameter.
    const isMobile = window.matchMedia?.("(max-width: 767px)").matches ?? false;
    if (!isMobile && !focusOnMount) return;
    const frame = window.requestAnimationFrame(() => {
      const form = document.getElementById("login-form");
      if (!form) return;
      const header = document.querySelector("header.sticky");
      const headerHeight = header?.getBoundingClientRect().height ?? 0;
      const formTop = form.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: Math.max(0, formTop - headerHeight - 8), behavior: "auto" });
      if (focusOnMount) emailRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusOnMount]);

  return (<>
    <form action={formAction} onSubmit={() => {
      restoreErrorFocus.current = true;
      setEmail(emailRef.current?.value ?? email);
    }} className="space-y-5" noValidate>
      {destination ? <input type="hidden" name="returnTo" value={destination} /> : null}
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-bold text-white/85"
        >
          Email
        </label>
        <input
          ref={emailRef}
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={event => setEmail(event.target.value)}
          autoFocus={focusOnMount}
          required
          className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-[#00132e]/75 px-4 text-base text-white outline-none transition hover:border-white/25 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-300/10"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-bold text-white/85"
        >
          Password
        </label>
        <input
          ref={passwordRef}
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-[#00132e]/75 px-4 text-base text-white outline-none transition hover:border-white/25 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-300/10"
        />
      </div>

      {notice ? (
        <p
          role="status"
          className="rounded-xl border border-[#31e800]/35 bg-[#31e800]/10 px-4 py-3 text-sm text-white"
        >
          {notice}
        </p>
      ) : null}

      {message ? (
        <p
          role="alert"
          className="rounded-xl border border-red-300/30 bg-red-400/10 px-4 py-3 text-sm text-red-100"
        >
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#00b9ff] px-5 text-base font-black text-[#00132e] transition hover:bg-cyan-200 disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>

      <div className="flex flex-col items-center justify-between gap-3 text-sm sm:flex-row">
        <Link href={authNavigationHref("/forgot-password", destination)} onNavigate={() => {
          try {
            sessionStorage.removeItem("zero-loss-recovery-email");
            if (email.trim()) sessionStorage.setItem("zero-loss-recovery-email", JSON.stringify({ email: email.trim(), destination, expires: Date.now() + 300_000 }));
          } catch { /* The recovery form also accepts manual entry. */ }
        }} className="font-semibold text-cyan-300 underline-offset-4 hover:underline">Forgot your password?</Link>
        <p className="text-white/50">
        Need an account?{" "}
        <Link
          href={authNavigationHref("/signup", destination)}
          className="font-bold text-cyan-300 underline-offset-4 hover:underline"
        >
          Sign up
        </Link>
        </p>
      </div>
    </form>
    {allowResend ? <ResendVerificationForm email={email} returnTo={destination} /> : null}
  </>);
}
