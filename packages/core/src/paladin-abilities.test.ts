import { describe, expect, it } from "vitest";
import { prototype } from "@umbral/content/prototype";
import {
  addPlayer,
  createGame,
  damage,
  effectiveStats,
  resolve,
  type Game,
} from "./index";

function encounter(): Game {
  let game = createGame("paladin-abilities", "PAL234", prototype);
  game = addPlayer(game, "paladin", "Ada", "paladin", prototype);
  game = addPlayer(game, "mage", "Bea", "mage", prototype);
  game = resolve(game, null, { type: "START" }, prototype, () => 1);
  game.players[0].x = 0;
  game.players[0].y = 0;
  game.players[1].x = 2;
  game.players[1].y = 2;
  game.enemies = [];
  return game;
}

function enemy(id: string, x: number, y: number) {
  return {
    ...prototype.enemies[0],
    id,
    x,
    y,
    hp: 200,
    maxHp: 200,
    defense: 0,
    resistance: 0,
  };
}

describe("habilidades del paladín", () => {
  it("Impacto consagrado aumenta defensa y resistencia sin tiradas ni daño", () => {
    const game = encounter();
    game.enemies = [enemy("witness", 1, 0)];
    const prior = game.players.map((player) => effectiveStats(game, player));
    const next = resolve(
      game,
      "paladin",
      { type: "CAST_PALADIN", ability: "special" },
      prototype,
      () => {
        throw new Error("El refuerzo no tira dados");
      },
    );
    expect(
      next.players.map((player) => effectiveStats(next, player)),
    ).toMatchObject(
      prior.map((stats, index) => ({
        defense:
          stats.defense +
          Math.ceil(stats.defense * (index === 0 ? 0.45 : 0.15)),
        resistance:
          stats.resistance +
          Math.ceil(stats.resistance * (index === 0 ? 0.45 : 0.15)),
      })),
    );
    expect(next.enemies[0].hp).toBe(game.enemies[0].hp);
    expect(next.players[0].resource).toBe(
      game.players[0].resource - prototype.resource.specialCost,
    );
    expect(next.actionUsed).toBe(true);
    expect(game.players.map((player) => effectiveStats(game, player))).toEqual(
      prior,
    );
  });

  it("el refuerzo vence al comenzar el siguiente turno del paladín", () => {
    const game = encounter();
    const baseline = game.players.map((player) => effectiveStats(game, player));
    const boosted = resolve(
      game,
      "paladin",
      { type: "CAST_PALADIN", ability: "special" },
      prototype,
      () => 1,
    );
    const mageTurn = resolve(
      boosted,
      "paladin",
      { type: "END_TURN" },
      prototype,
      () => 1,
    );
    expect(
      effectiveStats(mageTurn, mageTurn.players[1]).defense,
    ).toBeGreaterThan(baseline[1].defense);
    const nextPaladinTurn = resolve(
      mageTurn,
      "mage",
      { type: "END_TURN" },
      prototype,
      () => 1,
    );
    expect(nextPaladinTurn.activePlayerId).toBe("paladin");
    expect(
      nextPaladinTurn.players.map((player) =>
        effectiveStats(nextPaladinTurn, player),
      ),
    ).toEqual(baseline);
  });

  it("Juicio del guardián afecta a los ocho vecinos y no a aliados ni enemigos distantes", () => {
    const game = encounter();
    game.players[0].resource = prototype.resource.ultimateCost;
    const neighbors = [
      [-1, -1],
      [0, -1],
      [1, -1],
      [-1, 0],
      [1, 0],
      [-1, 1],
      [0, 1],
      [1, 1],
    ] as const;
    game.enemies = [
      ...neighbors.map(([x, y], index) => enemy(`near-${index}`, x, y)),
      enemy("far", 2, 0),
    ];
    const rolls: number[] = [];
    const d20 = resolve(
      game,
      "paladin",
      { type: "CAST_PALADIN", ability: "ultimate" },
      prototype,
      (sides) => {
        rolls.push(sides);
        return 20;
      },
    );
    expect(rolls).toEqual([20]);
    expect(d20.enemies.map((target) => target.hp)).toEqual(
      game.enemies.map((target) => target.hp),
    );
    const resolved = resolve(
      d20,
      "paladin",
      { type: "ROLL_ATTACK_D6" },
      prototype,
      (sides) => {
        rolls.push(sides);
        return 6;
      },
    );
    expect(rolls).toEqual([20, 6]);
    for (const target of resolved.enemies) {
      const original = game.enemies.find(
        (candidate) => candidate.id === target.id,
      )!;
      expect(target.hp).toBe(
        target.id === "far"
          ? original.hp
          : original.hp -
              damage(
                20,
                6,
                original.defense,
                false,
                (game.players[0].stats.damageMultiplier ?? 1) *
                  prototype.resource.ultimateMultiplier,
              ),
      );
    }
    expect(resolved.players[1].hp).toBe(game.players[1].hp);
    expect(resolved.players[0].resource).toBe(0);
    expect(resolved.pendingAttack).toBeNull();
  });

  it("Juicio no hiere a un compañero adyacente y resuelve una sola vez tras restaurar el pendiente", () => {
    const game = encounter();
    game.players[0].resource = prototype.resource.ultimateCost;
    game.players[1].x = 0;
    game.players[1].y = 1;
    game.enemies = [enemy("adjacent", 1, 0)];
    const d20 = resolve(
      game,
      "paladin",
      { type: "CAST_PALADIN", ability: "ultimate" },
      prototype,
      () => 20,
    );
    const restored = structuredClone(d20);
    const finished = resolve(
      restored,
      "paladin",
      { type: "ROLL_ATTACK_D6" },
      prototype,
      () => 6,
    );
    expect(finished.players[1].hp).toBe(game.players[1].hp);
    expect(finished.enemies[0].hp).toBeLessThan(game.enemies[0].hp);
    expect(() =>
      resolve(
        finished,
        "paladin",
        { type: "ROLL_ATTACK_D6" },
        prototype,
        () => 6,
      ),
    ).toThrow("No hay un ataque esperando");
  });

  it("rechaza Juicio sin recurso ni enemigos vecinos sin gastar acción", () => {
    const game = encounter();
    game.enemies = [enemy("far", 2, 0)];
    game.players[0].resource = prototype.resource.ultimateCost;
    expect(() =>
      resolve(
        game,
        "paladin",
        { type: "CAST_PALADIN", ability: "ultimate" },
        prototype,
        () => 1,
      ),
    ).toThrow();
    expect(game.actionUsed).toBe(false);
    game.enemies[0].x = 1;
    game.players[0].resource = 0;
    expect(() =>
      resolve(
        game,
        "paladin",
        { type: "CAST_PALADIN", ability: "ultimate" },
        prototype,
        () => 1,
      ),
    ).toThrow();
    expect(game.actionUsed).toBe(false);
  });

  it("rechaza el refuerzo sin recurso y el lanzamiento por otra clase", () => {
    const game = encounter();
    game.players[0].resource = 0;
    expect(() =>
      resolve(
        game,
        "paladin",
        { type: "CAST_PALADIN", ability: "special" },
        prototype,
        () => 1,
      ),
    ).toThrow();
    expect(game.players.every((player) => !player.consecratedBuff)).toBe(true);
    expect(game.actionUsed).toBe(false);
    game.activePlayerId = "mage";
    game.players[1].resource = prototype.resource.ultimateCost;
    expect(() =>
      resolve(
        game,
        "mage",
        { type: "CAST_PALADIN", ability: "special" },
        prototype,
        () => 1,
      ),
    ).toThrow();
    expect(game.actionUsed).toBe(false);
  });
});
