import { fundingReturnPath } from "@/lib/wallet/funding-navigation";

/** Only allow a sign-in return to a product's entry section on this site. */
export function entryReturnPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return /^\/items\/[a-z0-9]+(?:-[a-z0-9]+)*#enter-entry$/.test(value)
    ? value
    : null;
}

/** Sign-in can resume entry selection or funding, but not an arbitrary URL. */
export function signInReturnPath(value: unknown): string | null {
  return entryReturnPath(value) ?? fundingReturnPath(value);
}
