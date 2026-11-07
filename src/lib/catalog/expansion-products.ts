import type { DemoProduct } from "./demo-products";

/** Owner-approved catalog pilot. Uses the existing private demo lifecycle. */
export const expansionProducts: DemoProduct[] = [
  {
    slug: "dewalt-20v-drill-kit",
    title: "DEWALT 20V MAX Cordless Drill Kit",
    brand: "DEWALT",
    retailer: "The Home Depot",
    category: "Home Essentials",
    value: 150,
    entryPrice: 1,
    capacity: 450,
    sold: 448,
    summary: "A compact cordless drill/driver kit for home repairs and everyday DIY, with two batteries, a charger, and a contractor bag. This demo features a $150 Home Depot reward for the pictured kit or another eligible purchase.",
    gallery: [
      { src: "/catalog/dewalt-20v-drill-kit-cutout.png", alt: "DEWALT DCD771C2 drill, two batteries, charger, and contractor bag", fit: "contain" },
      { src: "/catalog/gallery/dewalt-dcd771c2-kit.jpg", alt: "DEWALT kit contents: drill, two batteries, charger, and bag", fit: "contain" },
    ],
    highlights: [
      "Compact drill/driver for home repairs and DIY projects",
      "Two-speed transmission: 0–450 and 0–1,500 RPM",
      "1/2-inch keyless ratcheting chuck",
      "Two 20V MAX 1.3 Ah batteries, charger, and bag included with the pictured kit",
    ],
    specifications: [
      { label: "Model", value: "DCD771C2" },
      { label: "Brand", value: "DEWALT" },
      { label: "Battery platform", value: "20V MAX (18V nominal)" },
      { label: "Batteries in pictured kit", value: "Two 1.3 Ah lithium-ion batteries" },
      { label: "Chuck", value: "1/2-inch keyless" },
      { label: "Demo reward value", value: "$150 Home Depot gift card" },
    ],
    included: ["One simulated $150 Home Depot digital gift card for the pictured drill kit or another eligible Home Depot purchase"],
    sourceUrl: "https://www.homedepot.com/p/DEWALT-20V-MAX-Cordless-1-2-in-Drill-Driver-2-20V-1-3Ah-Batteries-Charger-and-Bag-DCD771C2/204279858",
    sourceLabel: "The Home Depot product information",
    note: "Investor demo only; no real payment, product shipment, or redeemable gift card. The $150 reward value is not a current retail-price quote. Price, tax, inventory, artwork rights, and provider authorization must be confirmed before launch.",
  },
];
