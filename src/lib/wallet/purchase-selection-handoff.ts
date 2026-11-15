// A short-lived navigation draft only. Checkout rechecks every offer and amount.
const prefix = "zero-loss-purchase-handoff:";
const maxAge = 24 * 60 * 60 * 1000;
const maxDrafts = 32;
export const purchaseChoicePattern = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

export function savePurchaseHandoff(draft: { ownerId: string; slug: string; available: string[]; selected: string[]; decline: boolean; needsReview: boolean }): string {
  const id = crypto.randomUUID();
  try {
    // Expired drafts are disposable; no account or transaction records live here.
    const active: { key: string; savedAt: number }[] = [];
    for (let index = localStorage.length - 1; index >= 0; index--) {
      const key = localStorage.key(index);
      if (!key?.startsWith(prefix)) continue;
      try {
        const saved = JSON.parse(localStorage.getItem(key) ?? "null");
        if (!saved || typeof saved.savedAt !== "number" || Date.now() - saved.savedAt >= maxAge) localStorage.removeItem(key);
        else active.push({ key, savedAt: saved.savedAt });
      } catch { localStorage.removeItem(key); }
    }
    active.sort((a, b) => b.savedAt - a.savedAt);
    for (const draft of active.slice(maxDrafts - 1)) localStorage.removeItem(draft.key);
    localStorage.setItem(prefix + id, JSON.stringify({ ...draft, savedAt: Date.now() }));
  } catch { /* The destination asks for review if this browser cannot keep the draft. */ }
  return id;
}

export function readPurchaseHandoff(id: string): string | null {
  if (!purchaseChoicePattern.test(id)) return null;
  try {
    const raw = localStorage.getItem(prefix + id);
    const saved = JSON.parse(raw ?? "null");
    if (!saved || typeof saved.savedAt !== "number" || !Number.isFinite(saved.savedAt)
      || saved.savedAt > Date.now() || Date.now() - saved.savedAt >= maxAge) return null;
    return raw;
  } catch { return null; }
}
