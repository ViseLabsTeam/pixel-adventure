import sharp from "sharp";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { format } from "prettier";
import { readMapEnemies } from "../packages/content/map-enemies.mjs";

const source = JSON.parse(
  await readFile("assets/mapas/collision.json", "utf8"),
);
const enemyRecipes = JSON.parse(
  await readFile("packages/content/enemy-recipes.json", "utf8"),
);
const legacyEnemies = JSON.parse(
  await readFile("assets/mapas/legacy-enemies.json", "utf8"),
);
source.enemies = readMapEnemies(source.enemies, enemyRecipes, legacyEnemies);
if (
  source.version !== 1 ||
  source.tileSize <= 0 ||
  source.image !== "Scene_Overview.png"
)
  throw new Error("Datos de colisión incompatibles");
const integer = (value) => Number.isInteger(value) && Number.isFinite(value);
if (
  !integer(source.tileSize) ||
  !integer(source.origin?.x) ||
  !integer(source.origin?.y) ||
  !Array.isArray(source.walls) ||
  !Array.isArray(source.trees) ||
  !Array.isArray(source.spawns) ||
  !Array.isArray(source.chests) ||
  !Array.isArray(source.interactables) ||
  (source.wallRects && !Array.isArray(source.wallRects))
)
  throw new Error("Grilla de colisión inválida");
for (const point of source.walls)
  if (!integer(point.x) || !integer(point.y))
    throw new Error("Muro fuera de la grilla");
for (const rect of source.wallRects ?? [])
  if (
    !Array.isArray(rect) ||
    rect.length !== 4 ||
    !rect.every(integer) ||
    rect[0] >= rect[2] ||
    rect[1] >= rect[3]
  )
    throw new Error("Rectángulo de muro inválido");
const treeIds = new Set();
for (const tree of source.trees) {
  if (
    !/^[a-z0-9-]+$/.test(tree.id) ||
    treeIds.has(tree.id) ||
    !integer(tree.footY) ||
    !Array.isArray(tree.outline) ||
    (tree.outline.length > 0 && tree.outline.length < 3) ||
    !tree.outline.every(
      (p) => Array.isArray(p) && p.length === 2 && p.every(integer),
    ) ||
    !Array.isArray(tree.trunk) ||
    !tree.trunk.every(
      (p) => Array.isArray(p) && p.length === 2 && p.every(integer),
    )
  )
    throw new Error("Árbol inválido");
  treeIds.add(tree.id);
}
const validPoint = (point) => integer(point?.x) && integer(point?.y);
if (source.spawns.length !== 4 || !source.spawns.every(validPoint))
  throw new Error("Se requieren cuatro apariciones válidas");
const placementIds = new Set();
for (const placement of [
  ...source.chests,
  ...source.interactables,
  ...source.enemies,
]) {
  if (
    !validPoint(placement) ||
    !/^[a-z0-9-]+$/.test(placement.id) ||
    placementIds.has(placement.id)
  )
    throw new Error("Objeto del mapa inválido");
  placementIds.add(placement.id);
}
for (const chest of source.chests)
  if (!/^[a-z0-9-]+$/.test(chest.itemDefinition))
    throw new Error("Objeto de cofre inválido");
for (const object of source.interactables)
  if (
    !/^[a-z0-9-]+$/.test(object.kind) ||
    typeof object.name !== "string" ||
    !object.name.trim() ||
    (object.kind === "reviver"
      ? object.itemDefinition !== ""
      : !/^[a-z0-9-]+$/.test(object.itemDefinition))
  )
    throw new Error("Interactuable inválido");
