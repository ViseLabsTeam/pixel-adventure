import { prototype, enemyRecipes } from "../packages/content/src/prototype.js";
import {
  actorRecipes,
  classes,
  movementStepMs,
} from "../packages/content/src/public.js";
import { readFile, stat } from "node:fs/promises";
import assert from "node:assert/strict";
assert.equal(Object.keys(classes).length, 4);
for (const [id, item] of Object.entries(prototype.items)) {
  assert(
    item.allowedClasses.length > 0 &&
      new Set(item.allowedClasses).size === item.allowedClasses.length,
    `Clases de objeto inválidas: ${id}`,
  );
  assert(
    item.allowedClasses.every((classId) => Object.hasOwn(classes, classId)),
    `Clase desconocida en objeto: ${id}`,
  );
  if (item.slot)
    assert.equal(
      item.allowedClasses.length,
      1,
      `El equipo debe pertenecer a una clase: ${id}`,
    );
}
for (const classId of Object.keys(classes) as (keyof typeof classes)[]) {
  assert.equal(prototype.starterItems[classId].length, 4);
  for (const id of prototype.starterItems[classId])
    assert(
      prototype.items[id]?.allowedClasses.includes(classId),
      `Equipo inicial incompatible: ${classId}/${id}`,
    );
}
for (const [id, recipe] of Object.entries(enemyRecipes)) {
  assert(/^[a-z0-9-]+$/.test(id), `ID de tipo de enemigo inválido: ${id}`);
  assert(recipe.name.trim(), `Nombre de enemigo vacío: ${id}`);
  for (const [field, value] of Object.entries(recipe)) {
    if (field === "name") continue;
    assert(
      typeof value === "number" && Number.isSafeInteger(value) && value >= 0,
      `Estadística de enemigo inválida: ${id}.${field}`,
    );
  }
  assert(
    recipe.maxHp > 0 && recipe.range > 0,
    `Vida o alcance de enemigo inválido: ${id}`,
  );
}
for (const [id, value] of Object.entries(classes)) {
  assert.equal(
    value.range,
    prototype.classes[id as keyof typeof classes].range,
  );
  assert(prototype.classes[id as keyof typeof classes].maxHp > 0);
  await stat("." + value.portrait);
  await stat("." + value.idlePortrait);
  const stats = prototype.classes[id as keyof typeof classes];
  for (const score of [
    stats.accuracy,
    stats.dodge,
    stats.agility,
    stats.defense,
    stats.resistance,
    stats.range,
    stats.physicalDamage,
    stats.magicDamage,
  ])
    assert(Number.isInteger(score) && score >= 0 && score <= 10);
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
const ids = [
  ...prototype.enemies,
  ...prototype.chests,
  ...prototype.interactables,
  ...prototype.zones,
].map((x) => x.id);
assert.equal(new Set(ids).size, ids.length);
assert.equal(prototype.map.terrain.length, prototype.map.height);
assert(
  prototype.map.terrain.every((row) => row.length === prototype.map.width),
);
for (const point of [
  ...prototype.map.spawns,
  ...prototype.enemies,
  ...prototype.chests,
  ...prototype.interactables,
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
for (const wall of prototype.map.walls)
  assert(
    wall.x >= prototype.map.minX &&
      wall.x < prototype.map.minX + prototype.map.width &&
      wall.y >= prototype.map.minY &&
      wall.y < prototype.map.minY + prototype.map.height,
    `Muro fuera del mapa: ${wall.x},${wall.y}`,
  );
const blocked = new Set(prototype.map.walls.map(({ x, y }) => `${x},${y}`));
const occupiedPoints = [
  ...prototype.map.spawns,
  ...prototype.enemies,
  ...prototype.chests,
  ...prototype.interactables,
];
for (const enemy of prototype.enemies) {
  assert(
    Object.hasOwn(enemyRecipes, enemy.archetypeId),
    `Tipo de enemigo desconocido: ${enemy.archetypeId}`,
  );
  assert(
    Number.isSafeInteger(enemy.x) && Number.isSafeInteger(enemy.y),
    `Enemigo fuera de grilla: ${enemy.id}`,
  );
  assert(
    !occupiedPoints.some(
      (point) => point !== enemy && point.x === enemy.x && point.y === enemy.y,
    ),
    `Enemigo superpuesto: ${enemy.id}`,
  );
}
assert.equal(
  prototype.map.spawns.length,
  4,
  "La demo necesita cuatro apariciones",
);
assert.equal(
  new Set(prototype.map.spawns.map(({ x, y }) => `${x},${y}`)).size,
  4,
  "Apariciones superpuestas",
);
for (const chest of prototype.chests)
  assert(
    Object.hasOwn(prototype.items, chest.itemDefinition),
    `Objeto de cofre desconocido: ${chest.itemDefinition}`,
  );
for (const object of prototype.interactables)
  assert(
    Object.hasOwn(prototype.items, object.itemDefinition),
    `Objeto interactuable desconocido: ${object.itemDefinition}`,
  );
assert.equal(
  blocked.size,
  prototype.map.walls.length,
  "Casillas de colisión duplicadas",
);
const passable = (x: number, y: number) =>
  prototype.map.terrain[y - prototype.map.minY]?.[x - prototype.map.minX] ===
    "1" && !blocked.has(`${x},${y}`);
for (const point of [
  ...prototype.map.spawns,
  ...prototype.enemies,
  ...prototype.chests,
  ...prototype.zones,
])
  assert(
    passable(point.x, point.y),
    `Entidad dentro de obstáculo: ${point.x},${point.y}`,
  );
for (const point of [
  { x: 6, y: 9 },
  { x: 11, y: -11 },
  { x: 7, y: 4 },
])
  assert(
    passable(point.x, point.y),
    `Escalera o piedra de piso bloqueada: ${point.x},${point.y}`,
  );
for (const point of [
  { x: 2, y: 8 },
  { x: 0, y: -13 },
  { x: 20, y: -7 },
])
  assert(
    blocked.has(`${point.x},${point.y}`),
    `Falta muro o tronco: ${point.x},${point.y}`,
  );
const visited = new Set<string>();
const queue: { x: number; y: number }[] = [prototype.map.spawns[0]];
while (queue.length) {
  const point = queue.shift()!;
  const id = `${point.x},${point.y}`;
  if (visited.has(id) || !passable(point.x, point.y)) continue;
  visited.add(id);
  queue.push(
    { x: point.x + 1, y: point.y },
    { x: point.x - 1, y: point.y },
    { x: point.x, y: point.y + 1 },
    { x: point.x, y: point.y - 1 },
  );
}
for (const point of [
  ...prototype.map.spawns,
  ...prototype.zones,
  ...prototype.enemies,
])
  assert(
    visited.has(`${point.x},${point.y}`),
    `Zona inaccesible: ${point.x},${point.y}`,
  );
for (const object of prototype.interactables)
  if (
    ![
      [object.x, object.y],
      [object.x + 1, object.y],
      [object.x - 1, object.y],
      [object.x, object.y + 1],
      [object.x, object.y - 1],
    ].some(([x, y]) => visited.has(`${x},${y}`))
  )
    console.warn(
      `Interactuable inaccesible en el mapa de prueba: ${object.id}`,
    );
console.log("Contenido demo válido: 4 clases, mapa y recursos disponibles.");
