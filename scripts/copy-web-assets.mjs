import { cp, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const assets = fileURLToPath(new URL("../assets/", import.meta.url));
const output = fileURLToPath(
  new URL("../apps/web/dist/assets/", import.meta.url),
);

// Publish only files requested by the web app and map editor. Keep source
// animation GIFs out of the deployment; the game uses generated spritesheets.
const paths = [
  "paladin/generated",
  "guerrero/generated",
  "mago/generated",
  "arquera/generated",
  "enemigos/goblin/generated",
  "mapas/generated",
  "mapas/collision.json",
  "mapas/Scene_Overview.png",
  "maestro/maestro.PNG",
  "maestro/maestro2.PNG",
  "maestro/maestro_de_seremonias.png",
  "dados/D6.gif",
  "dados/D20.gif",
  "dados/generated",
  "fuentes/pixel-operator/PixelOperator.ttf",
  "fuentes/pixel-operator/PixelOperator-Bold.ttf",
];

for (const relative of paths) {
  const destination = join(output, relative);
  await mkdir(dirname(destination), { recursive: true });
  await cp(join(assets, relative), destination, { recursive: true });
}
