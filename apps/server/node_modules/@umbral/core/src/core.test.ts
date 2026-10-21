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
  clearPath,
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
    expect(next.events.at(-1)).toMatchObject({
      kind: "DICE",
      actorId: "one",
      dice: [6],
    });
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
      { x: 12, y: -18 },
      { x: 2, y: 8 },
      { x: 3, y: 5 },
      { x: 40, y: 8 },
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
    game.players[0].x = 10;
    game.players[0].y = -18;
    game = resolve(
      game,
      "one",
      { type: "MOVE_STEP", direction: "LEFT" },
      prototype,
      () => 1,
    );
    expect(game.players[0].x).toBe(9);
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
  it("permite explorar fuera de la vista inicial y bloquea el vacío del PNG", () => {
    const game = roll(setup());
    game.players[0].x = -4;
    game.players[0].y = -10;
    const explored = resolve(
      game,
      "one",
      { type: "MOVE_STEP", direction: "RIGHT" },
      prototype,
      () => 1,
    );
    expect(explored.players[0].x).toBe(-3);
    explored.players[0].x = -19;
    explored.players[0].y = 0;
    expect(() =>
      resolve(
        explored,
        "one",
        { type: "MOVE_STEP", direction: "LEFT" },
        prototype,
        () => 1,
      ),
    ).toThrow("bloqueada");
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
  it("ofrece cuatro clases únicas, incluida la arquera", () => {
    expect(classSchema.safeParse("archer").success).toBe(true);
    let game = createGame("c", "ABC234", prototype);
    game = addPlayer(game, "1", "Ada", "paladin", prototype);
    expect(() => addPlayer(game, "2", "Bea", "paladin", prototype)).toThrow(
      "ya fue elegido",
    );
    game = addPlayer(game, "2", "Bea", "warrior", prototype);
    game = addPlayer(game, "3", "Cira", "mage", prototype);
    game = addPlayer(game, "4", "Dante", "archer", prototype);
    expect(game.players).toHaveLength(4);
    expect(game.players[3].stats.range).toBe(3);
    expect(game.players[3].hp).toBeLessThan(game.players[1].hp);
    expect(() => addPlayer(game, "4", "Dante", "warrior", prototype)).toThrow(
      "ya fue elegido",
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
    game.players[1].x = 2;
    game.players[1].y = 7;
    game.enemies[0].x = 2;
    game.enemies[0].y = 9;
    expect(attackPreview(game, game.players[1], game.enemies[0]).valid).toBe(
      false,
    );
    expect(clearPath(game, { x: 0, y: -14 }, { x: 0, y: -12 })).toBe(false);
  });
  it("un fallo consume acción y cierra movimiento sin tirar D6", () => {
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
    expect(calls).toEqual([100, 20]);
    expect(next.events.at(-1)?.kind).toBe("ATTACK_MISS_ROLL");
    expect(next.pendingAttack).toBeNull();
    expect(next.actionUsed).toBe(true);
    expect(() =>
      resolve(
        next,
        "one",
        { type: "EQUIP", itemId: "one:travel-boots" },
        prototype,
        () => 1,
      ),
    ).toThrow("Ya usaste");
    expect(() => roll(next)).toThrow();
  });
  it("guarda el D20, exige D6 y aplica el daño una sola vez", () => {
    const game = setup();
    game.players[0].x = 3;
    game.players[0].y = 6;
    const beforeHp = game.enemies[0].hp;
    const rolled = resolve(
      game,
      "one",
      { type: "ATTACK", targetId: game.enemies[0].id },
      prototype,
      (sides) => (sides === 100 ? 1 : 12),
    );
    expect(rolled.pendingAttack?.d20).toBe(12);
    expect(rolled.enemies[0].hp).toBe(beforeHp);
    expect(() =>
      resolve(rolled, "one", { type: "END_TURN" }, prototype, () => 1),
    ).toThrow("D6");
    const resolved = resolve(
      rolled,
      "one",
      { type: "ROLL_ATTACK_D6" },
      prototype,
      () => 4,
    );
    expect(resolved.pendingAttack).toBeNull();
    expect(resolved.events.slice(-2).map((event) => event.kind)).toEqual([
      "ATTACK_D6",
      "ATTACK",
    ]);
    expect(resolved.enemies[0].hp).toBe(
      beforeHp - (resolved.events.at(-1)?.amount ?? 0),
    );
    expect(() =>
      resolve(resolved, "one", { type: "ROLL_ATTACK_D6" }, prototype, () => 6),
    ).toThrow("No hay un ataque");
    expect(game.enemies[0].hp).toBe(beforeHp);
  });
  it("equipa en ranura propia sin cambiar clase, base o identidad", () => {
    const game = setup(),
      next = resolve(
        game,
        "one",
        { type: "EQUIP", itemId: "one:travel-boots" },
        prototype,
        () => 1,
      );
    expect(next.players[0].inventory).toHaveLength(4);
    expect(Object.keys(next.players[0].equipment)).toEqual([
      "helmet",
      "chest",
      "weapon",
      "boots",
      "gloves",
      "pants",
    ]);
    expect(next.players[0].equipment.boots).toBe("one:travel-boots");
    expect(next.players[0].classId).toBe("paladin");
    expect(next.players[0].stats).toEqual(game.players[0].stats);
    expect(effectiveStats(next, next.players[0]).defense).toBe(
      game.players[0].stats.defense + 1,
    );
    assertInventory(next, prototype);
  });
  it("equipa el escudo del paladín y aplica su bono de daño físico", () => {
    const game = setup(),
      next = resolve(
        game,
        "one",
        { type: "EQUIP", itemId: "one:paladin-shield" },
        prototype,
        () => 1,
      );
    expect(next.players[0].equipment.weapon).toBe("one:paladin-shield");
    expect(effectiveStats(next, next.players[0]).physicalDamage).toBe(
      (game.players[0].stats.physicalDamage ?? 0) + 2,
    );
    expect(game.players[0].equipment.weapon).toBeNull();
    assertInventory(next, prototype);
  });
  it("rechaza equipo ajeno y objetos duplicados", () => {
    const game = setup();
    expect(() =>
      resolve(
        game,
        "one",
        { type: "EQUIP", itemId: "two:travel-boots" },
        prototype,
        () => 1,
      ),
    ).toThrow("No podés");
    game.players[0].inventory[3] = game.players[0].inventory[0];
    expect(() => assertInventory(game, prototype)).toThrow();
  });
  it("no desequipa con la bolsa llena", () => {
    const game = resolve(
      setup(),
      "one",
      { type: "EQUIP", itemId: "one:travel-boots" },
      prototype,
      () => 1,
    );
    game.actionUsed = false;
    for (let i = 0; i < 4; i++)
      if (game.players[0].inventory[i] === null) {
        const id = "extra" + i;
        game.items[id] = { ...game.items["one:travel-boots"], id };
        game.players[0].inventory[i] = id;
      }
    expect(() =>
      resolve(
        game,
        "one",
        { type: "UNEQUIP", slot: "boots" },
        prototype,
        () => 1,
      ),
    ).toThrow("llena");
  });
  it("abre cada cofre una vez al limpiar y conserva identificadores", () => {
    const game = setup();
    for (const enemy of game.enemies.slice(1)) enemy.hp = 0;
    game.enemies[0].hp = 1;
    game.players[0].x = 3;
    game.players[0].y = 6;
    const rolled = resolve(
      game,
      "one",
      { type: "ATTACK", targetId: game.enemies[0].id },
      prototype,
      (s) => (s === 100 ? 1 : s),
    );
    const next = resolve(
      rolled,
      "one",
      { type: "ROLL_ATTACK_D6" },
      prototype,
      () => 1,
    );
    expect(next.chests.every((c) => c.opened)).toBe(true);
    expect(
      Object.values(next.items).filter((i) => i.id.endsWith(":loot")),
    ).toHaveLength(game.chests.length);
    assertInventory(next, prototype);
  });
  it("recolecta una planta una sola vez y conserva el objeto obtenido", () => {
    const game = setup();
    expect(() =>
      resolve(
        game,
        "one",
        { type: "INTERACT", targetId: "object-1" },
        prototype,
        () => 1,
      ),
    ).toThrow("Acercate");
    game.players[0].x = -7;
    game.players[0].y = -3;
    game.players[0].potions[0] = null;
    delete game.items["one:potion"];
    const next = resolve(
      game,
      "one",
      { type: "INTERACT", targetId: "object-1" },
      prototype,
      () => 1,
    );
    const id = `${game.id}:object-1:gather`;
    expect(next.interactables[0].used).toBe(true);
    expect(next.players[0].potions).toContain(id);
    expect(next.items[id]).toMatchObject({
      ownerId: "one",
      definitionId: "potion",
    });
    expect(next.actionUsed).toBe(true);
    expect(game.interactables[0].used).toBe(false);
    next.actionUsed = false;
    expect(() =>
      resolve(
        next,
        "one",
        { type: "INTERACT", targetId: "object-1" },
        prototype,
        () => 1,
      ),
    ).toThrow("Ya se recogió");
  });
  it("no consume una planta cuando las casillas de pociones están llenas", () => {
    const game = setup();
    game.players[0].x = -7;
    game.players[0].y = -3;
    for (let i = 1; i < 4; i++) {
      const id = `extra-potion-${i}`;
      game.items[id] = { ...game.items["one:potion"], id };
      game.players[0].potions[i] = id;
    }
    expect(() =>
      resolve(
        game,
        "one",
        { type: "INTERACT", targetId: "object-1" },
        prototype,
        () => 1,
      ),
    ).toThrow("No hay espacio");
    expect(game.interactables[0].used).toBe(false);
    expect(game.actionUsed).toBe(false);
  });
  it("recolecta una poción aunque la bolsa de equipo esté llena", () => {
    const game = setup();
    const player = game.players[0];
    player.x = -7;
    player.y = -3;
    game.items.extra = { ...game.items["one:travel-boots"], id: "extra" };
    player.inventory[3] = "extra";
    const next = resolve(
      game,
      "one",
      { type: "INTERACT", targetId: "object-1" },
      prototype,
      () => 1,
    );
    expect(next.players[0].inventory).toEqual(player.inventory);
    expect(next.players[0].potions[1]).toBe(`${game.id}:object-1:gather`);
    assertInventory(next, prototype);
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
    const id = g.players[0].potions[0]!;
    const next = resolve(
      g,
      "one",
      { type: "USE_ITEM", itemId: id },
      prototype,
      () => 1,
    );
    expect(next.players[0].resource).toBe(300);
    expect(next.players[0].potions).not.toContain(id);
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
    const { paladin, warrior, mage, archer } = prototype.classes;
    expect(paladin.maxHp).toBeGreaterThan(warrior.maxHp);
    expect(warrior.maxHp).toBeGreaterThan(mage.maxHp);
    expect(paladin.defense).toBeGreaterThan(warrior.defense);
    expect(mage.resistance).toBeGreaterThan(paladin.resistance);
    expect(mage.damageMultiplier).toBeGreaterThan(warrior.damageMultiplier);
    expect(warrior.damageMultiplier).toBeGreaterThan(paladin.damageMultiplier);
    expect(mage.range).toBe(2);
    expect(archer.range).toBe(3);
    expect(archer.maxHp).toBeLessThan(warrior.maxHp);
    expect(archer.damageMultiplier).toBeGreaterThan(warrior.damageMultiplier);
  });
});
