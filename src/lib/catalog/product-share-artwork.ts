import { Resvg } from "@resvg/resvg-js";
import { join } from "node:path";

/** Rasterize checked-in SVG artwork with a packaged font, never host OS fonts. */
export function rasterizeCatalogSvg(svg: Buffer | string): Buffer {
  return new Resvg(svg, {
    fitTo: { mode: "width", value: 1200 },
    font: {
      loadSystemFonts: false,
      // Next's own OG renderer ships this font; tracing packages it with the route.
      fontFiles: [join(process.cwd(), "node_modules/next/dist/compiled/@vercel/og/Geist-Regular.ttf")],
      defaultFontFamily: "Geist",
      sansSerifFamily: "Geist",
    },
  }).render().asPng();
}
