import { prototype } from "../packages/content/src/prototype.js";
import {
  actorRecipes,
  classes,
  movementStepMs,
} from "../packages/content/src/public.js";
import { readFile, stat } from "node:fs/promises";
import assert from "node:assert/strict";
assert.equal(Object.keys(classes).length, 4);
for (const [id, value] of Object.entries(classes)) {
  assert.equal(
    value.range,
    prototype.classes[id as keyof typeof classes].range,
  );
  assert(prototype.classes[id as keyof typeof classes].maxHp > 0);
  await stat("." + value.portrait);
}
for (const recipe of Object.values(actorRecipes.players)) {
  const clips = JSON.parse(
    await readFile(`assets/${recipe.folder}/generated/animations.json`, "utf8"),
  ) as Record<string, { duration: number; delays: number[] }>;
  for (const action of ["walk", "walkUp", "walkDown"]) {
    if (!(action in recipe.clips)) continue;
    assert.equal(clips[action]?.duration, movementStepMs);
    assert.equal(
      clips[action].delays.reduce((total, delay) => total + delay, 0),
      movementStepMs,
    );
  }
}
for (const recipe of Object.values({
  ...actorRecipes.players,
  ...actorRecipes.enemies,
})) {
  await stat(`assets/${recipe.folder}/${recipe.portraitSource}`);
  for (const [action, source] of Object.entries(recipe.clips)) {
    await stat(`assets/${recipe.folder}/${source}`);
    await stat(`assets/${recipe.folder}/generated/${action}.png`);
  }
}
const ids = [...prototype.enemies, ...prototype.chests, ...prototype.zones].map(
  (x) => x.id,
);
assert.equal(new Set(ids).size, ids.length);
assert.equal(prototype.map.terrain.length, prototype.map.height);
assert(
  prototype.map.terrain.every((row) => row.length === prototype.map.width),
);
for (const point of [
  ...prototype.map.spawns,
  ...prototype.map.walls,
  ...prototype.enemies,
  ...prototype.chests,
  ...prototype.zones,
])
  assert(
    point.x >= prototype.map.minX &&
      point.x < prototype.map.minX + prototype.map.width &&
      point.y >= prototype.map.minY &&
      point.y < prototype.map.minY + prototype.map.height &&
      prototype.map.terrain[point.y - prototype.map.minY][
        point.x - prototype.map.minX
      ] === "1",
  );
console.log("Contenido demo válido: 4 clases, mapa y recursos disponibles.");
