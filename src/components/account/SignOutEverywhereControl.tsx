"use client";

import { unstable_rethrow } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { signOutEverywhereAction, type SignOutEverywhereState } from "@/lib/auth/actions";
import styles from "./account-security.module.css";

const initialState: SignOutEverywhereState = { status: "idle", message: null };

async function signOutEverywhere(previous: SignOutEverywhereState, data: FormData): Promise<SignOutEverywhereState> {
  try { return await signOutEverywhereAction(previous, data); }
  catch (error) {
    unstable_rethrow(error);
    return { status: "error", message: "We couldn’t confirm sign-out on your other devices. Check your connection before trying again." };
  }
}

export function SignOutEverywhereControl() {
  const [state, action, pending] = useActionState(signOutEverywhere, initialState);
  const feedback = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (!pending && state.status === "error") feedback.current?.focus(); }, [pending, state]);

  return <details className={styles.signOutDisclosure}>
    <summary>Sign out everywhere</summary>
    <div className={styles.signOutConfirmation}>
      <p>This signs you out here and revokes sign-in sessions on your other devices. An already-issued access token may remain valid until it expires.</p>
      <form action={action}>
        <button type="submit" disabled={pending}>{pending ? "Signing out…" : "Confirm: sign out everywhere"}</button>
      </form>
      {state.message ? <p ref={feedback} tabIndex={-1} role="alert">{state.message}</p> : null}
    </div>
  </details>;
}
