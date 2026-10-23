import type { Metadata } from "next";
import type { DemoProduct } from "./demo-products";

export function productMetadataBase(env: NodeJS.ProcessEnv = process.env): URL {
  // A checkpoint preview must use its own images, not an older production build.
  const previewHost = env.VERCEL_ENV === "preview" ? env.VERCEL_URL : undefined;
  return new URL(
    previewHost
      ? `https://${previewHost}`
      : env.NEXT_PUBLIC_SITE_URL ?? (env.VERCEL_URL ? `https://${env.VERCEL_URL}` : "http://localhost:3000"),
  );
}

export function buildProductMetadata(product: DemoProduct): Metadata {
  const path = `/items/${encodeURIComponent(product.slug)}`;
  const image = {
    url: `${path}/opengraph-image`,
    width: 1200,
    height: 630,
    type: "image/png",
    alt: product.gallery[0]?.alt ?? product.title,
  };

  return {
    metadataBase: productMetadataBase(),
    title: product.title,
    description: product.summary,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: "Zero Loss",
      title: product.title,
      description: product.summary,
      url: path,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: product.title,
      description: product.summary,
      images: [image],
    },
  };
}
