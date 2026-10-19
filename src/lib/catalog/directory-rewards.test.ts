// @vitest-environment node
import { describe, expect, test } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import { demoProducts, directoryDemoScenarios, existingDemoProducts, getDemoProduct } from "./demo-products";
import { giftCardPartnerGroups } from "./gift-card-partners";
import { retailerFilterGroups, filterBrowseProducts } from "./browse-filters";
import { buildDirectoryRewards } from "./directory-rewards";
import artwork from "./partner-card-art.json";

describe("complete simulated retailer directory", () => {
  test("every visible vendor has a working $100 offer without removing existing items", () => {
    const groups = retailerFilterGroups(giftCardPartnerGroups, demoProducts);
    for (const group of groups.filter(group => group.id !== "other-current-offers")) {
      for (const option of group.options) {
        expect(option.hasOffer, `${group.category}: ${option.label}`).toBe(true);
        const products = filterBrowseProducts(demoProducts, {type:"all",retailer:option.value,availableOnly:false,sort:"featured",minValue:100,maxValue:100});
        expect(products.some(p => /gift-card$/.test(p.slug)), option.label).toBe(true);
        for (const product of products) expect(getDemoProduct(product.slug)).toBe(product);
      }
    }
    expect(demoProducts.slice(0, existingDemoProducts.length)).toEqual(existingDemoProducts);
    expect(new Set(demoProducts.map(p => p.slug)).size).toBe(demoProducts.length);
    expect(demoProducts.some(p => p.retailer === "Netflix" && p.value === 100)).toBe(true);
  });

  test("legacy offers are byte-for-byte equivalent to the pre-change catalog data", () => {
    // Literal-data fingerprint verified against 174e7ed, independent of shallow Git checkouts.
    const current = readFileSync(path.join(process.cwd(),"src/lib/catalog/demo-products.ts"),"utf8");
    const array = (text:string, name:string) => text.slice(text.indexOf(`const ${name}: DemoProduct[] = [`), text.lastIndexOf("\n];") + 3).replace(name,"products").replaceAll("\r\n","\n");
    expect(createHash("sha256").update(array(current,"existingDemoProducts")).digest("hex"))
      .toBe("c835870b6f27ea7e3c3314ed8948f85896cef85bf433cbe9037e0fbc9e634ef2");
  });

  test("328 new cards have four equal mixed buckets and half of each completion outcome", () => {
    expect(directoryDemoScenarios).toHaveLength(328);
    for (const bucket of ["one-left", "two-left", "eight-left", "mid-fill"]) {
      const scenarios = directoryDemoScenarios.filter(s => s.bucket === bucket);
      expect(scenarios).toHaveLength(82);
      expect(scenarios.filter(s => s.closingOutcome === "winner")).toHaveLength(41);
      expect(scenarios.filter(s => s.closingOutcome === "purchase_option")).toHaveLength(41);
      for (const {product} of scenarios) {
        expect(product.value).toBe(100);
        expect(product.entryPrice).toBe(1);
        expect(product.capacity).toBe(300);
        if (bucket === "mid-fill") {
          expect(product.sold / product.capacity).toBeGreaterThanOrEqual(.45);
          expect(product.sold / product.capacity).toBeLessThanOrEqual(.65);
        } else expect(product.capacity-product.sold).toBe({"one-left":1,"two-left":2,"eight-left":8}[bucket]);
      }
    }
    expect(buildDirectoryRewards(existingDemoProducts)).toEqual(directoryDemoScenarios);
    expect(new Set(directoryDemoScenarios.filter(s=>s.bucket==="mid-fill").map(s=>s.product.sold)).size).toBeGreaterThan(10);
  });

  test("all new artwork is an actual decodable local image with recorded source provenance", async () => {
    for (const {product} of directoryDemoScenarios) {
      const art = artwork.find(item => item.image === product.gallery[0].src);
      expect(art?.imageUrl).toMatch(/^https:\/\//);
      expect(art?.sourceUrl).toBe(product.sourceUrl);
      const filename = path.join(process.cwd(),"public",product.gallery[0].src);
      expect(existsSync(filename), product.retailer).toBe(true);
      const metadata = await sharp(filename).metadata();
      expect(metadata.width, product.retailer).toBeGreaterThanOrEqual(100);
      expect(metadata.height, product.retailer).toBeGreaterThanOrEqual(60);
      expect(product.note).toMatch(/simulated/i);
    }
  });

  test("migration seeds only additions and routes mixed outcomes through the existing close resolver", () => {
    const sql = readFileSync("supabase/migrations/20261019215114_add_directory_demo_gift_cards.sql","utf8");
    expect(sql).toContain("environment = 'development-test'");
    expect(sql).toContain("on conflict (slug) do nothing");
    expect(sql).toContain("from requested r join inserted i on i.slug = r.slug");
    expect(sql).not.toMatch(/\b(update|delete|truncate|drop|alter)\s/i);
    for (const {product,closingOutcome} of directoryDemoScenarios) {
      expect(sql).toContain(`'${product.slug}'`);
      expect(sql).toContain(`${product.sold}, '${closingOutcome}')`);
    }
  });
});
