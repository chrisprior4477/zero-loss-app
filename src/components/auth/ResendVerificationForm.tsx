"use client";

import { useActionState } from "react";
import {
  resendVerificationAction,
  type ResendVerificationState,
} from "@/lib/auth/actions";

const initialState: ResendVerificationState = { ok: false, message: null };

export function ResendVerificationForm({ email }: { email: string }) {
  const [state, formAction, pending] = useActionState(
    resendVerificationAction,
    initialState
  );
  const hasEmail = email.trim().length > 0;

  return (
    <form action={formAction} className="mt-3">
      <input type="hidden" name="verification_email" value={email} />
      <button
        type="submit"
        disabled={pending || !hasEmail}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-cyan-300/40 bg-cyan-300/8 px-5 text-sm font-black text-cyan-200 transition hover:bg-cyan-300 hover:text-[#00132e] disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-white/35"
      >
        {pending ? "Sending…" : "Resend verification email"}
      </button>
      {!hasEmail && !state.message ? (
        <p className="mt-2 text-center text-xs leading-5 text-white/40">
          Enter your account email above first.
        </p>
      ) : null}
      {state.message ? (
        <p
          role={state.ok ? "status" : "alert"}
          className={`mt-2 rounded-xl border px-4 py-3 text-sm leading-5 ${state.ok ? "border-[#31e800]/35 bg-[#31e800]/10 text-green-100" : "border-red-300/30 bg-red-400/10 text-red-100"}`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
