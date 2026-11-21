import "server-only";

import { isPreviewDataEnvironment } from "@/lib/preview/environment";
import type { AvailabilitySnapshot } from "./availability";
import fixtures from "./demo-outcome-fixtures.json";

type DemoOutcomeMark = "W" | "P";
type FixtureMarks = Partial<Record<string, string>>;

// Snapshot of the scripted preview catalog on November 21, 2026. Refresh it
// if the demo fixtures are reassigned. It contains no account or draw history.
const fixed: FixtureMarks = fixtures.fixed;
const atClose: FixtureMarks = fixtures.atClose;

export function getDemoOutcomeMarks(availability: AvailabilitySnapshot | null) {
  const marks: Partial<Record<string, DemoOutcomeMark>> = {};
  if (!isPreviewDataEnvironment() || !availability) return marks;

  for (const { slug, remaining } of Object.values(availability)) {
    if (remaining === 0) continue;
    // Mark the last few entries in a scripted closing pool. Regular open
    // entries keep their usual display, even when a future script is seeded.
    const mark = fixed[slug] ?? (remaining <= 5 ? atClose[slug] : undefined);
    if (mark === "W" || mark === "P") marks[slug] = mark;
  }
  return marks;
}
