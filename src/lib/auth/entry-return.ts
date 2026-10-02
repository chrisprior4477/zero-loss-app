import { fundingReturnPath } from "@/lib/wallet/funding-navigation";
import { currentProductEntryHref } from "@/lib/entries/return-intent";
import { accountReturnPath } from "./account-return";

/** Only allow a sign-in return to a product's entry section on this site. */
export function entryReturnPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return /^\/items\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\?quantity=(?:[1-9]|10))?#enter-entry$/.test(value)
    ? value
    : null;
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
  return entryReturnPath(value) ?? fundingReturnPath(value) ?? accountReturnPath(value);
}

/** Carry the same allowlisted destination between account forms. */
export function authNavigationHref(page: "/login" | "/signup", value: unknown): string {
  const returnTo = signInReturnPath(value);
  return returnTo ? `${page}?next=${encodeURIComponent(returnTo)}` : page;
}

export function signupVerificationPath(value: unknown): string {
  const returnTo = signInReturnPath(value);
  return returnTo ? `/auth/confirm?next=${encodeURIComponent(returnTo)}` : "/auth/confirm";
}
