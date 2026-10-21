import sharp from "sharp";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const recipes = JSON.parse(
  await readFile("packages/content/actor-recipes.json", "utf8"),
);
const manifest = {};
for (const [id, { folder, portraitSource, clips }] of Object.entries(
  recipes.players,
)) {
  const directory = `assets/${folder}/generated`;
  await mkdir(directory, { recursive: true });
  await sharp(`assets/${folder}/${portraitSource}`, { page: 0 })
    .trim({ background: "#00000000" })
    .resize({ height: 320, kernel: "nearest" })
    .png()
    .toFile(`${directory}/portrait.png`);
  if (clips.idle) {
    const source = `assets/${folder}/${clips.idle}`;
    const dimensions = await sharp(source).metadata();
    const first = await sharp(source, { page: 0 })
      .trim({ background: "#00000000" })
      .toBuffer({ resolveWithObject: true });
    const margin = 24;
    const left = Math.max(0, -(first.info.trimOffsetLeft ?? 0) - margin);
    const top = Math.max(0, -(first.info.trimOffsetTop ?? 0) - margin);
    const width = Math.min(
      dimensions.width - left,
      first.info.width + margin * 2,
    );
    const height = Math.min(
      (dimensions.pageHeight ?? dimensions.height) - top,
      first.info.height + margin * 2,
    );
    await sharp(source, { animated: true })
      .extract({ left, top, width, height })
      .resize({ height: 320, kernel: "nearest" })
      .webp({ quality: 82, effort: 4, loop: 0 })
      .toFile(`${directory}/idle-portrait.webp`);
  }
  manifest[id] = {
    source: `${folder}/${portraitSource}`,
    portrait: `${folder}/generated/portrait.png`,
    idlePortrait: clips.idle ? `${folder}/generated/idle-portrait.webp` : null,
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
await import("./prepare-map.mjs");
