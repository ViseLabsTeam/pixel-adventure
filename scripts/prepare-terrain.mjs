import sharp from "sharp";
import { format } from "prettier";
import { writeFile } from "node:fs/promises";

// A provisional collision footprint for the flat scene. Individual props still
// need authored collision data once an editable map is available.
const { data, info } = await sharp("assets/mapas/Scene_Overview.png")
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const minX = -21,
  minY = -21,
  width = 58,
  height = 70;
const rows = [];
for (let y = minY; y < minY + height; y++) {
  let row = "";
  for (let x = minX; x < minX + width; x++) {
    const sx = 494 + x * 16,
      sy = 366 + y * 16;
    let foreground = 0;
    for (let py = sy + 2; py < sy + 14; py += 3)
      for (let px = sx + 2; px < sx + 14; px += 3) {
        const index = (py * info.width + px) * info.channels;
        const r = data[index],
          g = data[index + 1],
          b = data[index + 2];
        if (
          Math.max(r, g, b) >= 75 ||
          Math.abs(r - g) >= 20 ||
          Math.abs(g - b) >= 20
        )
          foreground++;
      }
    row += foreground >= 5 ? "1" : "0";
  }
  rows.push(row);
}
await writeFile(
  "packages/content/src/courtyard-terrain.ts",
  await format(
    "// Generated from Scene_Overview.png by scripts/prepare-terrain.mjs.\n" +
      "// 1 = visible ruin footprint; props within it need authored collision later.\n" +
      "export const courtyardTerrain = " +
      JSON.stringify(rows, null, 2) +
      " as const;\n",
    { parser: "typescript" },
  ),
);
console.log(`Terreno de demo: ${width} x ${height} casillas.`);
