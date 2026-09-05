import sharp from "sharp";
import path from "node:path";

const root = process.cwd();
const output = path.join(root, "ZeroLoss-homepage-clean.png");
const positions = [0, 700, 1400, 2100, 2800, 3271];
const stickyHeader = 147;
const width = 1190;
const viewportHeight = 1026;
const pageHeight = 4310;

const layers = [
  { input: path.join(root, ".tmp-exact-0.png"), left: 0, top: 0 },
];

for (let index = 1; index < positions.length; index += 1) {
  const destinationTop = positions[index] + stickyHeader;
  const height = Math.min(viewportHeight - stickyHeader, pageHeight - destinationTop);
  layers.push({
    input: await sharp(path.join(root, `.tmp-exact-${index}.png`))
      .extract({ left: 0, top: stickyHeader, width, height })
      .toBuffer(),
    left: 0,
    top: destinationTop,
  });
}

await sharp({
  create: { width, height: pageHeight, channels: 3, background: "#061b3d" },
})
  .composite(layers)
  .png({ palette: true, colors: 256, compressionLevel: 9 })
  .toFile(output);

console.log(output);
