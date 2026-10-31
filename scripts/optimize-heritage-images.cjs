// Produce display-sized copies; the original photographs remain untouched.
const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");

async function main() {
  const sourceDir = path.join(__dirname, "../public/images/heritage");
  const outputDir = path.join(sourceDir, "display-v1");
  const names = (await fs.readdir(sourceDir)).filter((name) => /^\d{4}-\d+\.webp$/.test(name)).sort();
  await fs.mkdir(outputDir, { recursive: true });
  let originalBytes = 0;
  let resultBytes = 0;
  for (const name of names) {
    const source = path.join(sourceDir, name);
    const original = await fs.readFile(source);
    const optimized = await sharp(original)
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 82, effort: 6 })
      .toBuffer();
    const result = optimized.length < original.length ? optimized : original;
    await fs.writeFile(path.join(outputDir, name), result);
    originalBytes += original.length;
    resultBytes += result.length;
  }
  console.log(`${names.length} images: ${originalBytes} bytes -> ${resultBytes} bytes`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
