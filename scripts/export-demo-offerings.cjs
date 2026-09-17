const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

require.extensions[".ts"] = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  }).outputText;
  module._compile(output, filename);
};

const { demoProducts } = require(path.join(__dirname, "..", "src", "lib", "catalog", "demo-products.ts"));
const forcedOutcomes = new Map([
  ["samsung-m70h-tv", "winner"],
  ["nike-court-shot-shoes", "not_selected"],
  ["babys-essentials-bundle", "not_selected"],
]);

process.stdout.write(JSON.stringify(demoProducts.map((product) => ({
  slug: product.slug,
  title: product.title,
  retailer: product.retailer,
  category: product.category,
  image_path: product.gallery[0].src,
  value_cents: Math.round(product.value * 100),
  entry_price_cents: Math.round(product.entryPrice * 100),
  capacity: product.capacity,
  forced_outcome: forcedOutcomes.get(product.slug) ?? "active",
}))));
