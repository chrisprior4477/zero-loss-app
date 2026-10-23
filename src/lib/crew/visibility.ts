export type CrewAudience = "everyone" | "people" | "groups";
export type CrewVisibilityRule = { audience: CrewAudience; memberIds: string[]; groupIds: string[] };
export type CrewGroupContact = { id: string; name: string; phone: string; email: string };
export type CrewVisibilityGroup = { id: string; name: string; memberIds: string[]; contacts?: CrewGroupContact[] };

export const defaultCrewVisibilityRule: CrewVisibilityRule = {
  audience: "everyone", memberIds: [], groupIds: [],
};

export const crewUuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

export function isCrewGroupContact(value: unknown): value is CrewGroupContact {
  if (!value || typeof value !== "object") return false;
  const contact = value as Partial<CrewGroupContact>;
  return typeof contact.id === "string" && crewUuid.test(contact.id)
    && typeof contact.name === "string" && contact.name.trim().length > 0 && contact.name.trim().length <= 80
    && typeof contact.email === "string" && contact.email.length <= 254 && (!contact.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email))
    && typeof contact.phone === "string" && contact.phone.length <= 32 && (!contact.phone || /^\+?[\d ()-]+$/.test(contact.phone) && /^\d{10,15}$/.test(contact.phone.replace(/\D/g, "")))
    && Boolean(contact.email || contact.phone);
}

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
    && Array.isArray(group.memberIds) && group.memberIds.length <= 100 && group.memberIds.every((id) => typeof id === "string" && crewUuid.test(id))
    && (group.contacts === undefined || Array.isArray(group.contacts) && group.contacts.length <= 100
      && group.contacts.every(isCrewGroupContact) && new Set(group.contacts.map(contact => contact.id)).size === group.contacts.length);
}

export function crewVisibilitySnapshot(settings: { groups?: unknown; default_rule?: unknown; entry_rules?: unknown } | null, memberIds: Set<string>) {
  const groups = (Array.isArray(settings?.groups) ? settings.groups : []).filter(isCrewVisibilityGroup)
    .map(group => ({ ...group, memberIds: group.memberIds.filter(id => memberIds.has(id)) }));
  const groupIds = new Set(groups.map(group => group.id));
  const normalize = (rule: CrewVisibilityRule) => ({ ...rule, memberIds: rule.memberIds.filter(id => memberIds.has(id)), groupIds: rule.groupIds.filter(id => groupIds.has(id)) });
  const rawRules = settings?.entry_rules && typeof settings.entry_rules === "object" && !Array.isArray(settings.entry_rules) ? settings.entry_rules : {};
  const entryRules = Object.fromEntries(Object.entries(rawRules).filter((entry): entry is [string, CrewVisibilityRule] => crewUuid.test(entry[0]) && isCrewVisibilityRule(entry[1])).map(([id, rule]) => [id, normalize(rule)]));
  return { groups, defaultRule: normalize(isCrewVisibilityRule(settings?.default_rule) ? settings.default_rule : defaultCrewVisibilityRule), entryRules };
}
