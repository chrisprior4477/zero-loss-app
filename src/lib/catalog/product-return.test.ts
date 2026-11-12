import { expect, test } from "vitest";
import { freeEntryHref, productBrowseReturnHref, productBrowseReturnLabel, productHrefWithBrowseReturn } from "./product-return";
import { popularRewardBrands } from "./popular-rewards";

test("product links carry their exact marketplace category or search", () => {
  expect(productHrefWithBrowseReturn("dyson-v8-cordless-vacuum", "/browse?category=home-essentials&available=1"))
    .toBe("/items/dyson-v8-cordless-vacuum?from=%2Fbrowse%3Fcategory%3Dhome-essentials%26available%3D1");
  expect(productBrowseReturnLabel("/browse?sort=ending-soon")).toBe("Ending Soon");
  expect(productBrowseReturnLabel("/browse?category=groceries")).toBe("Groceries");
  expect(productBrowseReturnLabel("/browse?q=coffee")).toBe("Search results");
});

test("a product cannot use an external or unrelated return destination", () => {
  for (const value of [undefined, "https://evil.test/browse", "//evil.test/browse", "/account/wallet", "/browse#fake", "/browse?next=https://evil.test", "/rewards/unknown", "/rewards/nintendo?next=https://evil.test", "/rewards/nintendo#other", "//evil.test/rewards/nintendo"]) {
    expect(productBrowseReturnHref(value)).toBe("/browse");
    expect(new URL(freeEntryHref("airpods-pro", value), "https://example.test").searchParams.has("from")).toBe(false);
  }
});

test("an Ending Soon prize anchor and valid batch survive a product round trip", () => {
  const source = "/browse?category=ending-soon&q=Walmart&maxValue=100&batch=2#prize-walmart-100-gift-card";
  const detail = new URL(productHrefWithBrowseReturn("walmart-100-gift-card", source), "https://example.test");
  expect(productBrowseReturnHref(detail.searchParams.get("from"))).toBe(source);
  for (const invalid of [source.replace("batch=2", "batch=0"),
    source.replace("#prize-walmart-100-gift-card", "#arbitrary"), source.replace("batch=2", "batch=2&batch=3")]) {
    expect(productBrowseReturnHref(invalid)).toBe("/browse");
  }
});

test("ordinary Browse cards retain their anchor and exact search without allowing unrelated destinations", () => {
  for (const source of ["/browse#prize-bath-body-works-25-gift-card", "/browse?category=beauty&batch=2#prize-bath-body-works-25-gift-card",
    "/browse?q=lipstick&category=beauty&maxValue=100&batch=2#prize-mac-lipstick"]) {
    const detail = new URL(productHrefWithBrowseReturn("mac-lipstick", source), "https://example.test");
    expect(productBrowseReturnHref(detail.searchParams.get("from"))).toBe(source);
  }
  for (const invalid of ["/browse#arbitrary", "/browse#prize-../wallet", "/browse?category=beauty&batch=9007199254740992#prize-mac-lipstick",
    "/browse?category=beauty&category=electronics#prize-mac-lipstick", "//evil.test/browse#prize-mac-lipstick"]) {
    expect(productBrowseReturnHref(invalid)).toBe("/browse");
  }
});

test.each(popularRewardBrands)("$name products return to that retailer's reward choices", brand => {
  const destination = `/rewards/${brand.slug}`;
  expect(productBrowseReturnHref(destination)).toBe(destination);
  expect(productBrowseReturnLabel(destination)).toBe(`${brand.name} rewards`);
  expect(new URL(freeEntryHref(`${brand.slug}-25-gift-card`, destination), "https://example.test").searchParams.get("from")).toBe(destination);
});

test("free-entry links retain the complete shopping search and filters", () => {
  const browse = "/browse?category=electronics&sort=fewest-left&q=wireless&type=pictured";
  const href = new URL(freeEntryHref("airpods-pro", browse), "https://example.test");
  expect(href.searchParams.get("offering")).toBe("airpods-pro");
  expect(href.searchParams.get("from")).toBe(browse);
});


test("Favorites is a safe return destination without allowing other account routes", () => {
  expect(productBrowseReturnHref("/account/favorites")).toBe("/account/favorites");
  expect(productBrowseReturnLabel("/account/favorites")).toBe("Favorites");
  expect(productHrefWithBrowseReturn("nike-court-shot-shoes", "/account/favorites")).toBe("/items/nike-court-shot-shoes?from=%2Faccount%2Ffavorites");
  for (const value of ["/account/favorites?next=/account/wallet", "/account/favorites/other", "/account/favorites#other", "//evil.test/account/favorites"]) expect(productBrowseReturnHref(value)).toBe("/browse");
});

test("a shared prize returns to the exact saved share and retains that route through free entry", () => {
  const shared = "/account/favorites?tab=shared&share=11111111-1111-4111-8111-111111111111";
  expect(productBrowseReturnHref(shared)).toBe(shared);
  expect(productBrowseReturnHref("/account/favorites?tab=shared")).toBe("/account/favorites?tab=shared");
  expect(productBrowseReturnLabel(shared)).toBe("Shared with You");
  expect(new URL(productHrefWithBrowseReturn("playstation-5-slim", shared), "https://example.test").searchParams.get("from")).toBe(shared);
  expect(new URL(freeEntryHref("playstation-5-slim", shared), "https://example.test").searchParams.get("from")).toBe(shared);
  for (const invalid of [
    shared + "&next=/account/wallet", shared + "&share=another", shared + "#other",
    "/account/favorites?tab=shared&share=invalid", "/account/favorites?tab=shared&share=",
    "/account/favorites?tab=shared&tab=shared", "/account/favorites?share=11111111-1111-4111-8111-111111111111",
  ]) expect(productBrowseReturnHref(invalid)).toBe("/browse");
});

test("Crew product links return to the exact person and pick with a safe account route", () => {
  const crew = "/account/crew?member=sample-Daniel&pick=dyson-v8-cordless-vacuum#crew-intro";
  expect(productBrowseReturnHref(crew)).toBe(crew);
  expect(productBrowseReturnLabel(crew)).toBe("Your Crew");
  expect(productBrowseReturnHref(crew.replace("#crew-intro", ""))).toBe(crew.replace("#crew-intro", ""));
  expect(new URL(productHrefWithBrowseReturn("dyson-v8-cordless-vacuum", crew), "https://example.test").searchParams.get("from")).toBe(crew);
  expect(new URL(freeEntryHref("dyson-v8-cordless-vacuum", crew), "https://example.test").searchParams.get("from")).toBe(crew);
  for (const bad of [crew + "&next=/account/wallet", crew.replace("#crew-intro", "&next=/account/wallet#crew-intro"), crew.replace("#crew-intro", "#other"),
    crew.replace("sample-Daniel", "../wallet"), crew.replace("pick=dyson-v8-cordless-vacuum", "pick=../wallet"), crew.replace("&pick=", "&member=someone&pick="),
    "https://evil.test" + crew, "/account/crew?member=sample-Daniel#crew-intro"]) expect(productBrowseReturnHref(bad)).toBe("/browse");
});
