import { isEntryQuantity, parseEntryQuantity } from "@/lib/entries/quantity";
import { productBrowseReturnPath } from "@/lib/catalog/product-return";
import { purchaseChoicePattern } from "./purchase-selection-handoff";

const productSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const entryPattern = /^ent_[a-f0-9]{32}$/;

export type FundingContinuation = { title: string; href: string; label?: "Back to purchase option" | "Back to entry review"; entryQuantity?: number; shortfallCents?: number; depositCents?: number };

/** Only an exact option selector is accepted; the purchase page rechecks ownership. */
export function purchaseOptionReturnPath(value: unknown): string | null {
  return typeof value === "string" && /^\/account\/purchase-options\/[a-z0-9]+(?:-[a-z0-9]+)*\?option=ent_[a-f0-9]{32}(?:&resume=wallet)?(?:&choice=[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12})?$/.test(value) ? value : null;
}

export function purchaseOptionHref(slug: string, entryId: string, choice?: unknown): string | null {
  return purchaseOptionReturnPath(`/account/purchase-options/${slug}?option=${entryId}&resume=wallet${typeof choice === "string" && purchaseChoicePattern.test(choice) ? `&choice=${choice}` : ""}`);
}

export function entryReviewHref(entryId: string, quantity = 1): string {
  if (!entryPattern.test(entryId)) return "/account/entries";
  return `/account/entries/${entryId}?quantity=${isEntryQuantity(quantity) ? quantity : 1}&review=entry#additional-entry-checkout`;
}

/** An existing entry review is distinct from a purchase-option return. */
export function entryReviewFundingHref(slug: string, entryId: string | undefined, quantity: number): string {
  if (!entryId || !entryPattern.test(entryId) || !productSlugPattern.test(slug)) return fundingHref(slug, undefined, quantity);
  const params = new URLSearchParams({ view: "history", from: slug, entry: entryId, quantity: String(isEntryQuantity(quantity) ? quantity : 1), review: "entry" });
  return `/account/wallet?${params}#add-funds`;
}

/** Compute from the current server price and balance; never accept a URL amount. */
export function entryFundingAmounts(priceCents: number | null, quantity: number, balanceCents: number | null): { shortfallCents: number; depositCents: number } | undefined {
  if (!isEntryQuantity(quantity) || priceCents === null || balanceCents === null || !Number.isSafeInteger(priceCents) || priceCents <= 0 || !Number.isSafeInteger(balanceCents) || balanceCents < 0) return;
  const total = priceCents * quantity;
  if (!Number.isSafeInteger(total)) return;
  const shortfallCents = Math.max(0, total - balanceCents);
  const depositCents = Math.ceil(shortfallCents / 100) * 100;
  return Number.isSafeInteger(depositCents) ? { shortfallCents, depositCents } : undefined;
}

/** Carry catalog identifiers and an allowlisted marketplace address, never an arbitrary redirect. */
export function fundingHref(productSlug?: string, entryId?: string, quantity?: number, browseReturn?: unknown, choice?: unknown): string {
  const params = new URLSearchParams({ view: "history" });
  if (productSlug && productSlugPattern.test(productSlug)) params.set("from", productSlug);
  if (params.has("from") && entryId && entryPattern.test(entryId)) params.set("entry", entryId);
  else if (params.has("from") && isEntryQuantity(quantity) && quantity > 1) params.set("quantity", String(quantity));
  const browse = productBrowseReturnPath(browseReturn);
  if (params.has("from") && !params.has("entry") && browse) params.set("browse", browse);
  if (params.has("entry") && typeof choice === "string" && purchaseChoicePattern.test(choice)) params.set("choice", choice);
  return `/account/wallet?${params}#add-funds`;
}

/** Exact allowlist for the funding destination used after sign-in. */
export function fundingReturnPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 4096 || /[\\\s\u0000-\u001f]/.test(value)) return null;
  if (/^\/account\/wallet\?view=history&from=[a-z0-9]+(?:-[a-z0-9]+)*&entry=ent_[a-f0-9]{32}&quantity=[1-9]\d*&review=entry#add-funds$/.test(value)) {
    return parseEntryQuantity(new URL(value, "https://navigation.invalid").searchParams.get("quantity")) !== null ? value : null;
  }
  if (!/^\/account\/wallet\?view=history(?:&from=[a-z0-9]+(?:-[a-z0-9]+)*(?:&entry=ent_[a-f0-9]{32}|&quantity=[1-9]\d*)?(?:&browse=[^&#]+)?(?:&choice=[0-9a-f-]{36})?)?#add-funds$/.test(value)) return null;
  const params = new URL(value, "https://navigation.invalid").searchParams;
  if (params.has("browse") && (params.has("entry") || !productBrowseReturnPath(params.get("browse")))) return null;
  if (params.has("choice") && (!params.has("entry") || !purchaseChoicePattern.test(params.get("choice")!))) return null;
  const selected = params.get("quantity");
  return selected === null || parseEntryQuantity(selected) !== null ? value : null;
}
