import sharp from "sharp";
import { format } from "prettier";
import { mkdir, writeFile } from "node:fs/promises";

const directory = "assets/dados/generated";
await mkdir(directory, { recursive: true });
const dice = {};
for (const sides of [6, 20]) {
  const source = `assets/dados/D${sides}.gif`;
  const metadata = await sharp(source).metadata();
  if (!metadata.pages || !metadata.delay?.length)
    throw new Error(`${source} no tiene fotogramas temporizados`);
  const duration = metadata.delay.reduce((sum, delay) => sum + delay, 0);
  await sharp(source, { page: 0 }).png().toFile(`${directory}/d${sides}.png`);
  dice[`d${sides}`] = { source: `dados/D${sides}.gif`, duration };
}
await writeFile(
  `${directory}/manifest.json`,
  JSON.stringify(dice, null, 2) + "\n",
);
await writeFile(
  "packages/content/src/dice-timings.ts",
  await format(
    `// Generated from the original dice GIF delays by assets:prepare.\nexport const diceTimings = ${JSON.stringify({ d6: dice.d6.duration, d20: dice.d20.duration })} as const;\n`,
    { parser: "typescript" },
  ),
);
