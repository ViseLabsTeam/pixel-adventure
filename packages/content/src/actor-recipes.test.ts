import { describe, expect, it } from "vitest";
import {
  actorRecipes,
  animationTimings,
  classes,
  movementStepMs,
} from "./public";
import { prototype, spawnEnemy, statsAtLevel } from "./prototype";
import { courtyardEnemies } from "./courtyard-placements";

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
  it("usa los IDs, tipos y coordenadas del mapa para las apariciones", () => {
    expect(
      prototype.enemies.map(({ id, archetypeId, x, y }) => ({
        id,
        archetypeId,
        x,
        y,
      })),
    ).toEqual(courtyardEnemies);
    expect(prototype.enemies.every((enemy) => enemy.hp === enemy.maxHp)).toBe(
      true,
    );
  });

  it("reproduce la caminata temporal del guerrero en el eje X", () => {
    expect(actorRecipes.players.warrior.clips.walk).toBe("caminata_s.gif");
    expect(animationTimings.warrior.walk).toBe(movementStepMs);
  });

  it("escala cada clase y limita a diez las estadísticas base", () => {
    for (const id of Object.keys(classes) as (keyof typeof classes)[]) {
      expect(statsAtLevel(id, 1)).toEqual(prototype.classes[id]);
      const high = statsAtLevel(id, 30);
      for (const value of [
        high.accuracy,
        high.dodge,
        high.agility,
        high.defense,
        high.resistance,
        high.physicalDamage,
        high.magicDamage,
      ])
        expect(value).toBeLessThanOrEqual(10);
      expect(high.maxHp).toBeGreaterThan(prototype.classes[id].maxHp);
    }
    expect(statsAtLevel("paladin", 5).defense).toBeGreaterThan(
      statsAtLevel("warrior", 5).defense,
    );
    expect(statsAtLevel("mage", 5).magicDamage).toBeGreaterThan(
      statsAtLevel("paladin", 5).magicDamage,
    );
    expect(() => statsAtLevel("warrior", 0)).toThrow(RangeError);
  });
});
