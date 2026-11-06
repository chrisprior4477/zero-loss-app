import "server-only";
import zipcodes from "zipcodes";
import tzLookup from "tz-lookup";
import { getCountry } from "countries-and-timezones";
import * as countries from "i18n-iso-countries";
import english from "i18n-iso-countries/langs/en.json";

countries.registerLocale(english);
const countryAliases: Record<string, string> = {
  "brunei": "BN", "cabo verde": "CV", "côte d’ivoire": "CI", "laos": "LA",
  "micronesia": "FM", "moldova": "MD", "são tomé and príncipe": "ST", "syria": "SY", "vatican city": "VA",
};

export function countryTimeZones(country: string | null): string[] {
  if (!country) return [];
  const normalized = country.trim();
  const code = countryAliases[normalized.toLowerCase()] ?? countries.getAlpha2Code(normalized, "en");
  return code ? getCountry(code)?.timezones ?? [] : [];
}

/** Uses a ZIP centroid for U.S. addresses and unambiguous single-zone countries. */
export function addressTimeZone(country: string | null, region: string | null, postalCode: string | null): string | null {
  if (!country) return null;
  const zones = countryTimeZones(country);
  if (zones.length === 1) return zones[0];
  if (!/^(united states|usa|us)$/i.test(country.trim())) return null;
  if (!region || !postalCode) return null;
  const zip = postalCode.trim().match(/^\d{5}(?:-\d{4})?$/)?.[0].slice(0, 5);
  if (!zip) return null;
  const location = zipcodes.lookup(zip);
  const state = zipcodes.states.normalize(region.trim().toUpperCase());
  if (!location || !state || location.state !== state || location.country !== "US") return null;
  const result = tzLookup(location.latitude, location.longitude);
  return zones.includes(result) ? result : null;
}
