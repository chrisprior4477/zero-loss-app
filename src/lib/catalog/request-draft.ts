export type CatalogRequestDraft = { requestedItem: string; email: string; notes: string };

const lifetime = 24 * 60 * 60 * 1000;

/** Unsent text belongs to this tab, account and original search only. */
export function catalogRequestDraftKey(ownerId: string | undefined, sourceQuery: string) {
  return `zero-loss-catalog-request-draft:${ownerId ?? "guest"}:${encodeURIComponent(sourceQuery)}`;
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
    return { requestedItem, email, notes };
  } catch { return null; }
}

export function writeCatalogRequestDraft(key: string, draft: CatalogRequestDraft | null) {
  try {
    if (draft) sessionStorage.setItem(key, JSON.stringify({ ...draft, savedAt: Date.now() }));
    else sessionStorage.removeItem(key);
  } catch { /* The form stays usable when this browser cannot remember a draft. */ }
}
