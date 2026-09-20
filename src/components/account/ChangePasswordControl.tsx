"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { changeAccountPasswordAction, type PasswordRecoveryState } from "@/lib/auth/actions";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/validation";
import styles from "./account-security.module.css";

const initialState: PasswordRecoveryState = { status: "idle", message: null };

function ChangePasswordForm({ onCancel }: { onCancel: () => void }) {
  const [state, action, pending] = useActionState(changeAccountPasswordAction, initialState);

  if (state.status === "updated") {
    return <p role="status" className={styles.passwordSuccess}>{state.message}</p>;
  }

  return <form id="change-account-password-form" action={action} className={styles.passwordForm}>
    <label>Current password<input name="current_password" type="password" autoComplete="current-password" required /></label>
    <label>New password<input name="password" type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required /></label>
    <label>Confirm new password<input name="confirm_password" type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required /></label>
    <p>Use at least {MIN_PASSWORD_LENGTH} characters.</p>
    {state.message ? <p role="alert" className={styles.passwordError}>{state.message}</p> : null}
    <div className={styles.passwordActions}>
      <button type="submit" disabled={pending}>{pending ? "Saving…" : "Save new password"}</button>
      <button type="button" onClick={onCancel} disabled={pending}>Cancel</button>
    </div>
    <Link href="/forgot-password">Forgot your current password? Reset it by email</Link>
  </form>;
}

export function ChangePasswordControl() {
  const [open, setOpen] = useState(false);

  return <div className={styles.passwordControl}>
    <button
      type="button"
      className={styles.passwordToggle}
      aria-expanded={open}
      aria-controls="change-account-password-form"
      onClick={() => setOpen((wasOpen) => !wasOpen)}
    >{open ? "Close password form" : "Change password"}<span aria-hidden="true">{open ? "↑" : "→"}</span></button>
    {open ? <ChangePasswordForm onCancel={() => setOpen(false)} /> : null}
  </div>;
}
