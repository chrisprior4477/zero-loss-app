const productSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const quantityPattern = /^(?:[1-9]|10)$/;
const storageKey = "zero-loss-entry-intent-v1";
const maxAgeMs = 24 * 60 * 60 * 1000;

export type EntryIntent = { slug: string; title: string; quantity: number; savedAt: number };

export function parseEntryQuantity(value: unknown): number | null {
  return typeof value === "string" && quantityPattern.test(value) ? Number(value) : null;
}

export function productEntryHref(slug: string, quantity = 1): string {
  if (!productSlugPattern.test(slug)) return "/browse";
  const selected = Number.isInteger(quantity) && quantity >= 1 && quantity <= 10 ? quantity : 1;
  return `/items/${slug}${selected > 1 ? `?quantity=${selected}` : ""}#enter-entry`;
}

function validIntent(value: unknown): value is EntryIntent {
  if (!value || typeof value !== "object") return false;
  const intent = value as Partial<EntryIntent>;
  return typeof intent.slug === "string" && productSlugPattern.test(intent.slug)
    && typeof intent.title === "string" && intent.title.length > 0 && intent.title.length <= 160 && !/[\u0000-\u001f]/.test(intent.title)
    && typeof intent.quantity === "number" && Number.isInteger(intent.quantity) && intent.quantity >= 1 && intent.quantity <= 10
    && typeof intent.savedAt === "number" && Number.isFinite(intent.savedAt) && intent.savedAt <= Date.now() && Date.now() - intent.savedAt < maxAgeMs;
}

/** Only a transient navigation hint; server entry and wallet records remain authoritative. */
export function saveEntryIntent(slug: string, title: string, quantity: number): void {
  if (typeof window === "undefined") return;
  const intent = { slug, title, quantity, savedAt: Date.now() };
  if (!validIntent(intent)) return;
  try { window.sessionStorage.setItem(storageKey, JSON.stringify(intent)); } catch { /* Navigation URLs still carry the quantity. */ }
}

export function readEntryIntent(): EntryIntent | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.sessionStorage.getItem(storageKey);
    const parsed: unknown = stored ? JSON.parse(stored) : null;
    if (validIntent(parsed)) return parsed;
    if (stored) window.sessionStorage.removeItem(storageKey);
  } catch { /* Storage is optional and never holds an authoritative entry. */ }
  return null;
}

export function clearEntryIntent(slug?: string): void {
  if (typeof window === "undefined") return;
  try {
    if (!slug || readEntryIntent()?.slug === slug) window.sessionStorage.removeItem(storageKey);
  } catch { /* The entry outcome is not controlled by browser storage. */ }
}
