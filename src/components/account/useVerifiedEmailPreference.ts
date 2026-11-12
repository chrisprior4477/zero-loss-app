"use client";

import { useActionState, useLayoutEffect, useRef } from "react";
import { readSavedEmailPreference } from "@/lib/account/read-saved-email-preference";
import { useServerPreference } from "./useServerPreference";

type SaveResult = { status: "idle" | "succeeded" | "error"; message?: string };
type Feedback = { status: "idle" | "error"; message: string } | { status: "succeeded"; message: string; submitted: boolean };

export function useVerifiedEmailPreference<T extends SaveResult>(
  kind: "outcome" | "purchase",
  initialEnabled: boolean | null,
  save: (previous: T, data: FormData) => Promise<T>,
  initialState: T,
) {
  const preference = useServerPreference(initialEnabled);
  const revision = preference.snapshotRevision;
  const snapshot = useRef({ revision, value: initialEnabled });
  useLayoutEffect(() => {
    snapshot.current = { revision, value: initialEnabled };
  }, [revision, initialEnabled]);

  const [state, action, pending] = useActionState(async (_previous: Feedback, data: FormData): Promise<Feedback> => {
    const result = await save(initialState, data);
    if (result.status !== "succeeded") return { status: result.status, message: result.message ?? "" };

    const submitted = data.get("enabled") === "true";
    // The response confirms a write happened. A new request checks what is
    // saved now, after the response reached this tab.
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        const before = snapshot.current;
        const saved = await readSavedEmailPreference(kind);
        if (saved === null) break;
        if (snapshot.current !== before && snapshot.current.value !== saved) continue;
        preference.finishSave(submitted, saved);
        return { status: "succeeded", message: result.message ?? "", submitted };
      }
    } catch {
      // Report an uncertain read after an acknowledged write.
    }
    preference.finishSave(submitted);
    return { status: "error", message: "We couldn’t check your saved preference. Refresh to check the current setting." };
  }, { status: "idle", message: "" } as Feedback);

  const superseded = state.status === "succeeded"
    && preference.savedValue !== null && state.submitted !== preference.savedValue;
  const feedback = superseded
    ? { status: "updated", message: "Your preference was updated in another tab." }
    : state.status === "succeeded" && preference.savedValue === null
      ? { status: "idle", message: "" }
      : state;
  return { preference, action, pending, feedback };
}
