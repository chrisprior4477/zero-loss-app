import { randomUUID } from "node:crypto";
import type { ReactNode } from "react";
import { PreferenceSnapshotProvider } from "./useServerPreference";

/** A new read can confirm the same value as an earlier read after another tab edits it. */
export function PreferenceSnapshot({ children }: { children: ReactNode }) {
  return <PreferenceSnapshotProvider revision={randomUUID()}>{children}</PreferenceSnapshotProvider>;
}
