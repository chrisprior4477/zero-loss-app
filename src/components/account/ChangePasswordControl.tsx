"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { revealBelowHeader } from "@/lib/account/landing-position";
import { recoverAuthForm } from "@/components/auth/recover-auth-form";
import { changeAccountPasswordAction, type PasswordRecoveryState } from "@/lib/auth/actions";
import { authNavigationHref } from "@/lib/auth/entry-return";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/validation";
import styles from "./account-security.module.css";

const initialState: PasswordRecoveryState = { status: "idle", message: null };

const changePassword = recoverAuthForm<PasswordRecoveryState>(changeAccountPasswordAction, () => ({
  status: "error",
  message: "We couldn’t confirm the password change. Try signing in with your new password before changing it again.",
}));

function ChangePasswordForm({ onCancel, onPending }: {
  onCancel: () => void; onPending: (pending: boolean) => void;
}) {
  const [state, action, pending] = useActionState(changePassword, initialState);
  const confirmation = useRef<HTMLParagraphElement>(null);
  const currentPassword = useRef<HTMLInputElement>(null);
  const confirmPassword = useRef<HTMLInputElement>(null);
  const [mismatch, setMismatch] = useState(false);
  useEffect(() => {
    const field = currentPassword.current;
    field?.focus({ preventScroll: true });
    if (field) revealBelowHeader(field);
  }, []);
  useEffect(() => { onPending(pending); }, [onPending, pending]);
  useEffect(() => {
    if (state.status === "updated") confirmation.current?.focus();
  }, [state.status]);

  if (state.status === "updated") {
    return <p id="change-account-password-form" ref={confirmation} tabIndex={-1} role="status" className={styles.passwordSuccess}>{state.message}</p>;
  }

  return <form id="change-account-password-form" action={action} className={styles.passwordForm} onChange={() => setMismatch(false)} onSubmit={event => {
    const data = new FormData(event.currentTarget);
    if (data.get("password") === data.get("confirm_password")) return;
    event.preventDefault();
    setMismatch(true);
    confirmPassword.current?.focus();
  }}>
    <label>Current password<input ref={currentPassword} name="current_password" type="password" autoComplete="current-password" required /></label>
    <label>New password<input name="password" type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required /></label>
    <label>Confirm new password<input ref={confirmPassword} name="confirm_password" aria-invalid={mismatch || undefined} aria-describedby={mismatch ? "change-password-mismatch" : undefined} type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required /></label>
    {mismatch ? <p id="change-password-mismatch" role="alert" className={styles.passwordError}>The two passwords don’t match.</p> : null}
    <p>Use at least {MIN_PASSWORD_LENGTH} characters.</p>
    {state.message ? <p role="alert" className={styles.passwordError}>{state.message}</p> : null}
    <div className={styles.passwordActions}>
      <button type="submit" disabled={pending}>{pending ? "Saving…" : "Save new password"}</button>
      <button type="button" onClick={onCancel} disabled={pending}>Cancel</button>
    </div>
    <Link href={authNavigationHref("/forgot-password", "/account/security#security-controls")}>Forgot your current password? Reset it by email</Link>
  </form>;
}

export function ChangePasswordControl() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);

  return <div className={styles.passwordControl}>
    <button
      type="button"
      ref={trigger}
      className={styles.passwordToggle}
      aria-expanded={open}
      aria-controls={open ? "change-account-password-form" : undefined}
      aria-label={open ? "Close password form" : "Change password"}
      disabled={pending}
      onClick={() => setOpen((wasOpen) => !wasOpen)}
    >
      <span className={styles.passwordIcon} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.5" cy="15.5" r="4.5" /><path d="m11 12 9-9 2 2-2 2 1.5 1.5-2 2L18 9l-2 2" /></svg></span>
      <span className={styles.rowText}><strong>Password</strong><small>Change your password</small></span>
      <span className={styles.passwordArrow} aria-hidden="true">{open ? "⌃" : "›"}</span>
    </button>
    {open ? <ChangePasswordForm onPending={setPending} onCancel={() => { setOpen(false); trigger.current?.focus(); }} /> : null}
  </div>;
}
