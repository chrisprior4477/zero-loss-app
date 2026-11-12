"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

const PreferenceSnapshotContext = createContext<string | undefined>(undefined);
export function PreferenceSnapshotProvider({ revision, children }: { revision: string; children: ReactNode }) {
  return <PreferenceSnapshotContext.Provider value={revision}>{children}</PreferenceSnapshotContext.Provider>;
}

/** Reconcile confirmed reads without replacing an unsaved local choice. */
export function useServerPreference<T extends boolean | string | number | null>(serverValue: T) {
  const revision = useContext(PreferenceSnapshotContext);
  const [state, setState] = useState({ source: serverValue, revision, saved: serverValue, draft: null as { value: T } | null, generation: 0 });
  if (serverValue !== state.source || revision !== state.revision) {
    setState({
      source: serverValue, revision, saved: serverValue,
      draft: state.draft && state.draft.value !== serverValue ? state.draft : null,
      generation: state.generation + (serverValue !== state.source ? 1 : 0),
    });
  }
  return {
    value: state.draft ? state.draft.value : state.saved,
    savedValue: state.saved,
    isDirty: state.draft !== null,
    generation: state.generation,
    snapshotRevision: state.revision,
    setValue(value: T) {
      setState(previous => ({ ...previous, draft: value === previous.saved ? null : { value } }));
    },
    confirm(value: T, startedAt: number) {
      setState(previous => {
        // A newer read (for example a reminder already sent) beats an older response.
        const saved = previous.generation === startedAt ? value : previous.saved;
        const draft = previous.draft && previous.draft.value !== value && previous.draft.value !== saved ? previous.draft : null;
        return { ...previous, saved, draft };
      });
    },
    finishSave(submitted: T, verified?: T) {
      setState(previous => {
        const saved = verified === undefined ? previous.saved : verified;
        const draft = previous.draft && previous.draft.value !== submitted && previous.draft.value !== saved ? previous.draft : null;
        return { ...previous, saved, draft };
      });
    },
  };
}
