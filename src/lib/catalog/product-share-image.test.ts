// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import sharp from "sharp";
import ProductShareImage from "../../app/items/[id]/opengraph-image";
import { rasterizeCatalogSvg } from "./product-share-artwork";

describe("public product preview image rendering", () => {
  it("renders distinct, nonblank 1200x630 PNGs from photos, SVG and WebP gift cards", async () => {
    const hashes = new Set<string>();
    for (const id of ["nike-court-shot-shoes", "babys-essentials-bundle", "publix-100-gift-card", "nintendo-switch", "airpods-pro", "bp-100-gift-card", "directory-1-800-baskets-com-100-gift-card"]) {
      const response = await ProductShareImage({ params: Promise.resolve({ id }) });
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("image/png");
      const bytes = Buffer.from(await response.arrayBuffer());
      expect(bytes.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      expect(bytes.readUInt32BE(16)).toBe(1200);
      expect(bytes.readUInt32BE(20)).toBe(630);
      // Checking dimensions alone misses a silently dropped image with a valid footer.
      const artwork = await sharp(bytes).extract({ left: 100, top: 30, width: 1000, height: 400 }).stats();
      expect(Math.max(...artwork.channels.slice(0, 3).map(channel => channel.stdev)), id).toBeGreaterThan(5);
      hashes.add(createHash("sha256").update(bytes).digest("hex"));
    }
    expect(hashes.size).toBe(7);
  }, 30000);

  it("returns 404 for unknown products without reading arbitrary paths", async () => {
    const response = await ProductShareImage({ params: Promise.resolve({ id: "../../.env.local" }) });
    expect(response.status).toBe(404);
  });

  it("renders different SVG letters without relying on system fonts", () => {
    const card = (text: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="80"><text x="5" y="55" font-size="40" font-family="Arial,Helvetica,sans-serif">${text}</text></svg>`;
    // Missing-font square glyphs would make these two images identical.
    expect(rasterizeCatalogSvg(card("AAA"))).not.toEqual(rasterizeCatalogSvg(card("ZZZ")));
  });
});
