import countryRules from "./country-address-rules.json";

/** Google libaddressinput Address Data Service, retrieved 2026-11-06.
 * Data: CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/), https://chromium-i18n.appspot.com/ssl-address
 * Field definitions/defaults: https://github.com/google/libaddressinput/wiki/AddressValidationMetadata
 * Snapshot covers every PROFILE_COUNTRIES option; no runtime external lookup.
 * Core fields A/C/S/Z are checked here. Dependent locality can be included in A.
 */
export function addressRequirements(country: string) {
  return (countryRules as Record<string, { code: string; required: string; postalUsed: boolean }>)[country] ?? null;
}

export type MailingAddress = { street: string; city: string; region: string; postalCode: string; country: string };
export function missingAddressFields(address: MailingAddress): string[] {
  const rules = addressRequirements(address.country.trim());
  if (!rules) return ["supported country"];
  const fields: Record<string, [string, string]> = {
    A: [address.street, "street address"], C: [address.city, "city"],
    S: [address.region, "state or region"], Z: [address.postalCode, "postal code"],
  };
  return Object.entries(fields).filter(([key, [value]]) => rules.required.includes(key) && !value.trim()).map(([, [, label]]) => label);
}
export function completeMailingAddress(address: MailingAddress) {
  return Boolean(address.country.trim()) && missingAddressFields(address).length === 0;
}
