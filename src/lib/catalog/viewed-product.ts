import { productBrowseReturnPath } from "./product-return";

const storageKey = "zero-loss-viewed-product-v1";
export const SHOPPING_REMINDER_EVENT = "zero-loss-shopping-reminder-changed";
export type ViewedProduct = { slug: string; browseReturn?: string; savedAt: number };

function valid(value: unknown): value is ViewedProduct {
  if (!value || typeof value !== "object") return false;
  const hint = value as Partial<ViewedProduct>;
  return typeof hint.slug === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(hint.slug)
    && (hint.browseReturn === undefined || productBrowseReturnPath(hint.browseReturn) !== null)
    && typeof hint.savedAt === "number" && Number.isFinite(hint.savedAt)
    && hint.savedAt <= Date.now() && Date.now() - hint.savedAt < 24 * 60 * 60 * 1000;
}

/** A tab-local navigation hint only; never an entry, payment, or account record. */
export function rememberViewedProduct(slug: string, browseReturn?: string): void {
  if (typeof window === "undefined") return;
  const hint: ViewedProduct = { slug, savedAt: Date.now() };
  const browse = productBrowseReturnPath(browseReturn);
  if (browse) hint.browseReturn = browse;
  if (!valid(hint)) return;
  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(hint));
    window.dispatchEvent(new Event(SHOPPING_REMINDER_EVENT));
  } catch { /* Browsing still works when storage is unavailable. */ }
}

export function readViewedProduct(): ViewedProduct | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.sessionStorage.getItem(storageKey);
    const hint: unknown = stored ? JSON.parse(stored) : null;
    if (valid(hint)) return hint;
    if (stored) window.sessionStorage.removeItem(storageKey);
  } catch { /* Optional navigation hint. */ }
  return null;
}

export function clearViewedProduct(slug?: string): void {
  if (typeof window === "undefined") return;
  try {
    if (!slug || readViewedProduct()?.slug === slug) window.sessionStorage.removeItem(storageKey);
  } catch { /* Optional navigation hint. */ }
}
