import { existsSync, readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { demoProducts, getDemoProduct } from "@/lib/catalog/demo-products";
import { endingSoonProducts } from "@/lib/catalog/ending-soon-products";
import { placeholderDiscoveryOpportunities } from "./placeholder-data";
import { livePulseItems } from "./live-pulse";
import { storedActivityFixture } from "@/lib/account/activity.test-fixture";

test("a saved ticker outcome opens its reward and keeps every sample statistic", () => {
  const activity = storedActivityFixture();
  Object.assign(activity.activity[1], { slug: "dunkin-25-gift-card", rewardId: "dunkin-reward", rewardStatus: "ready" });
  const items = livePulseItems(null, activity);
  expect(items.find(item => item.label === "Dunkin' Donuts $25 card")).toMatchObject({ value: "Ready to claim", href: "/account/wallet?reward=dunkin-25-gift-card&rewardId=dunkin-reward" });
  expect(items).toHaveLength(livePulseItems(null).length);
  expect(items.find(item => item.label === "193 winners")).toEqual(livePulseItems(null).find(item => item.label === "193 winners"));
  expect(livePulseItems(null, { ...activity, source: "unavailable" })).toEqual(livePulseItems(null));
});

test("each ticker product opens a real catalog listing, with the requested starting counts", () => {
  const items = livePulseItems(null);
  for (const item of items.filter(item => item.href.startsWith("/items/"))) {
    expect(getDemoProduct(item.href.slice(7)), item.href).toBeDefined();
  }
  expect(items.find(item => item.label === "AirPods Pro")?.value).toBe("Only 2 left");
  expect(items.find(item => item.label === "Nintendo Switch")?.value).toBe("6 tickets left");
  expect(items.find(item => item.label === "Publix gift card")?.value).toBe("11 entries left");
  expect(items.some(item => /grocery reward|airpod pros/i.test(item.label))).toBe(false);
});

test("remaining counts follow the authoritative snapshot and never advertise tickets in a full pool", () => {
  const current = { "airpods-pro": { slug: "airpods-pro", capacity: 750, sold: 749, remaining: 1, entryPriceCents: 100, repeatableScenario: false } };
  expect(livePulseItems(current)[0].value).toBe("Only 1 left");
  current["airpods-pro"].sold = 750;
  current["airpods-pro"].remaining = 0;
  expect(livePulseItems(current)[0].value).toBe("Pool full");
});

test("new offers use the existing Ending Soon cards, real local images and matching persisted pool snapshots", () => {
  const migration = readFileSync("supabase/migrations/20261022231034_homepage_ticker_offerings.sql", "utf8");
  for (const product of endingSoonProducts) {
    expect(demoProducts.filter(item => item.slug === product.slug)).toHaveLength(1);
    const card = placeholderDiscoveryOpportunities.find(item => item.href === `/items/${product.slug}`);
    expect(card).toMatchObject({ title: product.title, image: product.gallery[0].src, ticketCapacity: product.capacity, ticketsSold: product.sold });
    expect(existsSync(`public${product.gallery[0].src}`)).toBe(true);
    expect(migration).toContain(`'${product.slug}'`);
    expect(migration).toContain(`${product.value * 100}, 100, ${product.capacity}, ${product.sold}, 'active', false`);
    expect(product.capacity).toBe(product.value * 3);
  }
  expect(getDemoProduct("publix-100-gift-card")?.sold).toBe(123);
});
