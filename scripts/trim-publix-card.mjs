import sharp from "sharp";

const width = 1440;
const height = 904;
const mask = Buffer.from(
  `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="${width}" height="${height}" rx="62" fill="white"/></svg>`,
);

await sharp("public/catalog/publix-100-gift-card-clean.png")
  .extract({ left: 48, top: 59, width, height })
  .ensureAlpha()
  .composite([{ input: mask, blend: "dest-in" }])
  .png()
  .toFile("public/catalog/publix-100-gift-card-cutout-final.png");
