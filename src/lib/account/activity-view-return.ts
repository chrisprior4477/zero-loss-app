import type { ActivityFilter } from "./activity";

export const activityViewReturnKey = "zeroLossActivityViewReturn";
export type ActivityViewReturn = {
  ownerId: string; href: string; filter: ActivityFilter; key: string;
  left: number; scrollY: number; cardTop: number; width: number;
};

export function readActivityViewReturn(state: unknown, ownerId: string, href: string, filter: ActivityFilter): ActivityViewReturn | null {
  const saved = state && typeof state === "object" ? (state as Record<string, unknown>)[activityViewReturnKey] as Partial<ActivityViewReturn> | undefined : undefined;
  if (!saved || saved.ownerId !== ownerId || saved.href !== href || saved.filter !== filter || typeof saved.key !== "string"
    || ![saved.left, saved.scrollY, saved.width].every(value => typeof value === "number" && Number.isFinite(value) && value >= 0)
    || typeof saved.cardTop !== "number" || !Number.isFinite(saved.cardTop)) return null;
  return saved as ActivityViewReturn;
}
