export type CatalogRequestDraft = { requestedItem: string; email: string; notes: string; requestKey?: string };

export function isCatalogRequestKey(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

const lifetime = 24 * 60 * 60 * 1000;

/** Unsent text belongs to this tab, account and original search only. */
export function catalogRequestDraftKey(ownerId: string | undefined, sourceQuery: string) {
  // Older Contact forms wrote signed-in drafts into the guest slot. Its owner
  // cannot be established, so never expose that legacy text to a new guest.
  return `zero-loss-catalog-request-draft:${ownerId ?? "guest-v2"}:${encodeURIComponent(sourceQuery)}`;
}

export function readCatalogRequestDraft(key: string): CatalogRequestDraft | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) ?? "null");
    if (!saved || typeof saved.savedAt !== "number" || saved.savedAt > Date.now() || Date.now() - saved.savedAt > lifetime) {
      sessionStorage.removeItem(key);
      return null;
    }
    const { requestedItem, email, notes } = saved;
    if (typeof requestedItem !== "string" || requestedItem.length > 160
      || typeof email !== "string" || email.length > 254 || typeof notes !== "string" || notes.length > 1000) return null;
    return { requestedItem, email, notes, ...(isCatalogRequestKey(saved.requestKey) ? { requestKey: saved.requestKey } : {}) };
  } catch { return null; }
}

export function writeCatalogRequestDraft(key: string, draft: CatalogRequestDraft | null) {
  try {
    if (draft) sessionStorage.setItem(key, JSON.stringify({ ...draft, savedAt: Date.now() }));
    else sessionStorage.removeItem(key);
  } catch { /* The form stays usable when this browser cannot remember a draft. */ }
}
