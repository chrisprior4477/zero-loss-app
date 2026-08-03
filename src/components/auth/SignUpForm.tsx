"use client";

import Link from "next/link";
import { useActionState, useMemo } from "react";
import {
  signUpAction,
  type AuthActionState,
} from "@/lib/auth/actions";
import {
  MIN_ACCOUNT_AGE_YEARS,
  MIN_PASSWORD_LENGTH,
  isAtLeastAge,
  isPasswordValid,
} from "@/lib/auth/validation";

const initialState: AuthActionState = {
  ok: false,
  message: null,
};

export function SignUpForm() {
  const [state, formAction, pending] = useActionState(
    signUpAction,
    initialState
  );

  const maxDob = useMemo(() => {
    const today = new Date();
    const cutoff = new Date(
      Date.UTC(
        today.getUTCFullYear() - MIN_ACCOUNT_AGE_YEARS,
        today.getUTCMonth(),
        today.getUTCDate()
      )
    );
    return cutoff.toISOString().slice(0, 10);
  }, []);

  if (state.ok && state.pendingVerification) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-[var(--accent)]">
          Verify your email
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
          Check your email to verify
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-[var(--muted)]">
          We sent a confirmation link
          {state.email ? (
            <>
              {" "}
              to <span className="text-[var(--foreground)]">{state.email}</span>
            </>
          ) : null}
          . Open that email and confirm your address before signing in.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
          After you verify, you can sign in with your email and password.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex rounded-md bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-[var(--accent-foreground)]"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="legal_first_name"
            className="block text-sm font-medium text-[var(--foreground)]"
          >
            First name
          </label>
          <input
            id="legal_first_name"
            name="legal_first_name"
            type="text"
            autoComplete="given-name"
            required
            className="mt-1.5 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
          />
        </div>
        <div>
          <label
            htmlFor="legal_last_name"
            className="block text-sm font-medium text-[var(--foreground)]"
          >
            Last name
          </label>
          <input
            id="legal_last_name"
            name="legal_last_name"
            type="text"
            autoComplete="family-name"
            required
            className="mt-1.5 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="date_of_birth"
          className="block text-sm font-medium text-[var(--foreground)]"
        >
          Date of birth
        </label>
        <input
          id="date_of_birth"
          name="date_of_birth"
          type="date"
          required
          max={maxDob}
          onChange={(event) => {
            const value = event.target.value;
            if (value && !isAtLeastAge(value)) {
              event.target.setCustomValidity(
                `You must be at least ${MIN_ACCOUNT_AGE_YEARS} years old to create an account.`
              );
            } else {
              event.target.setCustomValidity("");
            }
          }}
          className="mt-1.5 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
        />
        <p className="mt-1 text-xs text-[var(--muted)]">
          You must be at least {MIN_ACCOUNT_AGE_YEARS} years old.
        </p>
      </div>

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-[var(--foreground)]"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-1.5 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-[var(--foreground)]"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          onChange={(event) => {
            if (!isPasswordValid(event.target.value)) {
              event.target.setCustomValidity(
                `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
              );
            } else {
              event.target.setCustomValidity("");
            }
          }}
          className="mt-1.5 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
        />
        <p className="mt-1 text-xs text-[var(--muted)]">
          Minimum {MIN_PASSWORD_LENGTH} characters.
        </p>
      </div>

      <label className="flex items-start gap-3 text-sm text-[var(--muted)]">
        <input
          type="checkbox"
          name="accepted_terms"
          required
          className="mt-1 h-4 w-4 rounded border-[var(--border)]"
        />
        <span>
          I agree to the{" "}
          <Link
            href="/terms"
            className="text-[var(--foreground)] underline-offset-2 hover:underline"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="text-[var(--foreground)] underline-offset-2 hover:underline"
          >
            Privacy Policy
          </Link>
          .
        </span>
      </label>

      {state.message ? (
        <p
          role="alert"
          className="rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--foreground)]"
        >
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center rounded-md bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-[var(--accent-foreground)] disabled:opacity-60"
      >
        {pending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
