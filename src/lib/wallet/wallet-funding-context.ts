import { fundingHref } from "./funding-navigation";
import { useEffect, useSyncExternalStore } from "react";

// Navigation context only. Ownership, price and payment are verified on the server.
type PurchaseFundingContext = { href: string; slug: string; selected: string[]; decline: boolean; ownerId?: string; available?: string[]; needsReview?: boolean; freezeSelection?: () => void };
type WalletFundingContext = PurchaseFundingContext | { href: string; rememberEntry?: () => void };
export const purchaseSelectionKey = "zero-loss-purchase-funding-selection";
let current: WalletFundingContext | null = null;
const listeners = new Set<() => void>();

export function walletBalanceFundingHref(href: string): string {
  return href.replace(/#add-funds$/, "&landing=balance#balance");
}

export function purchaseFundingHref(slug: string, entryId: string | undefined, choice?: string): string | null {
  if (!entryId || !/^ent_[a-f0-9]{32}$/.test(entryId) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;
  return walletBalanceFundingHref(fundingHref(slug, entryId, undefined, undefined, choice));
}
export function setWalletFundingContext(value: WalletFundingContext | null) {
  if (current === value) return;
  current = value;
  listeners.forEach(listener => listener());
}
export function getWalletFundingContext() { return current; }
export function subscribeWalletFundingContext(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function useWalletFundingContext() {
  return useSyncExternalStore(subscribeWalletFundingContext, getWalletFundingContext, () => null);
}

/** Publish the same return as the entry form while that selection is on screen. */
export function useEntryWalletFunding(addFundsHref: string | null, rememberEntry?: () => void) {
  useEffect(() => {
    if (!addFundsHref) return;
    const context = { href: walletBalanceFundingHref(addFundsHref), rememberEntry };
    setWalletFundingContext(context);
    return () => { if (current === context) setWalletFundingContext(null); };
  }, [addFundsHref, rememberEntry]);
}

export function rememberWalletSelection(context: WalletFundingContext) {
  if (!("selected" in context)) {
    context.rememberEntry?.();
    return;
  }
  const { freezeSelection, ...draft } = context;
  freezeSelection?.();
  try { sessionStorage.setItem(purchaseSelectionKey, JSON.stringify(draft)); }
  catch { /* The exact option still travels in the wallet URL. */ }
}
