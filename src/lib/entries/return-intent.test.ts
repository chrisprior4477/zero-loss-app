import { afterEach, expect, test, vi } from "vitest";
import { clearEntryIntent, parseEntryQuantity, productEntryHref, readEntryIntent, saveEntryIntent } from "./return-intent";

afterEach(() => { sessionStorage.clear(); vi.restoreAllMocks(); });

test("a product return carries only a bounded ticket count to the entry section", () => {
  expect(productEntryHref("dyson-v8-cordless-vacuum", 3)).toBe("/items/dyson-v8-cordless-vacuum?quantity=3#enter-entry");
  expect(productEntryHref("dyson-v8-cordless-vacuum")).toBe("/items/dyson-v8-cordless-vacuum#enter-entry");
  expect(productEntryHref("../account", 3)).toBe("/browse");
  expect(productEntryHref("dyson-v8-cordless-vacuum", 100)).toBe("/items/dyson-v8-cordless-vacuum#enter-entry");
  expect(parseEntryQuantity("10")).toBe(10);
  expect(parseEntryQuantity("0")).toBeNull();
  expect(parseEntryQuantity("11")).toBeNull();
  expect(parseEntryQuantity(["2", "3"])).toBeNull();
});

test("the homepage hint remembers only a recent, valid navigation intent", () => {
  saveEntryIntent("dyson-v8-cordless-vacuum", "Dyson vacuum", 3);
  expect(readEntryIntent()).toMatchObject({ slug: "dyson-v8-cordless-vacuum", title: "Dyson vacuum", quantity: 3 });
  clearEntryIntent("other-product");
  expect(readEntryIntent()).not.toBeNull();
  clearEntryIntent("dyson-v8-cordless-vacuum");
  expect(readEntryIntent()).toBeNull();
});

test("tampered or expired hints never become a navigation link", () => {
  saveEntryIntent("safe-product", "Safe product", 2);
  const value = JSON.parse(sessionStorage.getItem("zero-loss-entry-intent-v1")!) as Record<string, unknown>;
  sessionStorage.setItem("zero-loss-entry-intent-v1", JSON.stringify({ ...value, slug: "//evil.test" }));
  expect(readEntryIntent()).toBeNull();
  saveEntryIntent("safe-product", "Safe product", 2);
  vi.spyOn(Date, "now").mockReturnValue((value.savedAt as number) + 25 * 60 * 60 * 1000);
  expect(readEntryIntent()).toBeNull();
});
