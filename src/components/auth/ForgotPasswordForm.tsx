"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordResetAction, type PasswordRecoveryState } from "@/lib/auth/actions";

const initialState: PasswordRecoveryState = { status: "idle", message: null };

export function ForgotPasswordForm({ expired = false }: { expired?: boolean }) {
  const [state, action, pending] = useActionState(requestPasswordResetAction, initialState);

  return (
    <form action={action} className="space-y-5" noValidate>
      {expired ? <p role="alert" className="rounded-xl border border-orange-300/35 bg-orange-300/10 p-4 text-sm">That email link is no longer valid. Request a new one below.</p> : null}
      <div>
        <label htmlFor="recovery-email" className="block text-sm font-bold text-white/85">Email address</label>
        <input id="recovery-email" name="email" type="email" autoComplete="email" required className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-[#00132e]/75 px-4 text-base text-white outline-none focus:border-cyan-300 focus:ring-4 focus:ring-cyan-300/10" />
      </div>
      {state.message ? <p role={state.status === "error" ? "alert" : "status"} className={`rounded-xl border p-4 text-sm leading-6 ${state.status === "error" ? "border-red-300/30 bg-red-400/10 text-red-100" : "border-[#31e800]/35 bg-[#31e800]/10 text-white"}`}>{state.message}</p> : null}
      <button type="submit" disabled={pending} className="min-h-12 w-full rounded-xl bg-[#00b9ff] px-5 font-black text-[#00132e] transition hover:bg-cyan-200 disabled:opacity-60">{pending ? "Sending…" : state.status === "sent" ? "Resend reset email" : "Send reset email"}</button>
      <p className="text-xs leading-5 text-white/55">You can request another link if it doesn&apos;t arrive. Please wait a minute between requests.</p>
      <Link href="/login" className="inline-block text-sm font-bold text-cyan-300 hover:underline">← Back to sign in</Link>
    </form>
  );
}
