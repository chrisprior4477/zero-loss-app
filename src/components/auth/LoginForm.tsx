"use client";

import Link from "next/link";
import { ResendVerificationForm } from "./ResendVerificationForm";
import { authNavigationHref } from "@/lib/auth/entry-return";
import { accountReturnPath } from "@/lib/auth/account-return";
import { useActionState, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { revealBelowHeader } from "@/lib/account/landing-position";
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
  if (returnTo?.startsWith("/account/crew?") && returnTo.endsWith("#crew-groups") && /^#crew-group-[0-9a-f-]{36}$/i.test(inheritedHash)) {
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
  const [invalidField, setInvalidField] = useState<"email" | "password" | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const restoreErrorFocus = useRef(false);
  const destination = useLoginDestination(returnTo);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const saved = JSON.parse(sessionStorage.getItem("zero-loss-login-email") ?? "null");
        sessionStorage.removeItem("zero-loss-login-email");
        if (saved?.destination === destination && saved.expires >= Date.now() && typeof saved.email === "string" && saved.email.length <= 254) {
          setEmail(current => current || saved.email);
        }
      } catch { /* The visitor can enter their email directly. */ }
    });
    return () => cancelAnimationFrame(frame);
  }, [destination]);
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
    if (!isMobile && !focusOnMount && !destination) return;
    const frame = window.requestAnimationFrame(() => {
      const form = document.getElementById("login-form");
      if (!form) return;
      const header = document.querySelector("header.sticky");
      const headerHeight = header?.getBoundingClientRect().height ?? 0;
      const formTop = form.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: Math.max(0, formTop - headerHeight - 8), behavior: "auto" });
      if (document.activeElement === document.body) emailRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusOnMount, destination]);

  return (<>
    <form action={formAction} onSubmit={event => {
      const address = emailRef.current;
      const password = passwordRef.current;
      const invalid = !address?.validity.valid ? "email" : !password?.value ? "password" : null;
      if (invalid) {
        event.preventDefault();
        setInvalidField(invalid);
        const field = invalid === "email" ? address : password;
        field?.focus({ preventScroll: true });
        if (field) revealBelowHeader(field);
        return;
      }
      setInvalidField(null);
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
          aria-invalid={invalidField === "email" || undefined}
          aria-describedby={invalidField === "email" ? "login-field-error" : undefined}
          onChange={event => { setEmail(event.target.value); if (invalidField === "email") setInvalidField(null); }}
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
          aria-invalid={invalidField === "password" || undefined}
          aria-describedby={invalidField === "password" ? "login-field-error" : undefined}
          onChange={() => { if (invalidField === "password") setInvalidField(null); }}
          required
          className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-[#00132e]/75 px-4 text-base text-white outline-none transition hover:border-white/25 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-300/10"
        />
      </div>

      {invalidField && <p id="login-field-error" role="alert" className="text-sm font-bold text-red-100">{invalidField === "email" ? "Enter your email address." : "Enter your password."}</p>}
      {notice && !invalidField ? (
        <p
          role="status"
          className="rounded-xl border border-[#31e800]/35 bg-[#31e800]/10 px-4 py-3 text-sm text-white"
        >
          {notice}
        </p>
      ) : null}

      {message && !invalidField ? (
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
