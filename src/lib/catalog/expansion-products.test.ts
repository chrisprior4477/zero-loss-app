// @vitest-environment node
import { expect, test } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { demoProducts, getDemoProduct } from "./demo-products";
import { expansionProducts } from "./expansion-products";
import { productMatchesMarketplaceCategory } from "./navigation";
import { searchCatalogMatches } from "./search";
import { dollarChoiceDemoItems } from "@/lib/home/demo-data";
import { placeholderDiscoveryOpportunities } from "@/lib/home/placeholder-data";

test("the pilot is a unique pictured product discoverable through the appropriate top menus", () => {
  expect(expansionProducts).toHaveLength(1);
  const drill = getDemoProduct("dewalt-20v-drill-kit")!;
  expect(demoProducts.filter(p => p.slug === drill.slug)).toHaveLength(1);
  expect(drill.retailer).toBe("The Home Depot");
  for (const category of ["home-essentials", "everyday-items", "ending-soon"] as const)
    expect(productMatchesMarketplaceCategory(drill, category), category).toBe(true);
  expect(productMatchesMarketplaceCategory(drill, "electronics")).toBe(false);
  for (const query of ["DEWALT", "cordless drill", "DCD771C2"])
    expect(searchCatalogMatches(demoProducts, query)[0]?.product.slug, query).toBe(drill.slug);
});

test("the homepage and catalog agree on the pilot value, image, and real capacity", () => {
  const drill = expansionProducts[0];
  expect(drill.capacity).toBe(drill.value * 3);
  expect(drill.capacity - drill.sold).toBe(2);
  expect(drill.entryPrice).toBe(1);
  const home = dollarChoiceDemoItems.find(p => p.href === `/items/${drill.slug}`)!;
  expect(home.prizeValue).toBe(drill.value);
  expect(home.image).toBe(drill.gallery[0].src);
  const ending = placeholderDiscoveryOpportunities.find(p => p.href === home.href)!;
  expect(ending.ticketCapacity - ending.ticketsSold).toBe(2);
  expect(ending.faceValueLabel).toBe("$150");
});

test("the artwork exists and the colorful rail image has real transparency", async () => {
  for (const image of expansionProducts[0].gallery)
    expect(existsSync(path.join(process.cwd(), "public", image.src))).toBe(true);
  const imagePath = path.join(process.cwd(), "public", expansionProducts[0].gallery[0].src);
  const { data, info } = await sharp(imagePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let transparent = 0, opaque = 0;
  for (let i = 3; i < data.length; i += info.channels) {
    if (data[i] === 0) transparent++;
    if (data[i] >= 245) opaque++;
  }
  expect(transparent / (info.width * info.height)).toBeGreaterThan(0.15);
  expect(opaque / (info.width * info.height)).toBeGreaterThan(0.25);
});
