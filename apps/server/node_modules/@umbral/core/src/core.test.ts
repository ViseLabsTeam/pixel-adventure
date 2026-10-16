import { describe, it, expect } from "vitest";
import {
  createGame,
  addPlayer,
  resolve,
  movementTotal,
  damage,
  rollDamage,
  effectiveStats,
  assertInventory,
  attackPreview,
  type Game,
} from "./index";
import { prototype } from "@umbral/content/prototype";
import { commandSchema, classSchema } from "@umbral/protocol";
function setup() {
  let game = createGame("campaign", "ABC234", prototype);
  game = addPlayer(game, "one", "Ada", "paladin", prototype);
  game = addPlayer(game, "two", "Bea", "mage", prototype);
  return resolve(game, null, { type: "START" }, prototype, () => 1);
}
const roll = (game: Game, sides = 6) =>
  resolve(game, "one", { type: "ROLL_MOVEMENT" }, prototype, () => sides);
describe("turnos y movimiento", () => {
  it("mantiene el orden del lobby y el actor autorizado", () => {
    const game = setup();
    expect(game.activePlayerId).toBe("one");
    expect(() =>
      resolve(game, "two", { type: "ROLL_MOVEMENT" }, prototype, () => 1),
    ).toThrow("Esperá tu turno");
    expect(
      resolve(game, "one", { type: "END_TURN" }, prototype, () => 1)
        .activePlayerId,
    ).toBe("two");
  });
  it("cubre las seis caras del movimiento", () =>
    expect([1, 2, 3, 4, 5, 6].map(movementTotal)).toEqual([2, 2, 3, 3, 4, 4]));
  it("no permite volver a tirar ni muta el estado anterior", () => {
    const game = setup(),
      next = roll(game);
    expect(game.movementRoll).toBeNull();
    expect(next.movementLeft).toBe(4);
    expect(() => roll(next)).toThrow("ya se resolvió");
  });
  it("rechaza diagonales en el protocolo", () =>
    expect(
      commandSchema.safeParse({
        commandId: "00000000-0000-4000-8000-000000000001",
        expectedRevision: 1,
        action: { type: "MOVE_STEP", direction: "UP_RIGHT" },
      }).success,
    ).toBe(false));
  it("bloquea aliados, paredes, enemigos y límites", () => {
    for (const point of [
      { x: 3, y: 8 },
      { x: 4, y: 3 },
      { x: 3, y: 5 },
      { x: 10, y: 8 },
    ]) {
      const game = roll(setup());
      game.players[0].x = point.x - 1;
      game.players[0].y = point.y;
      expect(() =>
        resolve(
          game,
          "one",
          { type: "MOVE_STEP", direction: "RIGHT" },
          prototype,
          () => 1,
        ),
      ).toThrow("bloqueada");
    }
  });
  it("consume una casilla y rechaza movimiento agotado", () => {
    let game = roll(setup(), 1);
    game = resolve(
      game,
      "one",
      { type: "MOVE_STEP", direction: "UP" },
      prototype,
      () => 1,
    );
    expect(game.players[0].y).toBe(7);
    expect(game.movementLeft).toBe(1);
    game = resolve(
      game,
      "one",
      { type: "MOVE_STEP", direction: "LEFT" },
      prototype,
      () => 1,
    );
    expect(() =>
      resolve(
        game,
        "one",
        { type: "MOVE_STEP", direction: "LEFT" },
        prototype,
        () => 1,
      ),
    ).toThrow("No hay movimiento");
  });
  it("cerrar movimiento bloquea desplazamiento", () => {
    const game = resolve(
      roll(setup()),
      "one",
      { type: "FINISH_MOVEMENT" },
      prototype,
      () => 1,
    );
    expect(() =>
      resolve(
        game,
        "one",
        { type: "MOVE_STEP", direction: "UP" },
        prototype,
        () => 1,
      ),
    ).toThrow("No hay movimiento");
  });
  it("no ofrece arquera y limita la mesa a cuatro personajes", () => {
    expect(classSchema.safeParse("archer").success).toBe(false);
    let game = createGame("c", "ABC234", prototype);
    for (let i = 0; i < 4; i++)
      game = addPlayer(game, String(i), "Viajero", "paladin", prototype);
    expect(() => addPlayer(game, "5", "Extra", "mage", prototype)).toThrow(
      "cuatro",
    );
  });
});
describe("combate e inventario", () => {
  it("el fixture de sigilo sustituye el d6 por x1,50 sin consumir azar extra", () => {
    const calls: number[] = [];
    const result = rollDamage(
      (s) => {
        calls.push(s);
        return 12;
      },
      5,
      true,
    );
    expect(calls).toEqual([20]);
    expect(result).toEqual({ amount: 13, dice: [12] });
  });
  it("aplica porcentajes, redondeo y defensa sin crítico extra por 20", () => {
    expect([1, 2, 3, 4, 5, 6].map((b) => damage(20, b, 2))).toEqual([
      18, 18, 23, 23, 28, 28,
    ]);
    expect(damage(3, 3, 0)).toBe(3);
    expect(damage(1, 1, 10)).toBe(0);
  });
  it("rechaza objetivos fuera de alcance y detrás de paredes", () => {
    const game = setup();
    expect(attackPreview(game, game.players[0], game.enemies[0]).valid).toBe(
      false,
    );
    game.players[1].x = 3;
    game.players[1].y = 3;
    game.enemies[0].x = 5;
    game.enemies[0].y = 3;
    expect(attackPreview(game, game.players[1], game.enemies[0]).valid).toBe(
      false,
    );
  });
  it("un fallo consume acción y cierra movimiento sin tirar daño", () => {
    const game = setup();
    game.players[0].x = 3;
    game.players[0].y = 6;
    const calls: number[] = [];
    const next = resolve(
      game,
      "one",
      { type: "ATTACK", targetId: game.enemies[0].id },
      prototype,
      (s) => {
        calls.push(s);
        return 100;
      },
    );
    expect(calls).toEqual([100]);
    expect(next.actionUsed).toBe(true);
    expect(() =>
      resolve(
        next,
        "one",
        { type: "EQUIP", itemId: "one:travel-pants" },
        prototype,
        () => 1,
      ),
    ).toThrow("Ya usaste");
    expect(() => roll(next)).toThrow();
  });
  it("equipa en ranura propia sin cambiar clase, base o identidad", () => {
    const game = setup(),
      next = resolve(
        game,
        "one",
        { type: "EQUIP", itemId: "one:travel-pants" },
        prototype,
        () => 1,
      );
    expect(next.players[0].inventory).toHaveLength(4);
    expect(Object.keys(next.players[0].equipment)).toEqual([
      "helmet",
      "gloves",
      "pants",
      "chest",
    ]);
    expect(next.players[0].equipment.pants).toBe("one:travel-pants");
    expect(next.players[0].classId).toBe("paladin");
    expect(next.players[0].stats).toEqual(game.players[0].stats);
    expect(effectiveStats(next, next.players[0]).defense).toBe(
      game.players[0].stats.defense + 1,
    );
    assertInventory(next);
  });
  it("rechaza equipo ajeno y objetos duplicados", () => {
    const game = setup();
    expect(() =>
      resolve(
        game,
        "one",
        { type: "EQUIP", itemId: "two:travel-pants" },
        prototype,
        () => 1,
      ),
    ).toThrow("No podés");
    game.players[0].inventory[3] = game.players[0].inventory[0];
    expect(() => assertInventory(game)).toThrow();
  });
  it("no desequipa con la bolsa llena", () => {
    const game = resolve(
      setup(),
      "one",
      { type: "EQUIP", itemId: "one:travel-pants" },
      prototype,
      () => 1,
    );
    game.actionUsed = false;
    for (let i = 0; i < 4; i++)
      if (game.players[0].inventory[i] === null) {
        const id = "extra" + i;
        game.items[id] = { ...game.items["one:potion"], id };
        game.players[0].inventory[i] = id;
      }
    expect(() =>
      resolve(
        game,
        "one",
        { type: "UNEQUIP", slot: "pants" },
        prototype,
        () => 1,
      ),
    ).toThrow("llena");
  });
  it("abre cada cofre una vez al limpiar y conserva identificadores", () => {
    const game = setup();
    game.enemies[1].hp = 0;
    game.enemies[0].hp = 1;
    game.players[0].x = 3;
    game.players[0].y = 6;
    const next = resolve(
      game,
      "one",
      { type: "ATTACK", targetId: game.enemies[0].id },
      prototype,
      (s) => (s === 100 ? 1 : s),
    );
    expect(next.chests.every((c) => c.opened)).toBe(true);
    expect(
      Object.values(next.items).filter((i) => i.id.endsWith(":loot")),
    ).toHaveLength(4);
    assertInventory(next);
  });
  it("resuelve enemigos después del último jugador y reinicia la ronda", () => {
    let game = setup();
    game = resolve(game, "one", { type: "END_TURN" }, prototype, () => 1);
    const next = resolve(game, "two", { type: "END_TURN" }, prototype, () => 1);
    expect(next.round).toBe(2);
    expect(next.activePlayerId).toBe("one");
    expect(next.movementRoll).toBeNull();
    expect(
      Math.abs(next.enemies[0].x - game.enemies[0].x) +
        Math.abs(next.enemies[0].y - game.enemies[0].y),
    ).toBe(1);
  });
});

