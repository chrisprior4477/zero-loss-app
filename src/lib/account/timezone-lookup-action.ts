"use server";

import { addressTimeZone, countryTimeZones } from "./address-timezone";

export async function lookupAddressTimeZone(country: string, region: string, postalCode: string) {
  if ([country, region, postalCode].some(value => typeof value !== "string" || value.length > 100)) return { zone: null, options: [] };
  const options = countryTimeZones(country);
  return { zone: addressTimeZone(country, region, postalCode), options: options.length ? options : Intl.supportedValuesOf("timeZone") };
}
