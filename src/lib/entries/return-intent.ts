import { isEntryQuantity, parseEntryQuantity } from "./quantity";
import { browseReturnPath } from "@/lib/catalog/product-return";
export { parseEntryQuantity } from "./quantity";

const productSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const storageKey = "zero-loss-entry-intent-v1";
const maxAgeMs = 24 * 60 * 60 * 1000;

export type EntryIntent = { slug: string; title: string; quantity: number; savedAt: number };

export function productEntryHref(slug: string, quantity = 1, browseFrom?: string): string {
  if (!productSlugPattern.test(slug)) return "/browse";
  const selected = isEntryQuantity(quantity) ? quantity : 1;
  const params = new URLSearchParams();
  if (selected > 1) params.set("quantity", String(selected));
  const from = browseReturnPath(browseFrom);
  if (from) params.set("from", from);
  return `/items/${slug}${params.size ? `?${params}` : ""}#enter-entry`;
}

export function safeProductEntryReturn(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048 || !value.startsWith("/items/")) return null;
  const url = new URL(value, "https://navigation.invalid");
  const slug = url.pathname.slice(7);
  const quantity = url.searchParams.has("quantity") ? parseEntryQuantity(url.searchParams.get("quantity")) : 1;
  if (quantity === null) return null;
  return productEntryHref(slug, quantity, url.searchParams.get("from") ?? undefined) === value ? value : null;
}

/** Mark a successful demo-funding return so the entry button can give a one-time cue. */
export function fundedProductEntryHref(href: string): string {
  if (!safeProductEntryReturn(href)) return href;
  const selected = new URL(href, "https://navigation.invalid").searchParams.get("quantity");
  if (selected !== null && parseEntryQuantity(selected) === null) return href;
  const [path, hash] = href.split("#");
  return `${path}${path.includes("?") ? "&" : "?"}funded=1#${hash}`;
}

/** Keep a shopper on the same prize when they sign out from its page. */
export function currentProductEntryHref(pathname: string, search: string, intent: EntryIntent | null): string | null {
  const match = /^\/items\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(pathname);
  if (!match) return null;
  const slug = match[1];
  const queryQuantity = parseEntryQuantity(new URLSearchParams(search).get("quantity")) ?? 1;
  return productEntryHref(slug, intent?.slug === slug ? intent.quantity : queryQuantity, new URLSearchParams(search).get("from") ?? undefined);
}

function validIntent(value: unknown): value is EntryIntent {
  if (!value || typeof value !== "object") return false;
  const intent = value as Partial<EntryIntent>;
  return typeof intent.slug === "string" && productSlugPattern.test(intent.slug)
    && typeof intent.title === "string" && intent.title.length > 0 && intent.title.length <= 160 && !/[\u0000-\u001f]/.test(intent.title)
    && isEntryQuantity(intent.quantity)
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
