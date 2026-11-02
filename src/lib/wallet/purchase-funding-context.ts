import { fundingHref } from "./funding-navigation";

// Navigation context only. Ownership, price and payment are verified on the server.
export type PurchaseFundingContext = { href: string; slug: string; selected: string[]; decline: boolean };
export const purchaseSelectionKey = "zero-loss-purchase-funding-selection";
let current: PurchaseFundingContext | null = null;
const listeners = new Set<() => void>();

export function purchaseFundingHref(slug: string, entryId: string | undefined): string | null {
  if (!entryId || !/^ent_[a-f0-9]{32}$/.test(entryId) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;
  return fundingHref(slug, entryId).replace("#add-funds", "#balance");
}
export function setPurchaseFundingContext(value: PurchaseFundingContext | null) {
  if (current === value) return;
  current = value;
  listeners.forEach(listener => listener());
}
export function getPurchaseFundingContext() { return current; }
export function subscribePurchaseFundingContext(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
