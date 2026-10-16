import { prototype } from "../packages/content/src/prototype.js";
import { classes } from "../packages/content/src/public.js";
import { stat } from "node:fs/promises";
import assert from "node:assert/strict";
assert.equal(Object.keys(classes).length, 3);
for (const [id, value] of Object.entries(classes)) {
  assert.equal(
    value.range,
    prototype.classes[id as keyof typeof classes].range,
  );
  assert(prototype.classes[id as keyof typeof classes].maxHp > 0);
  await stat("." + value.portrait);
}
const ids = [...prototype.enemies, ...prototype.chests, ...prototype.zones].map(
  (x) => x.id,
);
assert.equal(new Set(ids).size, ids.length);
for (const point of [
  ...prototype.map.spawns,
  ...prototype.map.walls,
  ...prototype.enemies,
  ...prototype.chests,
  ...prototype.zones,
])
  assert(
    point.x >= 0 &&
      point.x < prototype.map.width &&
      point.y >= 0 &&
      point.y < prototype.map.height,
  );
console.log("Contenido demo válido: 3 clases, mapa y recursos disponibles.");
