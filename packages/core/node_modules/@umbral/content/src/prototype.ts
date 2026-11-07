// Fixtures versionados. No representan el balance definitivo.
import { courtyardTerrain } from "./courtyard-terrain";
import { courtyardCollision } from "./courtyard-collision";
import {
  courtyardSpawns,
  courtyardChests,
  courtyardInteractables,
  courtyardEnemies,
} from "./courtyard-placements";
import enemyRecipes from "../enemy-recipes.json";
import { itemDefinitions, starterItems, legacyClassItems } from "./items";
export { enemyRecipes };
const enemyPlacements: readonly {
  id: string;
  archetypeId: keyof typeof enemyRecipes;
  x: number;
  y: number;
}[] = courtyardEnemies;
export function spawnEnemy(
  archetypeId: keyof typeof enemyRecipes,
  x: number,
  y: number,
  id: string = archetypeId,
) {
  const recipe = enemyRecipes[archetypeId];
  return { id, archetypeId, ...recipe, x, y, hp: recipe.maxHp };
}
export const prototype = {
  version: "prototype-content-0.3.0",
  classes: {
    paladin: {
      maxHp: 60,
      accuracy: 7,
      dodge: 3,
      agility: 3,
      defense: 6,
      resistance: 2,
      range: 1,
      damageType: "physical" as const,
      damageMultiplier: 0.65,
      physicalDamage: 4,
      magicDamage: 0,
    },
    warrior: {
      maxHp: 48,
      accuracy: 8,
      dodge: 4,
      agility: 5,
      damageMultiplier: 1,
      physicalDamage: 7,
      magicDamage: 0,
      defense: 3,
      resistance: 1,
      range: 1,
      damageType: "physical" as const,
    },
    mage: {
      maxHp: 32,
      accuracy: 8,
      dodge: 4,
      agility: 4,
      defense: 1,
      resistance: 6,
      range: 2,
      damageType: "magic" as const,
      damageMultiplier: 1.35,
      physicalDamage: 1,
      magicDamage: 9,
    },
    archer: {
      maxHp: 34,
      accuracy: 9,
      dodge: 6,
      agility: 7,
      defense: 1,
      resistance: 2,
      range: 3,
      damageType: "physical" as const,
      damageMultiplier: 1.2,
      physicalDamage: 8,
      magicDamage: 0,
    },
  },
  map: {
    minX: -21,
    minY: -21,
    width: 58,
    height: 70,
    terrain: courtyardTerrain,
    walls: courtyardCollision.map(({ x, y }) => ({ x, y })),
    spawns: courtyardSpawns.map(({ x, y }) => ({ x, y })),
  },
  enemies: enemyPlacements.map(({ archetypeId, x, y, id }) =>
    spawnEnemy(archetypeId, x, y, id),
  ),
  // Fixture provisional; la serpiente usa un marcador hasta recibir arte propio.
  chestSnake: {
    archetypeId: "snake",
    ...enemyRecipes.snake,
    hp: enemyRecipes.snake.maxHp,
  },
  chests: courtyardChests.map((chest) => ({ ...chest, opened: false })),
  interactables: courtyardInteractables.map((object) => ({
    ...object,
    used: false,
  })),
  zones: [
    {
      id: "fountain",
      name: "Fuente del viajero",
      x: 6,
      y: 8,
      kind: "fountain" as const,
    },
    {
      id: "exit",
      name: "Puerta del umbral",
      x: 8,
      y: 1,
      kind: "exit" as const,
    },
  ],
  items: itemDefinitions,
  starterItems,
  legacyClassItems,
  resource: {
    max: 300,
    initial: 100,
    basicGain: 100,
    specialCost: 100,
    ultimateCost: 300,
    specialMultiplier: 1.5,
    ultimateMultiplier: 2.5,
  },
  policies: {
    distance: "manhattan",
    rounding: "floor",
    minimumDamage: 0,
    interactConsumesAction: true,
    equipConsumesAction: true,
    chestLootAfterClearOnly: false,
  } as const,
};

// Progresión provisional para cuando la campaña incorpore experiencia y niveles.
// El nivel 1 usa exactamente las cifras del fixture actual.
export const classGrowth = {
  paladin: {
    maxHp: 8,
    accuracy: 0.35,
    dodge: 0.2,
    agility: 0.2,
    defense: 0.8,
    resistance: 0.4,
    physicalDamage: 0.35,
    magicDamage: 0,
  },
  warrior: {
    maxHp: 6,
    accuracy: 0.5,
    dodge: 0.4,
    agility: 0.5,
    defense: 0.45,
    resistance: 0.2,
    physicalDamage: 0.75,
    magicDamage: 0,
  },
  mage: {
    maxHp: 4,
    accuracy: 0.5,
    dodge: 0.3,
    agility: 0.3,
    defense: 0.2,
    resistance: 0.75,
    physicalDamage: 0.1,
    magicDamage: 0.8,
  },
  archer: {
    maxHp: 4,
    accuracy: 0.65,
    dodge: 0.6,
    agility: 0.7,
    defense: 0.2,
    resistance: 0.3,
    physicalDamage: 0.7,
    magicDamage: 0,
  },
} as const;

export function statsAtLevel(
  classId: keyof typeof prototype.classes,
  level: number,
) {
  if (!Number.isInteger(level) || level < 1)
    throw new RangeError("Nivel inválido");
  const base = prototype.classes[classId];
  const growth = classGrowth[classId];
  const score = (key: Exclude<keyof typeof growth, "maxHp">) =>
    Math.min(10, base[key] + Math.floor((level - 1) * growth[key]));
  const damageKey =
    base.damageType === "magic" ? "magicDamage" : "physicalDamage";
  return {
    ...base,
    maxHp: base.maxHp + (level - 1) * growth.maxHp,
    accuracy: score("accuracy"),
    dodge: score("dodge"),
    agility: score("agility"),
    defense: score("defense"),
    resistance: score("resistance"),
    physicalDamage: score("physicalDamage"),
    magicDamage: score("magicDamage"),
    damageMultiplier:
      (base.damageMultiplier * score(damageKey)) / base[damageKey],
  };
}
