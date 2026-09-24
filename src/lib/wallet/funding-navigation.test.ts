import { expect, test } from "vitest";
import { fundingHref, fundingReturnPath } from "./funding-navigation";

test("funding retains one exact purchase entry, never an arbitrary return URL", () => {
  const entry = "ent_11111111111111111111111111111111";
  const destination = `/account/wallet?view=history&from=babys-essentials-bundle&entry=${entry}#add-funds`;
  expect(fundingHref("babys-essentials-bundle", entry)).toBe(destination);
  expect(fundingReturnPath(destination)).toBe(destination);
  expect(fundingHref("babys-essentials-bundle", "https://evil.test")).not.toContain("entry=");
  expect(fundingReturnPath(`${destination.replace("#add-funds", "")}&entry=${entry}#add-funds`)).toBeNull();
  expect(fundingReturnPath(`/account/wallet?view=history&entry=${entry}#add-funds`)).toBeNull();
});

test("funding links target the form and retain the originating prize", () => {
  expect(fundingHref("samsung-m70h-tv")).toBe("/account/wallet?view=history&from=samsung-m70h-tv#add-funds");
  expect(fundingHref()).toBe("/account/wallet?view=history#add-funds");
  expect(fundingReturnPath(fundingHref("samsung-m70h-tv"))).toBe(fundingHref("samsung-m70h-tv"));
});

test("invalid prize identifiers cannot turn into URL parameters or redirects", () => {
  for (const value of ["//evil.test", "../account", "thing&next=https://evil.test", "", "thing#other"]) {
    expect(fundingHref(value)).toBe("/account/wallet?view=history#add-funds");
  }
});

test.each([
  "https://evil.test/account/wallet?view=history#add-funds",
  "//evil.test/account/wallet?view=history#add-funds",
  "/account/wallet?view=history&from=../account#add-funds",
  "/account/wallet?view=history&from=%2F%2Fevil.test#add-funds",
  "/account/wallet?view=history&from=thing&next=https://evil.test#add-funds",
  "/account/wallet?view=history&from=thing&from=other#add-funds",
  "/account/wallet?view=card#add-funds",
  "/account/wallet?view=history#transactions",
  "/account/wallet?view=history#add-funds\n",
  null,
  ["/account/wallet?view=history#add-funds"],
])("rejects destinations outside the exact funding path: %s", (value) => {
  expect(fundingReturnPath(value)).toBeNull();
});
