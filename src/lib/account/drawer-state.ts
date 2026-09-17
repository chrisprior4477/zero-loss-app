import "server-only";
import type { AccountActivity } from "./activity";

// Entry/outcome tables arrive in the next bounded checkpoint. Until then this
// reader has exactly two honest states: verified empty data or unavailable.
export function drawerState(hasEmptySnapshot: boolean): AccountActivity {
  return {
    isPreview: false,
    activity: [],
    activeCount: hasEmptySnapshot ? 0 : null,
    source: hasEmptySnapshot ? "customer-empty" : "unavailable",
  } as const;
}
