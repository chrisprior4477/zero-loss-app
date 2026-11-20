"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { requestPasswordResetAction, type PasswordRecoveryState } from "@/lib/auth/actions";
import { revealBelowHeader } from "@/lib/account/landing-position";
import { signInReturnPath } from "@/lib/auth/entry-return";

const initialState: PasswordRecoveryState = { status: "idle", message: null };

async function requestReset(previous: PasswordRecoveryState, formData: FormData): Promise<PasswordRecoveryState> {
  try { return await requestPasswordResetAction(previous, formData); }
  catch { return { status: "error", message: "We couldn’t confirm the reset email request. Your address is still here. Please wait a minute and try again." }; }
}

export function ForgotPasswordForm({ expired = false, signInHref, returnTo }: { expired?: boolean; signInHref: string; returnTo?: string | null }) {
  const [state, action, pending] = useActionState(requestReset, initialState);
  const [email, setEmail] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const currentRequest = submittedEmail === email;
  const feedback = currentRequest && !pending ? state : initialState;
  const destination = signInReturnPath(returnTo);
  const submitButton = useRef<HTMLButtonElement>(null);
  const emailField = useRef<HTMLInputElement>(null);
  const restoreSubmitFocus = useRef(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const raw = sessionStorage.getItem("zero-loss-recovery-email");
        sessionStorage.removeItem("zero-loss-recovery-email");
        if (!raw) return;
        const saved = JSON.parse(raw);
        if (typeof saved.email === "string" && saved.email.length <= 254 && saved.destination === destination && saved.expires >= Date.now()) {
          setEmail(current => current || saved.email);
          if (emailField.current && document.activeElement === document.body) {
            emailField.current.focus({ preventScroll: true });
            revealBelowHeader(emailField.current);
          }
        }
      } catch { /* The visitor can type their address directly. */ }
    });
    return () => cancelAnimationFrame(frame);
  }, [destination]);
  useEffect(() => {
    if (pending || !restoreSubmitFocus.current) return;
    restoreSubmitFocus.current = false;
    if (feedback.status !== "error") return;
    if (emailField.current && !emailField.current.validity.valid) {
      emailField.current.focus({ preventScroll: true });
      revealBelowHeader(emailField.current);
    }
    else if (document.activeElement === document.body) submitButton.current?.focus();
  }, [pending, feedback]);

  return (
    <form onSubmit={event => {
      event.preventDefault();
      if (pending) return;
      const formData = new FormData(event.currentTarget);
      const address = String(formData.get("email") ?? "");
      restoreSubmitFocus.current = document.activeElement === submitButton.current;
      setEmail(address);
      setSubmittedEmail(address);
      startTransition(() => action(formData));
    }} className="space-y-5" noValidate>
      {destination ? <input type="hidden" name="next" value={destination} /> : null}
      {expired ? <p role="alert" className="rounded-xl border border-orange-300/35 bg-orange-300/10 p-4 text-sm">That email link is no longer valid. Request a new one below.</p> : null}
      <div>
        <label htmlFor="recovery-email" className="block text-sm font-bold text-white/85">Email address</label>
        <input ref={emailField} id="recovery-email" name="email" type="email" autoComplete="email" required value={email} onChange={event => {
          setEmail(event.target.value);
          setSubmittedEmail(null);
        }} className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-[#00132e]/75 px-4 text-base text-white outline-none focus:border-cyan-300 focus:ring-4 focus:ring-cyan-300/10" />
      </div>
      {feedback.message ? <p role={feedback.status === "error" ? "alert" : "status"} className={`rounded-xl border p-4 text-sm leading-6 ${feedback.status === "error" ? "border-red-300/30 bg-red-400/10 text-red-100" : "border-[#31e800]/35 bg-[#31e800]/10 text-white"}`}>{feedback.message}</p> : null}
      <button ref={submitButton} type="submit" disabled={pending} className="min-h-12 w-full rounded-xl bg-[#00b9ff] px-5 font-black text-[#00132e] transition hover:bg-cyan-200 disabled:opacity-60">{pending && currentRequest ? "Sending…" : feedback.status === "sent" ? "Resend reset email" : "Send reset email"}</button>
      <p className="text-xs leading-5 text-white/55">You can request another link if it doesn&apos;t arrive. Please wait a minute between requests.</p>
      <Link href={signInHref} className="inline-block text-sm font-bold text-cyan-300 hover:underline">← Back to sign in</Link>
    </form>
  );
}
