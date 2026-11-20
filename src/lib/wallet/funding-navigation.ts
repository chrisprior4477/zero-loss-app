import { isEntryQuantity, parseEntryQuantity } from "@/lib/entries/quantity";
import { maxNestedBrowseReturnLength, productBrowseReturnPath } from "@/lib/catalog/product-return";
import { depositRequestKeyPattern } from "@/lib/payments/provider";
import { purchaseChoicePattern } from "./purchase-selection-handoff";
import { shareUuid } from "@/lib/sharing/saved-shares";
import { notificationFilter, validNotice } from "@/lib/account/notification-return";

const productSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const entryPattern = /^ent_[a-f0-9]{32}$/;
const transactionPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
type EntryReviewContext = { transaction?: unknown; walletView?: unknown; alerts?: unknown; notice?: unknown };

export function entryReviewContext(query: EntryReviewContext = {}) {
  const transaction = typeof query.transaction === "string" && transactionPattern.test(query.transaction) ? query.transaction : undefined;
  const notice = validNotice(query.notice) ? query.notice : undefined;
  return {
    ...(transaction ? { transaction, ...(query.walletView === "1" ? { walletView: "1" } : {}) } : {}),
    ...(notice ? { alerts: notificationFilter(query.alerts), notice } : {}),
  };
}
export const purchaseDepositKeyPattern = /^purchase_fund_[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/;

export type FundingContinuation = { title: string; entryDepositReturn?: string; href: string; label?: "Back to purchase option" | "Back to entry review" | "Open gift card"; entryQuantity?: number; shortfallCents?: number; depositCents?: number; selectionUnavailable?: boolean };

/** Only an exact option selector is accepted; the purchase page rechecks ownership. */
export function purchaseOptionReturnPath(value: unknown): string | null {
  return typeof value === "string" && /^\/account\/purchase-options\/[a-z0-9]+(?:-[a-z0-9]+)*\?option=ent_[a-f0-9]{32}(?:&resume=wallet)?(?:&choice=[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12})?$/.test(value) ? value : null;
}

export function purchaseOptionHref(slug: string, entryId: string, choice?: unknown): string | null {
  return purchaseOptionReturnPath(`/account/purchase-options/${slug}?option=${entryId}&resume=wallet${typeof choice === "string" && purchaseChoicePattern.test(choice) ? `&choice=${choice}` : ""}`);
}

export function entryReviewHref(entryId: string, quantity = 1, filter?: unknown, context?: EntryReviewContext): string {
  if (!entryPattern.test(entryId)) return "/account/entries";
  const params = new URLSearchParams({ quantity: String(isEntryQuantity(quantity) ? quantity : 1), review: "entry", ...(filter === "active" ? { filter: "active" } : {}), ...entryReviewContext(context) });
  return `/account/entries/${entryId}?${params}#additional-entry-checkout`;
}

/** An existing entry review is distinct from a purchase-option return. */
export function entryReviewFundingHref(slug: string, entryId: string | undefined, quantity: number, filter?: unknown, context?: EntryReviewContext): string {
  if (!entryId || !entryPattern.test(entryId) || !productSlugPattern.test(slug)) return fundingHref(slug, undefined, quantity);
  const params = new URLSearchParams({ view: "history", from: slug, entry: entryId, quantity: String(isEntryQuantity(quantity) ? quantity : 1), review: "entry" });
  if (filter === "active") params.set("filter", "active");
  const origin = entryReviewContext(context);
  if (origin.transaction) params.set("entryTransaction", origin.transaction);
  if (origin.walletView) params.set("entryWalletView", origin.walletView);
  if (origin.notice) { params.set("alerts", origin.alerts ?? "all"); params.set("notice", origin.notice); }
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
export function fundingHref(productSlug?: string, entryId?: string, quantity?: number, browseReturn?: unknown, choice?: unknown, share?: unknown): string {
  const params = new URLSearchParams({ view: "history" });
  if (productSlug && productSlugPattern.test(productSlug)) params.set("from", productSlug);
  if (params.has("from") && entryId && entryPattern.test(entryId)) params.set("entry", entryId);
  else if (params.has("from") && isEntryQuantity(quantity) && quantity > 1) params.set("quantity", String(quantity));
  const browse = productBrowseReturnPath(browseReturn);
  if (params.has("from") && !params.has("entry") && browse) params.set("browse", browse);
  if (params.has("from") && !params.has("entry") && typeof share === "string" && shareUuid.test(share)) params.set("share", share);
  if (params.has("entry") && typeof choice === "string" && purchaseChoicePattern.test(choice)) params.set("choice", choice);
  // Fragments never reach the server. Mark generic funding links explicitly so
  // sign-in can distinguish Add funds from an ordinary Wallet History visit.
  if (!params.has("from")) params.set("panel", "funding");
  return `/account/wallet?${params}#add-funds`;
}

/** The key selects an owner-authorized receipt; it never supplies a payment amount. */
export function purchaseDepositRecoveryHref(slug: string, entryId: string | undefined, choice: unknown, requestKey: string): string {
  const href = fundingHref(slug, entryId, undefined, undefined, choice);
  if (!depositRequestKeyPattern.test(requestKey)) return href;
  return href.replace("#add-funds", `&deposit=${requestKey}#purchase-deposit`);
}

export function depositRecoveryHref(requestKey: string, fromDeposits = false, fromLedger = false, checkoutReturn?: unknown, entryReturn?: unknown): string {
  const entryFunding = entryFundingReturnPath(entryReturn);
  if (entryFunding && depositRequestKeyPattern.test(requestKey)) return entryFunding.replace("#add-funds", `&deposit=${encodeURIComponent(requestKey)}#purchase-deposit`);
  const checkout = purchaseOptionReturnPath(checkoutReturn);
  if (checkout && depositRequestKeyPattern.test(requestKey)) {
    const url = new URL(checkout, "https://navigation.invalid");
    return purchaseDepositRecoveryHref(url.pathname.split("/").at(-1)!, url.searchParams.get("option") ?? undefined, url.searchParams.get("choice"), requestKey);
  }
  return `/account/wallet?view=history&deposit=${encodeURIComponent(requestKey)}${fromDeposits ? "&panel=deposits" : ""}${fromLedger ? "&walletView=1" : ""}#purchase-deposit`;
}

export function entryFundingReturnPath(value: unknown): string | null {
  const path = fundingReturnPath(value);
  return path && new URL(path, "https://navigation.invalid").searchParams.get("review") === "entry" ? path : null;
}

/** Exact allowlist for the funding destination used after sign-in. */
export function fundingReturnPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length > maxNestedBrowseReturnLength || /[\\\s\u0000-\u001f]/.test(value)) return null;
  if (/^\/account\/wallet\?view=history&from=[a-z0-9]+(?:-[a-z0-9]+)*&entry=ent_[a-f0-9]{32}&quantity=[1-9]\d*&review=entry(?:&filter=active)?(?:&entryTransaction=[^&#]+(?:&entryWalletView=1)?)?(?:&alerts=[^&#]+&notice=[^&#]+)?#add-funds$/.test(value)) {
    const params = new URL(value, "https://navigation.invalid").searchParams;
    if (params.has("entryTransaction") && !transactionPattern.test(params.get("entryTransaction")!)) return null;
    if (params.has("notice") && (!validNotice(params.get("notice")) || params.get("alerts") !== notificationFilter(params.get("alerts")))) return null;
    return parseEntryQuantity(params.get("quantity")) !== null ? value : null;
  }
  if (!/^\/account\/wallet\?view=history(?:&panel=funding|&from=[a-z0-9]+(?:-[a-z0-9]+)*(?:&entry=ent_[a-f0-9]{32}|&quantity=[1-9]\d*)?(?:&browse=[^&#]+)?(?:&share=[^&#]+)?(?:&choice=[0-9a-f-]{36})?)?#add-funds$/.test(value)) return null;
  const params = new URL(value, "https://navigation.invalid").searchParams;
  if (params.has("browse") && (params.has("entry") || !productBrowseReturnPath(params.get("browse")))) return null;
  if (params.has("share") && (params.has("entry") || !shareUuid.test(params.get("share")!))) return null;
  if (params.has("choice") && (!params.has("entry") || !purchaseChoicePattern.test(params.get("choice")!))) return null;
  const selected = params.get("quantity");
  return selected === null || parseEntryQuantity(selected) !== null ? value : null;
}
