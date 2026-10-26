import { expect, test } from "vitest";
import { walletPanelFromLocation, walletPanelHref } from "./workspace";

test("old wallet links open their matching panel, including notification transactions", () => {
  expect(walletPanelFromLocation("?view=history", "#add-card")).toBe("cards");
  expect(walletPanelFromLocation("?view=history", "#add-funds")).toBe("add-funds");
  expect(walletPanelFromLocation("?transaction=owned-id")).toBe("transactions");
  expect(walletPanelFromLocation("?panel=cards", "#balance")).toBe("balance");
  expect(walletPanelFromLocation("?panel=unknown")).toBe("balance");
});

test("switching tabs retains the shopping task and removes an unrelated selected transaction", () => {
  const href = walletPanelHref("cards", "?view=history&from=playstation-5-slim&quantity=46&shop=%2Fbrowse%3Fcategory%3Delectronics&transaction=old");
  const url = new URL(href, "https://test.invalid");
  expect(url.searchParams.get("quantity")).toBe("46");
  expect(url.searchParams.get("shop")).toBe("/browse?category=electronics");
  expect(url.searchParams.has("transaction")).toBe(false);
  expect(walletPanelFromLocation(url.search, url.hash)).toBe("cards");
});
