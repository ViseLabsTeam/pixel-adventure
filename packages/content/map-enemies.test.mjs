import { describe, expect, it } from "vitest";
import { readMapEnemies } from "./map-enemies.mjs";
import recipes from "./enemy-recipes.json";
import legacy from "../../assets/mapas/legacy-enemies.json";

describe("enemigos del mapa", () => {
  it("permite colocar un goblin arquero del catálogo en el editor", () => {
    const input = [
      { id: "goblin-archer-1", archetypeId: "goblin-archer", x: 2, y: 3 },
    ];
    expect(readMapEnemies(input, recipes, legacy)).toEqual(input);
  });
  it("conserva enemigos de JSON antiguos y respeta una lista vacía explícita", () => {
    const enemies = readMapEnemies(undefined, recipes, legacy);
    expect(enemies).toEqual(legacy);
    enemies[0].x++;
    expect(enemies).not.toEqual(legacy);
    expect(readMapEnemies([], recipes, legacy)).toEqual([]);
  });
  it("admite apariciones distintas del mismo tipo y tipos nuevos del catálogo", () => {
    const input = [
      { id: "goblin-1", archetypeId: "goblin", x: -3, y: -8 },
      { id: "goblin-2", archetypeId: "goblin", x: -2, y: -8 },
      { id: "nuevo-1", archetypeId: "nuevo", x: -1, y: -8 },
    ];
    expect(
      readMapEnemies(input, { ...recipes, nuevo: { name: "Nuevo" } }, legacy),
    ).toEqual(input);
  });
  it.each(
    [
      null,
      {},
      [{ id: "goblin-1", archetypeId: "ausente", x: 1, y: 2 }],
      [{ id: "goblin-1", archetypeId: "toString", x: 1, y: 2 }],
      [{ id: "goblin-1", archetypeId: "goblin", x: 1.5, y: 2 }],
      [{ id: "ID inválido", archetypeId: "goblin", x: 1, y: 2 }],
      [
        { id: "igual", archetypeId: "goblin", x: 1, y: 2 },
        { id: "igual", archetypeId: "goblin", x: 2, y: 2 },
      ],
      [
        { id: "uno", archetypeId: "goblin", x: 1, y: 2 },
        { id: "dos", archetypeId: "goblin", x: 1, y: 2 },
      ],
    ].map((input) => ({ input })),
  )("rechaza datos inválidos o ambiguos: %j", ({ input }) => {
    expect(() => readMapEnemies(input, recipes, legacy)).toThrow();
  });
});