describe("recursos de clase de demo", () => {
  const attack = (
    amount: number,
    ability: "basic" | "special" | "ultimate",
    miss = false,
  ) => {
    const g = setup();
    g.players[0].x = 3;
    g.players[0].y = 6;
    g.players[0].resource = amount;
    return resolve(
      g,
      "one",
      { type: "ATTACK", targetId: "sentinel", ability },
      prototype,
      (sides) => (miss && sides === 100 ? 100 : 1),
    );
  };
  it("inicia con un tercio y respeta costos incluso al fallar", () => {
    expect(setup().players[0].resource).toBe(100);
    expect(attack(100, "special").players[0].resource).toBe(0);
    expect(attack(300, "ultimate", true).players[0].resource).toBe(0);
  });
  it("recarga básico incluso fallido sin superar el máximo", () => {
    expect(attack(100, "basic", true).players[0].resource).toBe(200);
    expect(attack(300, "basic").players[0].resource).toBe(300);
  });
  it("rechaza recursos insuficientes antes de tirar dados o consumir acción", () => {
    const g = setup();
    g.players[0].x = 3;
    g.players[0].y = 6;
    let rolls = 0;
    expect(() =>
      resolve(
        g,
        "one",
        { type: "ATTACK", targetId: "sentinel", ability: "ultimate" },
        prototype,
        () => {
          rolls++;
          return 1;
        },
      ),
    ).toThrow();
    expect(rolls).toBe(0);
    expect(g.players[0].resource).toBe(100);
    expect(g.actionUsed).toBe(false);
  });
  it("poción restaura un tercio y se consume una sola vez", () => {
    const g = setup();
    g.players[0].resource = 250;
    const id = g.players[0].inventory[0]!;
    const next = resolve(
      g,
      "one",
      { type: "USE_ITEM", itemId: id },
      prototype,
      () => 1,
    );
    expect(next.players[0].resource).toBe(300);
    expect(next.players[0].inventory).not.toContain(id);
    expect(() =>
      resolve(
        next,
        "one",
        { type: "USE_ITEM", itemId: id },
        prototype,
        () => 1,
      ),
    ).toThrow();
  });
  it("mantiene las identidades de clase", () => {
    const { paladin, warrior, mage } = prototype.classes;
    expect(paladin.maxHp).toBeGreaterThan(warrior.maxHp);
    expect(warrior.maxHp).toBeGreaterThan(mage.maxHp);
    expect(paladin.defense).toBeGreaterThan(warrior.defense);
    expect(mage.resistance).toBeGreaterThan(paladin.resistance);
    expect(mage.damageMultiplier).toBeGreaterThan(warrior.damageMultiplier);
    expect(warrior.damageMultiplier).toBeGreaterThan(paladin.damageMultiplier);
    expect(mage.range).toBe(2);
  });
});
