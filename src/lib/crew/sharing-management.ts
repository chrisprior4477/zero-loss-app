import type { OwnCrewEntry } from "@/app/account/crew/page";
import { defaultCrewVisibilityRule, type CrewVisibilityRule } from "./visibility";

export type SharingScope = "crew" | string;
export type SharingSelection = { scope: SharingScope; offeringSlug?: string; entryId?: string; before?: string };

export function entrySharedAtInScope(entry: OwnCrewEntry, scope: SharingScope) {
  // Legacy fixtures may omit audience dates; current database rows include them.
  return entry.audienceSharedAt ? entry.audienceSharedAt[scope] ?? null : entry.sharedAt ?? null;
}

export function entrySharedInScope(entry: OwnCrewEntry, scope: SharingScope, defaultRule: CrewVisibilityRule, rules: Record<string, CrewVisibilityRule>) {
  if (!entry.shared) return false;
  const rule = rules[entry.id] ?? defaultRule ?? defaultCrewVisibilityRule;
  return scope === "crew" ? rule.audience === "everyone" || rule.audience === "people" && rule.memberIds.length > 0
    : rule.audience === "groups" && rule.groupIds.includes(scope);
}

export function cleanupCutoff(days: number, now = new Date()) {
  if (days === 0) return undefined;
  const cutoff = new Date(now);
  if (days === 180) {
    // Six calendar months, clamped to the target month's final day.
    const day = cutoff.getUTCDate();
    cutoff.setUTCDate(1); cutoff.setUTCMonth(cutoff.getUTCMonth() - 6);
    const last = new Date(Date.UTC(cutoff.getUTCFullYear(), cutoff.getUTCMonth() + 1, 0)).getUTCDate();
    cutoff.setUTCDate(Math.min(day, last));
  } else cutoff.setUTCDate(cutoff.getUTCDate() - days);
  return cutoff.toISOString();
}
