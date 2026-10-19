import sharp from "sharp";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const recipes = JSON.parse(
  await readFile("packages/content/actor-recipes.json", "utf8"),
);
const manifest = {};
for (const [id, { folder, portraitSource }] of Object.entries(
  recipes.players,
)) {
  const directory = `assets/${folder}/generated`;
  await mkdir(directory, { recursive: true });
  await sharp(`assets/${folder}/${portraitSource}`, { page: 0 })
    .trim({ background: "#00000000" })
    .resize({ height: 320, kernel: "nearest" })
    .png()
    .toFile(`${directory}/portrait.png`);
  manifest[id] = {
    source: `${folder}/${portraitSource}`,
    portrait: `${folder}/generated/portrait.png`,
    animation: "spritesheet-demo",
    clips: `${folder}/generated/animations.json`,
  };
}
const enemies = {};
for (const [id, { folder, portraitSource, clips }] of Object.entries(
  recipes.enemies,
)) {
  const directory = `assets/${folder}/generated`;
  await mkdir(directory, { recursive: true });
  await sharp(`assets/${folder}/${portraitSource}`, { page: 0 })
    .trim({ background: "#00000000" })
    .resize({ height: 160, kernel: "nearest" })
    .png()
    .toFile(`${directory}/portrait.png`);
  enemies[id] = {
    source: `${folder}/${portraitSource}`,
    attackSource: clips.basic ? `${folder}/${clips.basic}` : null,
    portrait: `${folder}/generated/portrait.png`,
    clips: `${folder}/generated/animations.json`,
  };
}
await mkdir("assets/mapas/generated", { recursive: true });
await sharp("assets/mapas/Scene_Overview.png")
  .webp({ quality: 90 })
  .toFile("assets/mapas/generated/courtyard.webp");
await writeFile(
  "assets/manifest.json",
  JSON.stringify(
    {
      version: 1,
      fonts: {
        ui: {
          regular: "fuentes/pixel-operator/PixelOperator.ttf",
          bold: "fuentes/pixel-operator/PixelOperator-Bold.ttf",
          license: "fuentes/pixel-operator/LICENSE.txt",
        },
      },
      dice: {
        d6: {
          source: "dados/D6.gif",
          preview: "dados/generated/d6.png",
        },
        d20: {
          source: "dados/D20.gif",
          preview: "dados/generated/d20.png",
        },
        timings: "dados/generated/manifest.json",
      },
      characters: manifest,
      enemies,
      map: "mapas/generated/courtyard.webp",
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "Retratos y escenario derivados preparados; originales conservados.",
);

await import("./prepare-animations.mjs");
await import("./prepare-dice.mjs");
await import("./prepare-terrain.mjs");
