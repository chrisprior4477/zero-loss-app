import { expect, test } from "vitest";
import { PROFILE_COUNTRIES } from "./countries";
import { addressRequirements, completeMailingAddress, missingAddressFields } from "./address-requirements";

test.each(PROFILE_COUNTRIES)("has explicit address requirements for %s", country => {
  const rules = addressRequirements(country);
  expect(rules?.code).toMatch(/^[A-Z]{2}$/);
  expect(rules?.required).toContain("A");
});
test.each([
  ["United States", "ACSZ"], ["Canada", "ACSZ"], ["United Kingdom", "ACZ"],
  ["United Arab Emirates", "AS"], ["Singapore", "AZ"], ["Ireland", "AC"],
])("uses the documented required fields for %s", (country, required) => {
  expect(addressRequirements(country)?.required).toBe(required);
});
test("country-specific completeness does not require invented postal codes, regions or cities", () => {
  const address = { street:"1 Example Street", city:"", region:"Dubai", postalCode:"", country:"United Arab Emirates" };
  expect(completeMailingAddress(address)).toBe(true);
  expect(missingAddressFields({...address,country:"United States"})).toEqual(["city","postal code"]);
  expect(completeMailingAddress({...address,country:"United Kingdom",city:"London",region:"",postalCode:"SW1A 1AA"})).toBe(true);
  expect(completeMailingAddress({...address,country:"unknown"})).toBe(false);
});
