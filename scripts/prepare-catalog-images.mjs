import sharp from "sharp";

const sourceDirectory = "scripts/catalog-source";
const outputDirectory = "public/catalog";

async function removeConnectedWhiteBackground(input, maxSize = 1400) {
  const { data, info } = await sharp(input)
    .rotate()
    .resize({ width: maxSize, height: maxSize, fit: "inside", withoutEnlargement: true })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const pixelCount = width * height;
  const visited = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  let head = 0;
  let tail = 0;

  const isBackground = (index) => {
    const offset = index * channels;
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    return Math.min(red, green, blue) >= 224 && Math.max(red, green, blue) - Math.min(red, green, blue) <= 22;
  };

  const enqueue = (index) => {
    if (index < 0 || index >= pixelCount || visited[index] || !isBackground(index)) return;
    visited[index] = 1;
    queue[tail++] = index;
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  while (head < tail) {
    const index = queue[head++];
    const x = index % width;
    if (x > 0) enqueue(index - 1);
    if (x < width - 1) enqueue(index + 1);
    if (index >= width) enqueue(index - width);
    if (index < pixelCount - width) enqueue(index + width);
  }

  const rgba = Buffer.alloc(pixelCount * 4);
  for (let index = 0; index < pixelCount; index += 1) {
    const sourceOffset = index * channels;
    const outputOffset = index * 4;
    rgba[outputOffset] = data[sourceOffset];
    rgba[outputOffset + 1] = data[sourceOffset + 1];
    rgba[outputOffset + 2] = data[sourceOffset + 2];
    rgba[outputOffset + 3] = visited[index] ? 0 : 255;
  }

  return sharp(rgba, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

async function productCanvas(input, output, canvasWidth, canvasHeight, productWidth, productHeight, rotation = 0) {
  const cutout = await removeConnectedWhiteBackground(input);
  const product = await sharp(cutout)
    .trim({ background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .rotate(rotation, { background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .resize({ width: productWidth, height: productHeight, fit: "inside", withoutEnlargement: false })
    .png()
    .toBuffer();
  await sharp({ create: { width: canvasWidth, height: canvasHeight, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 0 } } })
    .composite([{ input: product, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile(output);
}

await productCanvas(`${sourceDirectory}/samsung-m70h-tv.jpg`, `${outputDirectory}/samsung-m70h-tv-real.png`, 1600, 1000, 1500, 900);
await productCanvas(`${sourceDirectory}/dyson-v8.jpg`, `${outputDirectory}/dyson-v8-diagonal-real.png`, 1500, 1000, 1440, 940, -58);

const pampersCutout = await removeConnectedWhiteBackground(`${sourceDirectory}/pampers-swaddlers.jpg`);
const enfamilSource = await sharp(`${sourceDirectory}/enfamil-neuropro.jpg`)
  .extract({ left: 0, top: 0, width: 880, height: 1200 })
  .toBuffer();
const enfamilCutout = await removeConnectedWhiteBackground(enfamilSource);
const pampers = await sharp(pampersCutout)
  .trim()
  .rotate(-5, { background: { r: 255, g: 255, b: 255, alpha: 0 } })
  .resize({ width: 930, height: 720, fit: "inside" })
  .png()
  .toBuffer();
const enfamil = await sharp(enfamilCutout)
  .trim()
  .rotate(5, { background: { r: 255, g: 255, b: 255, alpha: 0 } })
  .resize({ width: 560, height: 760, fit: "inside" })
  .png()
  .toBuffer();

await sharp({ create: { width: 1500, height: 1000, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 0 } } })
  .composite([
    { input: pampers, left: 75, top: 190 },
    { input: enfamil, left: 785, top: 145 },
  ])
  .png({ compressionLevel: 9 })
  .toFile(`${outputDirectory}/babys-essentials-bundle-angled-real.png`);
