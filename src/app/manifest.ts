import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zero Loss",
    short_name: "Zero Loss",
    description:
      "Zero Loss — a calmer way to shop with marketplace energy, built for trust and clarity.",
    start_url: "/",
    id: "/",
    scope: "/",
    display: "standalone",
    background_color: "#00132e",
    theme_color: "#00132e",
    icons: [
      {
        src: "/icons/zeroloss-icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/zeroloss-icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
