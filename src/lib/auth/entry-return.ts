import { fundingReturnPath, purchaseOptionReturnPath } from "@/lib/wallet/funding-navigation";
import { currentProductEntryHref, productEntryReturnPath } from "@/lib/entries/return-intent";
import { accountReturnPath } from "./account-return";
import { businessSignupPath } from "@/lib/business/application";
import { productBrowseReturnPath } from "@/lib/catalog/product-return";

/** Only allow a sign-in return to a product's entry section on this site. */
export function entryReturnPath(value: unknown): string | null {
  return productEntryReturnPath(value);
}

/** Referrer is only a fallback when a sign-out form could not send its return path. */
export function productReturnFromReferer(referer: unknown, requestHost: unknown): string | null {
  if (typeof referer !== "string" || typeof requestHost !== "string") return null;
  try {
    const url = new URL(referer);
    return url.host === requestHost ? currentProductEntryHref(url.pathname, url.search, null) : null;
  } catch {
    return null;
  }
}

/** Resume only known in-site destinations, never an arbitrary redirect URL. */
export function signInReturnPath(value: unknown): string | null {
  if (value === businessSignupPath) return businessSignupPath;
  if (typeof value === "string" && /^\/\?(?:(?:ending-prize=[a-z0-9-]+#ending-soon)|(?:marketplace-prize=[a-z0-9-]+#marketplace-mosaic-title)|(?:choice-prize=[a-z0-9-]+#dollar-choice-title)|(?:upgrade-prize=[a-z0-9-]+#dollar-choice-light-title))$/.test(value)) return value;
  if (typeof value === "string" && /^\/browse(?:[?#]|$)/.test(value)) {
    const path = value.endsWith("#search-results") ? value.slice(0, -"#search-results".length) : value;
    if (productBrowseReturnPath(path)) return value;
  }
  if (typeof value === "string" && (/^\/faq(?:#faq-[a-z0-9-]+)?$/.test(value) || /^\/rewards\/[a-z0-9-]+(?:#reward-values)?$/.test(value))) return value;
  return sharedProductReturnPath(value) ?? entryReturnPath(value) ?? fundingReturnPath(value) ?? purchaseOptionReturnPath(value) ?? accountReturnPath(value);
}

export function sharedProductReturnPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 24576 || !/^\/items\/[a-z0-9]+(?:-[a-z0-9]+)*\?/i.test(value) || /[\\\s\u0000-\u001f]/.test(value)) return null;
  const url = new URL(value, "https://navigation.invalid");
  const params = url.searchParams;
  const keys = [...params.keys()];
  if (url.hash || new Set(keys).size !== keys.length || keys.some(key => !["share", "shared", "saveShared", "reviewShare", "from"].includes(key))) return null;
  const share = params.get("share");
  const shared = params.get("shared");
  if (share === null ? shared !== "1" : shared !== null || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(share)) return null;
  const review = params.get("reviewShare");
  if (review !== null && (review !== "options" && review !== "membership" || params.has("saveShared"))) return null;
  if (params.has("saveShared") && params.get("saveShared") !== "1") return null;
  if (params.has("from") && !productBrowseReturnPath(params.get("from"))) return null;
  return value;
}

/** Carry the same allowlisted destination between account forms. */
export function authNavigationHref(page: "/login" | "/signup" | "/forgot-password" | "/reset-password", value: unknown): string {
  const returnTo = signInReturnPath(value);
  return returnTo ? `${page}?next=${encodeURIComponent(returnTo)}` : page;
}

export function signupVerificationPath(value: unknown): string {
  const returnTo = signInReturnPath(value);
  return returnTo ? `/auth/confirm?next=${encodeURIComponent(returnTo)}` : "/auth/confirm";
}
