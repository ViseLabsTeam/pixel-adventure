import { describe, expect, it } from "vitest";
import { prototype } from "@umbral/content/prototype";
import {
  addPlayer,
  assertInventory,
  createGame,
  effectiveStats,
  resolve,
  type ClassId,
  type Game,
} from "./index";

function party() {
  let game = createGame("class-items", "ABC234", prototype);
  for (const classId of ["paladin", "mage", "warrior", "archer"] as ClassId[])
    game = addPlayer(game, classId, classId, classId, prototype);
  return resolve(game, null, { type: "START" }, prototype, () => 1);
}
function freeBag(game: Game, id: string) {
  const player = game.players.find((p) => p.id === id)!;
  for (const item of player.inventory) if (item) delete game.items[item];
  player.inventory.fill(null);
}
function clearLastEnemy(game: Game) {
  for (const enemy of game.enemies) enemy.hp = 0;
  const enemy = game.enemies[0];
  enemy.hp = 1;
  Object.assign(game.players[0], { x: enemy.x, y: enemy.y + 1 });
  const rolled = resolve(
    game,
    "paladin",
    { type: "ATTACK", targetId: enemy.id },
    prototype,
    (s) => (s === 100 ? 1 : s),
  );
  return resolve(
    rolled,
    "paladin",
    { type: "ROLL_ATTACK_D6" },
    prototype,
    () => 6,
  );
}
describe("objetos restringidos por clase", () => {
  it.each(["paladin", "warrior", "mage", "archer"] as ClassId[])(
    "impide que %s tenga equipo de cualquiera de las otras clases",
    (classId) => {
      const game = party();
      const player = game.players.find((p) => p.classId === classId)!;
      freeBag(game, player.id);
      game.activePlayerId = player.id;
      for (const [definitionId, item] of Object.entries(prototype.items)) {
        if (!item.slot || item.allowedClasses.includes(classId)) continue;
        game.items.foreign = {
          ...item,
          id: "foreign",
          definitionId,
          ownerId: player.id,
        };
        player.inventory[0] = "foreign";
        expect(() => assertInventory(game, prototype)).toThrow("tu clase");
        expect(() =>
          resolve(
            game,
            player.id,
            { type: "EQUIP", itemId: "foreign" },
            prototype,
            () => 1,
          ),
        ).toThrow("tu clase");
      }
    },
  );
  it("inicia a cada clase exclusivamente con su equipo y conserva pociones comunes", () => {
    const game = party();
    expect(game.items["paladin:paladin-shield"].name).toBe("Escudo de paladín");
    expect(prototype.items["rusty-sword"]).toBeUndefined();
    for (const player of game.players) {
      expect(player.inventory.filter(Boolean)).toHaveLength(3);
      expect(player.potions.filter(Boolean)).toHaveLength(1);
      for (const id of player.inventory) {
        if (!id) continue;
        const item = game.items[id!];
        const definition = prototype.items[item.definitionId];
        expect(definition.allowedClasses).toContain(player.classId);
        if (item.slot)
          expect(definition.allowedClasses).toEqual([player.classId]);
      }
      expect(game.items[player.potions[0]!].slot).toBeNull();
    }
    expect(game.items["mage:mage-staff"].name).toBe("Bastón de mago");
    expect(game.items["archer:archer-bow"].name).toBe("Arco de arquera");
  });
  it("entrega el arco a la arquera aunque otro personaje tenga espacio antes", () => {
    const game = party();
    freeBag(game, "paladin");
    freeBag(game, "archer");
    game.chests = [
      {
        id: "bow",
        x: 1,
        y: 2,
        itemDefinition: "archer-bow",
        opened: false,
      },
    ];
    const next = clearLastEnemy(game);
    expect(next.items["class-items:bow:loot"].ownerId).toBe("archer");
    expect(next.players[0].inventory.every((id) => id === null)).toBe(true);
    expect(next.chests[0].opened).toBe(true);
    assertInventory(next, prototype);
  });
  it("conserva el botín en el cofre si la clase no está disponible, sin repetirlo", () => {
    const game = party();
    freeBag(game, "paladin");
    game.players = game.players.filter((p) => p.classId !== "archer");
    for (const [id, item] of Object.entries(game.items))
      if (item.ownerId === "archer") delete game.items[id];
    game.chests = [
      {
        id: "bow",
        x: 1,
        y: 2,
        itemDefinition: "archer-bow",
        opened: false,
      },
    ];
    const next = clearLastEnemy(game);
    expect(next.items["class-items:bow:loot"].ownerId).toBe("");
    expect(
      Object.values(next.items).filter((item) => item.id.endsWith(":loot")),
    ).toHaveLength(1);
  });
  it("rechaza recoger equipo ajeno sin consumir acción ni modificar el cofre", () => {
    const game = party();
    freeBag(game, "paladin");
    game.chests = [
      {
        id: "bow",
        x: 9,
        y: -17,
        opened: true,
        itemDefinition: "archer-bow",
        lootId: "bow-loot",
      },
    ];
    game.items["bow-loot"] = {
      id: "bow-loot",
      ownerId: "",
      definitionId: "archer-bow",
      ...prototype.items["archer-bow"],
    };
    const before = structuredClone(game);
    expect(() =>
      resolve(
        game,
        "paladin",
        { type: "INTERACT", targetId: "bow" },
        prototype,
        () => 1,
      ),
    ).toThrow("tu clase");
    expect(game).toEqual(before);
    game.activePlayerId = "archer";
    Object.assign(game.players.find((p) => p.id === "archer")!, {
      x: 9,
      y: -18,
    });
    freeBag(game, "archer");
    const next = resolve(
      game,
      "archer",
      { type: "INTERACT", targetId: "bow" },
      prototype,
      () => 1,
    );
    expect(next.items["bow-loot"].ownerId).toBe("archer");
    expect(next.actionUsed).toBe(true);
  });
  it("rechaza una recompensa interactuable de otra clase y una bolsa manipulada", () => {
    const game = party();
    freeBag(game, "paladin");
    game.interactables = [
      {
        id: "reward",
        kind: "prop",
        name: "Botas",
        x: 9,
        y: -17,
        used: false,
        itemDefinition: "mage-travel-boots",
      },
    ];
    expect(() =>
      resolve(
        game,
        "paladin",
        { type: "INTERACT", targetId: "reward" },
        prototype,
        () => 1,
      ),
    ).toThrow("tu clase");
    expect(game.interactables[0].used).toBe(false);
    game.items["bad-boots"] = {
      ...prototype.items["mage-travel-boots"],
      id: "bad-boots",
      definitionId: "mage-travel-boots",
      ownerId: "paladin",
    };
    game.players[0].inventory[0] = "bad-boots";
    expect(() => assertInventory(game, prototype)).toThrow("tu clase");
    expect(() =>
      resolve(
        game,
        "paladin",
        { type: "EQUIP", itemId: "bad-boots" },
        prototype,
        () => 1,
      ),
    ).toThrow("tu clase");
    game.players[0].inventory[0] = null;
    game.players[0].equipment.boots = "bad-boots";
    expect(() =>
      resolve(
        game,
        "paladin",
        { type: "UNEQUIP", slot: "boots" },
        prototype,
        () => 1,
      ),
    ).toThrow("tu clase");
  });
  it("permite equipar y desequipar el bastón solo en su clase", () => {
    const game = party();
    game.activePlayerId = "mage";
    const next = resolve(
      game,
      "mage",
      { type: "EQUIP", itemId: "mage:mage-staff" },
      prototype,
      () => 1,
    );
    const mage = next.players.find((p) => p.id === "mage")!;
    expect(effectiveStats(next, mage).magicDamage).toBe(
      mage.stats.magicDamage! + 2,
    );
    expect(effectiveStats(next, mage).physicalDamage).toBe(
      mage.stats.physicalDamage,
    );
    next.actionUsed = false;
    const unequipped = resolve(
      next,
      "mage",
      { type: "UNEQUIP", slot: "weapon" },
      prototype,
      () => 1,
    );
    expect(
      unequipped.players.find((p) => p.id === "mage")!.inventory,
    ).toContain("mage:mage-staff");
  });
});
