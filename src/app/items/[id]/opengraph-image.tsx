import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { getDemoProduct } from "@/lib/catalog/demo-products";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const imageTypes: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

export default async function ProductShareImage({ params }: { params: Promise<{ id: string }> }) {
  const product = getDemoProduct((await params).id);
  if (!product) return new Response("Product not found", { status: 404 });

  // The path comes only from the checked-in catalog, never from a URL parameter.
  // Read packaged artwork locally so protected preview deployments need no self-fetch.
  const artwork = product.gallery[0];
  const type = artwork && imageTypes[extname(artwork.src).toLowerCase()];
  if (!artwork || !type) return new Response("Product artwork unavailable", { status: 404 });
  const bytes = await readFile(join(process.cwd(), "public", artwork.src));
  const image = `data:${type};base64,${bytes.toString("base64")}`;

  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#ffffff" }}>
      <div style={{ height: 470, padding: "20px 48px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* ImageResponse needs the original image bytes, not next/image's HTML optimizer. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt={artwork.alt} width={1104} height={430} style={{ objectFit: "contain" }} />
      </div>
      <div style={{ height: 160, background: "#061c3a", color: "#ffffff", padding: "22px 40px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ display: "flex", fontSize: product.title.length > 68 ? 30 : 36, fontWeight: 700, lineHeight: 1.15 }}>{product.title}</div>
        <div style={{ display: "flex", marginTop: 12, fontSize: 22, color: "#b6e6f7" }}>Zero Loss · {product.retailer}</div>
      </div>
    </div>,
    size,
  );
}
