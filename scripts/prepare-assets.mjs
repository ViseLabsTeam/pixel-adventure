import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
const portraits = {
  paladin: "animascion_pasiva.gif",
  guerrero: "indie.gif",
  mago: "bola_de_fuego_.gif",
};
const manifest = {};
for (const [category, file] of Object.entries(portraits)) {
  const directory = `assets/${category}/generated`;
  await mkdir(directory, { recursive: true });
  await sharp(`assets/${category}/${file}`, { page: 0 })
    .trim({ background: "#00000000" })
    .resize({ height: 320, kernel: "nearest" })
    .png()
    .toFile(`${directory}/portrait.png`);
  manifest[category] = {
    source: `${category}/${file}`,
    portrait: `${category}/generated/portrait.png`,
    animation: "spritesheet-demo",
    clips: `${category}/generated/animations.json`,
  };
}
await mkdir("assets/mapas/generated", { recursive: true });
await sharp("assets/mapas/Scene_Overview.png")
  .webp({ quality: 90 })
  .toFile("assets/mapas/generated/courtyard.webp");
await writeFile(
  "assets/manifest.json",
  JSON.stringify(
    { version: 1, characters: manifest, map: "mapas/generated/courtyard.webp" },
    null,
    2,
  ) + "\n",
);
console.log(
  "Retratos y escenario derivados preparados; originales conservados.",
);

await import("./prepare-animations.mjs");
