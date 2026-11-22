"use client";

import { startTransition, useActionState, useEffect, useLayoutEffect, useRef } from "react";
import { revealBelowHeader } from "@/lib/account/landing-position";
import { readSavedEmailPreference } from "@/lib/account/read-saved-email-preference";
import { useServerPreference } from "./useServerPreference";

export type EmailSaveResult = { status: "idle" | "succeeded" | "error"; message?: string };
type Feedback = { status: "idle" | "error"; message: string } | { status: "succeeded"; message: string; submitted: boolean }
  | { status: "unverified"; message: string; submitted: boolean; successMessage: string | null };

export function useVerifiedEmailPreference<T extends EmailSaveResult>(
  kind: Parameters<typeof readSavedEmailPreference>[0],
  initialEnabled: boolean | null,
  save: (previous: T, data: FormData) => Promise<T>,
  initialState: T,
) {
  const retryButton = useRef<HTMLButtonElement>(null);
  const preference = useServerPreference(initialEnabled);
  const revision = preference.snapshotRevision;
  const snapshot = useRef({ revision, value: initialEnabled });
  useLayoutEffect(() => {
    snapshot.current = { revision, value: initialEnabled };
  }, [revision, initialEnabled]);

  const [state, action, pending] = useActionState(async (previous: Feedback, data: FormData): Promise<Feedback> => {
    const checking = data.get("checkSavedPreference") === "1";
    let submitted = data.get("enabled") === "true";
    let successMessage: string | null;
    if (checking) {
      if (previous.status !== "unverified") return previous;
      submitted = previous.submitted;
      successMessage = previous.successMessage;
    } else {
      try {
        const result = await save(initialState, data);
        if (result.status !== "succeeded") return result.status === "error"
          ? { status: "unverified", submitted, successMessage: null, message: result.message ?? "Check the saved preference before trying again." }
          : { status: "idle", message: "" };
        successMessage = result.message ?? "";
      } catch {
        return { status: "unverified", submitted, successMessage: null, message: "We couldn’t confirm whether your preference saved. Check the saved setting before trying again." };
      }
    }
    // The response confirms a write happened. A new request checks what is
    // saved now, after the response reached this tab.
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        const before = snapshot.current;
        const saved = await readSavedEmailPreference(kind);
        if (saved === null) break;
        if (snapshot.current !== before && snapshot.current.value !== saved) continue;
        if (successMessage === null && saved !== submitted) {
          preference.finishSave(saved, saved);
          return { status: "error", message: "Your choice was not saved. It’s still selected so you can try again." };
        }
        preference.finishSave(submitted, saved);
        return { status: "succeeded", message: successMessage ?? "Your preference is saved.", submitted };
      }
    } catch {
      // Report an uncertain read after an acknowledged write.
    }
    return { status: "unverified", submitted, successMessage, message: "We couldn’t verify the saved preference. Your choice is still here." };
  }, { status: "idle", message: "" } as Feedback);

  const superseded = state.status === "succeeded"
    && preference.savedValue !== null && state.submitted !== preference.savedValue;
  const feedback = superseded
    ? { status: "updated", message: "Your preference was updated in another tab." }
    : state.status === "succeeded" && preference.savedValue === null
      ? { status: "idle", message: "" }
      : state;
  useEffect(() => {
    const button = retryButton.current;
    if (pending || feedback.status !== "error" || !button || document.activeElement !== document.body) return;
    button.focus({ preventScroll: true });
    revealBelowHeader(button);
  }, [pending, feedback.status]);
  function checkSavedPreference() {
    if (pending || state.status !== "unverified") return;
    const data = new FormData();
    data.set("checkSavedPreference", "1");
    startTransition(() => action(data));
  }
  return { preference, action, pending, feedback, retryButton, checkSavedPreference };
}
