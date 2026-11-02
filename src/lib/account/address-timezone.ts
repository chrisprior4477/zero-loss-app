import "server-only";
import zipcodes from "zipcodes";
import tzLookup from "tz-lookup";
import { safeTimeZone } from "./timezone";

/** A ZIP centroid supplies an estimate; unknown addresses retain the saved preference. */
export function addressTimeZone(country: string | null, region: string | null, postalCode: string | null): string | null {
  if (!country || !region || !postalCode || !/^(united states|usa|us)$/i.test(country.trim())) return null;
  const zip = postalCode.trim().match(/^\d{5}(?:-\d{4})?$/)?.[0].slice(0, 5);
  if (!zip) return null;
  const location = zipcodes.lookup(zip);
  const state = zipcodes.states.normalize(region.trim().toUpperCase());
  if (!location || !state || location.state !== state || location.country !== "US") return null;
  return safeTimeZone(tzLookup(location.latitude, location.longitude));
}
