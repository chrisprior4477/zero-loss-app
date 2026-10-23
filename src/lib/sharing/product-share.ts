export type ProductShareItem = { slug: string; title: string; image?: string; retailer?: string; value?: number };
export const PRODUCT_SHARE_EVENT = "zero-loss-open-product-share";
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isProductShareItem(value: unknown): value is ProductShareItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<ProductShareItem>;
  return typeof item.slug === "string" && item.slug.length <= 150 && slugPattern.test(item.slug)
    && typeof item.title === "string" && item.title.length > 0 && item.title.length <= 300;
}

/** Share only the public listing, never the current account/entry URL or query. */
export function productShareUrl(origin: string, slug: string): string {
  if (!slugPattern.test(slug)) throw new Error("Invalid product");
  const site = new URL(origin);
  if (!["https:", "http:"].includes(site.protocol)) throw new Error("Invalid site");
  return new URL(`/items/${slug}`, site.origin).href;
}

export function productShareText(title: string): string {
  return `Thought you might like ${title} on Zero Loss. Take a look:`;
}

export function isAppleMobile(userAgent: string, platform: string, maxTouchPoints: number): boolean {
  return /iPhone|iPad|iPod/i.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1);
}

export function messageHref(phone: string, body: string, appleMobile: boolean): string {
  const clean = phone.trim();
  if (clean && (!/^\+?[\d ()\-.]+$/.test(clean) || !/^\d{5,15}$/.test(clean.replace(/\D/g, "")))) throw new Error("Enter a valid phone number.");
  const recipient = clean.replace(/[^+\d]/g, "");
  // iOS uses &body; Android SMS handlers use the standard ?body query.
  return `sms:${recipient}${appleMobile ? "&" : "?"}body=${encodeURIComponent(body)}`;
}

export function emailHref(email: string, title: string, body: string): string {
  const recipient = email.trim();
  if (recipient && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient) || /[\r\n?&#;,]/.test(recipient))) throw new Error("Enter a valid email address.");
  return `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
}

export function crewLookupKind(query: string): "email" | "phone" | "name" {
  if (query.includes("@")) return "email";
  return /^[+\d ()\-.]+$/.test(query.trim()) && /\d/.test(query) ? "phone" : "name";
}

/** UI-only, per-tab suppression. This is not an account preference or entry record. */
export function shareDismissalKey(accountId: string, slug: string): string {
  return `zero-loss:share-dismissed:v1:${accountId}:${slug}`;
}
