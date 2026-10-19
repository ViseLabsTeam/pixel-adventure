import { describe, expect, it } from "vitest";
import { actorRecipes, classes } from "./public";
import { prototype, spawnEnemy } from "./prototype";

describe("recetas de actores", () => {
  it("tiene arte y estadísticas para cada clase seleccionable", () => {
    expect(Object.keys(actorRecipes.players)).toEqual(Object.keys(classes));
    for (const id of Object.keys(classes) as (keyof typeof classes)[]) {
      expect(actorRecipes.players[id].clips.basic).toBeTruthy();
      expect(prototype.classes[id].range).toBe(classes[id].range);
    }
  });

  it("crea enemigos distintos desde una misma plantilla", () => {
    const first = spawnEnemy("goblin", 1, 2, "goblin-a");
    const second = spawnEnemy("goblin", 3, 4, "goblin-b");
    expect(first.id).not.toBe(second.id);
    expect(first.archetypeId).toBe("goblin");
    expect(second.archetypeId).toBe("goblin");
    expect(first.maxHp).toBe(second.maxHp);
  });
});
