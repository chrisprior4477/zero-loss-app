"use client";

import { useActionState } from "react";
import { signOutEverywhereAction, type SignOutEverywhereState } from "@/lib/auth/actions";
import styles from "./account-security.module.css";

const initialState: SignOutEverywhereState = { status: "idle", message: null };

export function SignOutEverywhereControl() {
  const [state, action, pending] = useActionState(signOutEverywhereAction, initialState);

  return <details className={styles.signOutDisclosure}>
    <summary>Sign out everywhere</summary>
    <div className={styles.signOutConfirmation}>
      <p>This signs you out here and revokes sign-in sessions on your other devices. An already-issued access token may remain valid until it expires.</p>
      <form action={action}>
        <button type="submit" disabled={pending}>{pending ? "Signing out…" : "Confirm: sign out everywhere"}</button>
      </form>
      {state.message ? <p role="alert">{state.message}</p> : null}
    </div>
  </details>;
}
