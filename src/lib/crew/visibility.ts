export type CrewAudience = "everyone" | "people" | "groups";
export type CrewVisibilityRule = { audience: CrewAudience; memberIds: string[]; groupIds: string[] };
export type CrewVisibilityGroup = { id: string; name: string; memberIds: string[] };

export const defaultCrewVisibilityRule: CrewVisibilityRule = {
  audience: "everyone", memberIds: [], groupIds: [],
};

export const crewUuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

export function isCrewVisibilityRule(value: unknown): value is CrewVisibilityRule {
  if (!value || typeof value !== "object") return false;
  const rule = value as Partial<CrewVisibilityRule>;
  return (rule.audience === "everyone" || rule.audience === "people" || rule.audience === "groups")
    && Array.isArray(rule.memberIds) && rule.memberIds.every((id) => typeof id === "string" && crewUuid.test(id))
    && Array.isArray(rule.groupIds) && rule.groupIds.every((id) => typeof id === "string" && crewUuid.test(id));
}

export function isCrewVisibilityGroup(value: unknown): value is CrewVisibilityGroup {
  if (!value || typeof value !== "object") return false;
  const group = value as Partial<CrewVisibilityGroup>;
  return typeof group.id === "string" && crewUuid.test(group.id)
    && typeof group.name === "string" && group.name.trim().length > 0 && group.name.trim().length <= 50
    && Array.isArray(group.memberIds) && group.memberIds.every((id) => typeof id === "string" && crewUuid.test(id));
}