const { x: originX, y: originY } = source.origin;
const cell = (x, y) => `${x},${y}`;
const walls = new Set(source.walls.map(({ x, y }) => cell(x, y)));
for (const [left, top, right, bottom] of source.wallRects ?? []) {
  for (
    let y = Math.floor((top - originY) / source.tileSize);
    y <= Math.floor((bottom - originY) / source.tileSize);
    y++
  )
    for (
      let x = Math.floor((left - originX) / source.tileSize);
      x <= Math.floor((right - originX) / source.tileSize);
      x++
    ) {
      const cx = originX + (x + 0.5) * source.tileSize;
      const cy = originY + (y + 0.5) * source.tileSize;
      if (cx >= left && cx < right && cy >= top && cy < bottom)
        walls.add(cell(x, y));
    }
}
for (const tree of source.trees)
  for (const [x, y] of tree.trunk) walls.add(cell(x, y));
for (const enemy of source.enemies) {
  const px = originX + (enemy.x + 0.5) * source.tileSize;
  const py = originY + (enemy.y + 0.5) * source.tileSize;
  if (px < 0 || py < 0 || px >= source.imageWidth || py >= source.imageHeight)
    throw new Error(`Enemigo fuera de la imagen: ${enemy.id}`);
  if (walls.has(cell(enemy.x, enemy.y)))
    throw new Error(`Enemigo sobre un obstáculo: ${enemy.id}`);
  if (
    [...source.spawns, ...source.chests, ...source.interactables].some(
      (point) => point.x === enemy.x && point.y === enemy.y,
    )
  )
    throw new Error(`Enemigo superpuesto con otro punto: ${enemy.id}`);
}
const points = [...walls]
  .map((key) => {
    const [x, y] = key.split(",").map(Number);
    return { x, y };
  })
  .sort((a, b) => a.y - b.y || a.x - b.x);
await writeFile(
  "packages/content/src/courtyard-collision.ts",
  await format(
    `// Generated from assets/mapas/collision.json by scripts/prepare-map.mjs.\nexport const courtyardCollision = ${JSON.stringify(points)} as const;\n`,
    { parser: "typescript" },
  ),
);
await writeFile(
  "packages/content/src/courtyard-placements.ts",
  await format(
    `// Generated from assets/mapas/collision.json by scripts/prepare-map.mjs.\n` +
      `export const courtyardSpawns = ${JSON.stringify(source.spawns)} as const;\n` +
      `export const courtyardChests = ${JSON.stringify(source.chests)} as const;\n` +
      `export const courtyardInteractables = ${JSON.stringify(source.interactables)} as const;\n` +
      `export const courtyardEnemies = ${JSON.stringify(source.enemies)} as const;\n`,
    { parser: "typescript" },
  ),
);

const original = "assets/mapas/Scene_Overview.png";
const { width, height } = await sharp(original).metadata();
if (width !== source.imageWidth || height !== source.imageHeight)
  throw new Error("Dimensiones del mapa distintas del JSON");
const meta = [];
for (const tree of source.trees) {
  if (!tree.outline.length) {
    await unlink(`assets/mapas/generated/tree-${tree.id}.png`).catch(
      (error) => {
        if (error.code !== "ENOENT") throw error;
      },
    );
    continue;
  }
  const xs = tree.outline.map(([x]) => x),
    ys = tree.outline.map(([, y]) => y);
  const left = Math.min(...xs),
    top = Math.min(...ys);
  const right = Math.max(...xs),
    bottom = Math.max(...ys);
  const polygon = tree.outline
    .map(([x, y]) => `${x - left},${y - top}`)
    .join(" ");
  const mask = Buffer.from(
    `<svg width="${right - left + 1}" height="${bottom - top + 1}"><polygon points="${polygon}" fill="white"/></svg>`,
  );
  const target = `assets/mapas/generated/tree-${tree.id}.png`;
  await sharp(original)
    .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
    .ensureAlpha()
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toFile(target);
  meta.push({
    id: tree.id,
    image: `mapas/generated/tree-${tree.id}.png`,
    left,
    top,
    width: right - left + 1,
    height: bottom - top + 1,
    footY: tree.footY,
  });
}
await writeFile(
  "assets/mapas/generated/trees.json",
  JSON.stringify(meta, null, 2) + "\n",
);
console.log(
  `Mapa: ${points.length} casillas bloqueadas y ${meta.length} árboles.`,
);
