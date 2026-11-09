export const entryTicketReturnKey = "zeroLossEntryTicketReturn";

export type EntryTicketReturn = {
  ownerId: string;
  href: string;
  initialEntryId: string;
  selectedEntryId: string;
  showAll: boolean;
};

/** A view hint for this history entry; current server-owned tickets remain authoritative. */
export function readEntryTicketReturn(state: unknown, ownerId: string, href: string, initialEntryId: string, entryIds: readonly string[]): EntryTicketReturn | null {
  if (!state || typeof state !== "object") return null;
  const saved = (state as Record<string, unknown>)[entryTicketReturnKey] as Partial<EntryTicketReturn> | undefined;
  if (!saved || saved.ownerId !== ownerId || saved.href !== href || saved.initialEntryId !== initialEntryId
    || typeof saved.selectedEntryId !== "string" || !entryIds.includes(saved.selectedEntryId)
    || typeof saved.showAll !== "boolean") return null;
  return saved as EntryTicketReturn;
}
