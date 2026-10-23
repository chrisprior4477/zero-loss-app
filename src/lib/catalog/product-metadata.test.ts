import { describe, expect, it } from "vitest";
import { access } from "node:fs/promises";
import { join } from "node:path";
import { demoProducts, getDemoProduct } from "./demo-products";
import { buildProductMetadata, productMetadataBase } from "./product-metadata";

describe("product sharing metadata", () => {
  it.each(["nike-court-shot-shoes", "babys-essentials-bundle", "publix-100-gift-card", "nintendo-switch", "airpods-pro", "bp-100-gift-card"])("publishes the exact product and a PNG preview for %s", (slug) => {
    const product = getDemoProduct(slug)!;
    const metadata = buildProductMetadata(product);
    expect(metadata.title).toBe(product.title);
    expect(metadata.alternates?.canonical).toBe(`/items/${slug}`);
    expect(metadata.openGraph).toMatchObject({ title: product.title, description: product.summary, url: `/items/${slug}` });
    const expectedImage = [{ url: `/items/${slug}/opengraph-image`, type: "image/png", width: 1200, height: 630, alt: product.gallery[0].alt }];
    expect(metadata.openGraph?.images).toEqual(expectedImage);
    expect(metadata.twitter).toMatchObject({ title: product.title, description: product.summary, images: expectedImage });
  });

  it("has public catalog artwork for every product, including SVG cards", async () => {
    await Promise.all(demoProducts.map(async (product) => {
      const artwork = product.gallery[0];
      expect(artwork.src).toMatch(/^\/(catalog\/|dollar-choice)[^?]*\.(png|jpe?g|webp|svg)$/i);
      expect(artwork.src).not.toContain("..");
      await access(join(process.cwd(), "public", artwork.src));
    }));
  });

  it("uses this preview's images even when the public site URL points to another build", () => {
    expect(productMetadataBase({ NODE_ENV: "production", VERCEL_ENV: "preview", VERCEL_URL: "checkpoint.example.vercel.app", NEXT_PUBLIC_SITE_URL: "https://older.example.com" }).origin).toBe("https://checkpoint.example.vercel.app");
  });

  it("retains the configured public origin in production", () => {
    expect(productMetadataBase({ NODE_ENV: "production", VERCEL_ENV: "production", VERCEL_URL: "build.example.vercel.app", NEXT_PUBLIC_SITE_URL: "https://shop.example.com" }).origin).toBe("https://shop.example.com");
  });
});
