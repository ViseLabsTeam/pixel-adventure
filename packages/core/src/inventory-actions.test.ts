import { describe, expect, it } from "vitest";
import { prototype } from "@umbral/content/prototype";
import { commandSchema } from "@umbral/protocol";
import {
  addPlayer,
  assertInventory,
  createGame,
  resolve,
  type Game,
} from "./index";

function setup() {
  let game = createGame("inventory-actions", "ABC234", prototype);
  game = addPlayer(game, "one", "Ada", "paladin", prototype);
  game = addPlayer(game, "two", "Bea", "mage", prototype);
  return resolve(game, null, { type: "START" }, prototype, () => 1);
}
function helmet(game: Game, id: string) {
  return {
    ...prototype.items["iron-helmet"],
    id,
    definitionId: "iron-helmet",
    ownerId: game.players[0].id,
  };
}
describe("acciones de inventario", () => {
  it("descarta una poción de sus casillas sin alterar la bolsa", () => {
    const game = setup();
    const player = game.players[0];
    const id = player.potions[0]!;
    const next = resolve(
      game,
      "one",
      { type: "DISCARD_ITEM", itemId: id },
      prototype,
      () => 1,
    );
    expect(next.players[0].potions[0]).toBeNull();
    expect(next.players[0].inventory).toEqual(player.inventory);
    expect(next.items[id]).toBeUndefined();
    assertInventory(next, prototype);
  });
  it("intercambia cascos con bolsa llena en el mismo espacio sin duplicarlos", () => {
    const game = setup(),
      player = game.players[0];
    delete game.items[player.inventory[2]!];
    game.items.old = helmet(game, "old");
    game.items.new = helmet(game, "new");
    player.equipment.helmet = "old";
    player.inventory[2] = "new";
    const before = structuredClone(game);
    const next = resolve(
      game,
      "one",
      { type: "EQUIP", itemId: "new" },
      prototype,
      () => 1,
    );
    expect(next.players[0].equipment.helmet).toBe("new");
    expect(next.players[0].inventory).toEqual([
      player.inventory[0],
      player.inventory[1],
      "old",
      player.inventory[3],
    ]);
    expect(next.items.old.id).toBe("old");
    expect(next.items.new.id).toBe("new");
    expect(next.actionUsed).toBe(true);
    expect(game).toEqual(before);
    assertInventory(next, prototype);
  });
  it("solo desequipa si hay espacio y utiliza el primer espacio libre", () => {
    const game = setup();
    game.items.old = helmet(game, "old");
    game.players[0].equipment.helmet = "old";
    game.items.filler = helmet(game, "filler");
    game.players[0].inventory[3] = "filler";
    const before = structuredClone(game);
    expect(() =>
      resolve(
        game,
        "one",
        { type: "UNEQUIP", slot: "helmet" },
        prototype,
        () => 1,
      ),
    ).toThrow("llena");
    expect(game).toEqual(before);
    delete game.items[game.players[0].inventory[2]!];
    game.players[0].inventory[2] = null;
    const next = resolve(
      game,
      "one",
      { type: "UNEQUIP", slot: "helmet" },
      prototype,
      () => 1,
    );
    expect(next.players[0].inventory[2]).toBe("old");
    expect(next.players[0].equipment.helmet).toBeNull();
    assertInventory(next, prototype);
  });
  it("descarta un objeto propio, libera su espacio y gasta una sola acción", () => {
    const game = setup(),
      id = game.players[0].inventory[1]!;
    game.movementLeft = 4;
    const next = resolve(
      game,
      "one",
      { type: "DISCARD_ITEM", itemId: id },
      prototype,
      () => 1,
    );
    expect(next.players[0].inventory[1]).toBeNull();
    expect(next.items[id]).toBeUndefined();
    expect(next.movementLeft).toBe(0);
    expect(next.actionUsed).toBe(true);
    expect(next.events.at(-1)).toMatchObject({ kind: "DISCARD", targetId: id });
    expect(game.items[id]).toBeDefined();
    expect(() =>
      resolve(
        next,
        "one",
        { type: "DISCARD_ITEM", itemId: next.players[0].inventory[0]! },
        prototype,
        () => 1,
      ),
    ).toThrow("Ya usaste");
    assertInventory(next, prototype);
  });
  it("rechaza descartar objetos ajenos, inexistentes o equipados sin gastar acción", () => {
    const game = setup();
    game.items.old = helmet(game, "old");
    game.players[0].equipment.helmet = "old";
    const before = structuredClone(game);
    for (const itemId of ["old", "missing", game.players[1].inventory[0]!]) {
      expect(() =>
        resolve(
          game,
          "one",
          { type: "DISCARD_ITEM", itemId },
          prototype,
          () => 1,
        ),
      ).toThrow("bolsa");
      expect(game).toEqual(before);
    }
  });
  it("valida el comando de descarte y sus límites", () => {
    const request = {
      commandId: "00000000-0000-4000-8000-000000000001",
      expectedRevision: 3,
      action: { type: "DISCARD_ITEM", itemId: "one:potion" },
    };
    expect(commandSchema.safeParse(request).success).toBe(true);
    for (const itemId of ["", "x".repeat(101), 5])
      expect(
        commandSchema.safeParse({
          ...request,
          action: { ...request.action, itemId },
        }).success,
      ).toBe(false);
  });
});
