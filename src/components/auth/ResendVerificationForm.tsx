"use client";

import { useActionState, useState } from "react";
import {
  resendVerificationAction,
  type ResendVerificationState,
} from "@/lib/auth/actions";
import { EmailDeliveryHint } from "@/components/auth/EmailDeliveryHint";
import { signInReturnPath } from "@/lib/auth/entry-return";

type ResendFeedback = ResendVerificationState & { submittedEmail: string };
const initialState: ResendFeedback = { ok: false, message: null, submittedEmail: "" };

async function resendVerification(previous: ResendFeedback, data: FormData): Promise<ResendFeedback> {
  const submittedEmail = String(data.get("verification_email") ?? "").trim();
  try { return { ...await resendVerificationAction(previous, data), submittedEmail }; }
  catch { return { ok: false, message: "We couldn’t confirm the verification email request. Check your connection, wait a minute, and try again.", submittedEmail }; }
}

export function ResendVerificationForm({ email, returnTo = null, emailFieldId }: { email: string; returnTo?: string | null; emailFieldId?: string }) {
  const safeReturnTo = signInReturnPath(returnTo);
  const [state, formAction, pending] = useActionState(
    resendVerification,
    initialState
  );
  const hasEmail = email.trim().length > 0;
  const [invalidEmail, setInvalidEmail] = useState<string | null>(null);
  const message = state.submittedEmail === email.trim() ? state.message : null;

  return (
    <form action={formAction} className="mt-3" onSubmit={event => {
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setInvalidEmail(null); return; }
      event.preventDefault();
      setInvalidEmail(email);
      if (emailFieldId) document.getElementById(emailFieldId)?.focus();
    }}>
      {safeReturnTo ? <input type="hidden" name="returnTo" value={safeReturnTo} /> : null}
      <input type="hidden" name="verification_email" value={email} />
      <button
        type="submit"
        disabled={pending || !hasEmail}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-cyan-300/40 bg-cyan-300/8 px-5 text-sm font-black text-cyan-200 transition hover:bg-cyan-300 hover:text-[#00132e] disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-white/35"
      >
        {pending ? "Sending…" : "Resend verification email"}
      </button>
      {invalidEmail === email ? <p role="alert" className="mt-2 text-sm text-red-100">Enter a valid email address before requesting another email.</p> : null}
      {!hasEmail && !message ? (
        <p className="mt-2 text-center text-xs leading-5 text-white/40">
          Enter your account email above first.
        </p>
      ) : null}
      {message ? (
        <>
          <p
            role={state.ok ? "status" : "alert"}
            className={`mt-2 rounded-xl border px-4 py-3 text-sm leading-5 ${state.ok ? "border-[#31e800]/35 bg-[#31e800]/10 text-green-100" : "border-red-300/30 bg-red-400/10 text-red-100"}`}
          >
            {message}
          </p>
          {state.ok ? <EmailDeliveryHint className="mt-2" /> : null}
        </>
      ) : null}
    </form>
  );
}
