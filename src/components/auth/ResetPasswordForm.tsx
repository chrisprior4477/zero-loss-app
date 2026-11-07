"use client";

import Link from "next/link";
import { useActionState } from "react";
import { updateRecoveredPasswordAction, type PasswordRecoveryState } from "@/lib/auth/actions";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/validation";
import { authNavigationHref, signInReturnPath } from "@/lib/auth/entry-return";

const initialState: PasswordRecoveryState = { status: "idle", message: null };

export function ResetPasswordForm({ returnTo }: { returnTo?: string | null }) {
  const [state, action, pending] = useActionState(updateRecoveredPasswordAction, initialState);
  const destination = signInReturnPath(returnTo);
  const signInHref = `${authNavigationHref("/login", destination)}${destination ? "&" : "?"}focus=email#login-form`;

  return (
    <form action={action} className="space-y-5" noValidate>
      {destination ? <input type="hidden" name="next" value={destination} /> : null}
      <div>
        <label htmlFor="new-password" className="block text-sm font-bold text-white/85">New password</label>
        <input id="new-password" name="password" type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-[#00132e]/75 px-4 text-base text-white outline-none focus:border-cyan-300 focus:ring-4 focus:ring-cyan-300/10" />
      </div>
      <div>
        <label htmlFor="confirm-new-password" className="block text-sm font-bold text-white/85">Confirm new password</label>
        <input id="confirm-new-password" name="confirm_password" type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-[#00132e]/75 px-4 text-base text-white outline-none focus:border-cyan-300 focus:ring-4 focus:ring-cyan-300/10" />
      </div>
      <p className="text-xs text-white/55">Use at least {MIN_PASSWORD_LENGTH} characters.</p>
      {state.message ? <p role="alert" className="rounded-xl border border-red-300/30 bg-red-400/10 p-4 text-sm text-red-100">{state.message}</p> : null}
      <button type="submit" disabled={pending} className="min-h-12 w-full rounded-xl bg-[#00b9ff] px-5 font-black text-[#00132e] transition hover:bg-cyan-200 disabled:opacity-60">{pending ? "Updating…" : "Save new password"}</button>
      {state.status === "error" ? <div className="flex flex-wrap justify-between gap-3 text-sm font-semibold text-cyan-300">
        <Link href={signInHref} className="underline-offset-4 hover:underline">Sign in instead</Link>
        <Link href={authNavigationHref("/forgot-password", destination)} className="underline-offset-4 hover:underline">Request a new reset link</Link>
      </div> : null}
    </form>
  );
}
