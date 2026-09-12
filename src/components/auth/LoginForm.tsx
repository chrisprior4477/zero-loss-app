"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  signInAction,
  type AuthActionState,
} from "@/lib/auth/actions";

const initialState: AuthActionState = {
  ok: false,
  message: null,
};

type LoginFormProps = {
  initialError?: string | null;
  initialNotice?: string | null;
};

export function LoginForm({
  initialError = null,
  initialNotice = null,
}: LoginFormProps) {
  const [state, formAction, pending] = useActionState(
    signInAction,
    initialState
  );

  const message = state.message ?? initialError;
  const notice = state.message ? null : initialNotice;

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-bold text-white/85"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
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
        <span className="text-white/45">Forgot your password? <span className="font-semibold text-white/70">Recovery is the next step.</span></span>
        <p className="text-white/50">
        Need an account?{" "}
        <Link
          href="/signup"
          className="font-bold text-cyan-300 underline-offset-4 hover:underline"
        >
          Sign up
        </Link>
        </p>
      </div>
    </form>
  );
}
