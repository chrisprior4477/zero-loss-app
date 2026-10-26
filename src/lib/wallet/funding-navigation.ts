import { isEntryQuantity, parseEntryQuantity } from "@/lib/entries/quantity";

const productSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const entryPattern = /^ent_[a-f0-9]{32}$/;

/** Carry only a catalog identifier, never a caller-provided redirect URL. */
export function fundingHref(productSlug?: string, entryId?: string, quantity?: number, extraEntries = false): string {
  const params = new URLSearchParams({ view: "history" });
  if (productSlug && productSlugPattern.test(productSlug)) params.set("from", productSlug);
  if (params.has("from") && entryId && entryPattern.test(entryId)) params.set("entry", entryId);
  if (params.has("entry") && extraEntries && isEntryQuantity(quantity)) {
    params.set("quantity", String(quantity));
    params.set("resume", "extra-entries");
  }
  else if (!params.has("entry") && params.has("from") && isEntryQuantity(quantity) && quantity > 1) params.set("quantity", String(quantity));
  return `/account/wallet?${params}#add-funds`;
}

/** Exact allowlist for the funding destination used after sign-in. */
export function fundingReturnPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!/^\/account\/wallet\?view=history(?:&from=[a-z0-9]+(?:-[a-z0-9]+)*(?:&entry=ent_[a-f0-9]{32}(?:&quantity=[1-9]\d*&resume=extra-entries)?|&quantity=[1-9]\d*)?)?#add-funds$/.test(value)) return null;
  const selected = new URL(value, "https://navigation.invalid").searchParams.get("quantity");
  return selected === null || parseEntryQuantity(selected) !== null ? value : null;
}

export function extraEntryReturnHref(entryId: string, quantity: number): string {
  return entryPattern.test(entryId) && isEntryQuantity(quantity)
    ? `/account/entries/${entryId}?quantity=${quantity}#additional-entry-checkout`
    : "/account/entries";
}
