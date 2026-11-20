"use client";

import { unstable_rethrow } from "next/navigation";
import { useActionState, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { signOutEverywhereAction, type SignOutEverywhereState } from "@/lib/auth/actions";
import { restoreDialogTrigger } from "./dialog-keyboard";
import { useDialogBack } from "./useDialogBack";
import styles from "./account-security.module.css";

const initialState: SignOutEverywhereState = { status: "idle", message: null };

async function signOutEverywhere(previous: SignOutEverywhereState, data: FormData): Promise<SignOutEverywhereState> {
  try { return await signOutEverywhereAction(previous, data); }
  catch (error) {
    unstable_rethrow(error);
    return { status: "error", message: "We couldn’t confirm sign-out on your other devices. Check your connection before trying again." };
  }
}

const phoneQuery = "(max-width: 767px)";
const isPhone = () => window.matchMedia?.(phoneQuery).matches ?? false;
function subscribePhone(update: () => void) {
  const query = window.matchMedia?.(phoneQuery);
  query?.addEventListener("change", update);
  return () => query?.removeEventListener("change", update);
}

export function SignOutEverywhereControl() {
  const [state, action, pending] = useActionState(signOutEverywhere, initialState);
  const phone = useSyncExternalStore(subscribePhone, isPhone, () => false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const review = useRef<HTMLDetailsElement>(null);
  useDialogBack(phone && reviewOpen, () => {
    if (!review.current) return;
    review.current.open = false;
    requestAnimationFrame(() => {
      const element = review.current;
      if (element && !element.open) restoreDialogTrigger(element.querySelector("summary"));
    });
    setReviewOpen(false);
  }, pending, true);
  const feedback = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (!pending && state.status === "error") feedback.current?.focus(); }, [pending, state]);

  return <details ref={review} className={styles.signOutDisclosure} onToggle={event => setReviewOpen(event.currentTarget.open)}>
    <summary aria-disabled={pending || undefined} onClick={event => { if (pending) event.preventDefault(); }}>Sign out everywhere</summary>
    <div className={styles.signOutConfirmation}>
      <p>This signs you out here and revokes sign-in sessions on your other devices. An already-issued access token may remain valid until it expires.</p>
      <form action={action}>
        <button type="submit" disabled={pending}>{pending ? "Signing out…" : "Confirm: sign out everywhere"}</button>
      </form>
      {state.message ? <p ref={feedback} tabIndex={-1} role="alert">{state.message}</p> : null}
    </div>
  </details>;
}
