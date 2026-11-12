import { crewUuid, isCrewContactPhone } from "./visibility";

/** Owner-written address-book details; never an account identity or delivery address. */
export type CrewMemberContact = { name: string; phone: string; email: string };

export function isCrewMemberContact(value: unknown): value is CrewMemberContact {
  if (!value || typeof value !== "object") return false;
  const contact = value as Partial<CrewMemberContact>;
  return typeof contact.name === "string" && contact.name.trim().length > 0 && contact.name.trim().length <= 80
    && typeof contact.email === "string" && contact.email.length <= 254 && (!contact.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email))
    && isCrewContactPhone(contact.phone);
}

export function crewMemberContacts(value: unknown): Record<string, CrewMemberContact> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([id, contact]) => crewUuid.test(id) && isCrewMemberContact(contact)));
}
