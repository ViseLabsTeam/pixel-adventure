import { describe, expect, it } from "vitest";
import { prototype } from "@umbral/content/prototype";
import { addPlayer, createGame, resolve, type Game } from "./index";

function setup(): Game {
  let game = createGame("presentation-events", "ABC234", prototype);
  game = addPlayer(game, "one", "Ada", "paladin", prototype);
  game = addPlayer(game, "two", "Bea", "mage", prototype);
  return resolve(game, null, { type: "START" }, prototype, () => 1);
}

describe("eventos confirmados para efectos de la mesa", () => {
  it("identifica al actor que equipa sin publicar el identificador del objeto", () => {
    const game = setup();
    const itemId = game.players[0].inventory.find(
      (id) => id && game.items[id]?.slot,
    )!;
    const next = resolve(
      game,
      "one",
      { type: "EQUIP", itemId },
      prototype,
      () => 1,
    );
    expect(next.events.at(-1)).toMatchObject({
      kind: "EQUIP",
      actorId: "one",
    });
    expect(next.events.at(-1)).not.toHaveProperty("targetId");
    expect(next.events.at(-1)).not.toHaveProperty("source");
  });

  it("identifica al actor que desequipa", () => {
    const game = setup();
    const itemId = game.players[0].inventory.find(
      (id) => id && game.items[id]?.slot,
    )!;
    const equipped = resolve(
      game,
      "one",
      { type: "EQUIP", itemId },
      prototype,
      () => 1,
    );
    equipped.actionUsed = false;
    const slot = game.items[itemId].slot!;
    const next = resolve(
      equipped,
      "one",
      { type: "UNEQUIP", slot },
      prototype,
      () => 1,
    );
    expect(next.events.at(-1)).toMatchObject({
      kind: "UNEQUIP",
      actorId: "one",
    });
    expect(next.events.at(-1)).not.toHaveProperty("source");
  });

  it("distingue la poción de la fuente sin inspeccionar el texto", () => {
    const potionGame = setup();
    const itemId = potionGame.players[0].potions[0]!;
    const potion = resolve(
      potionGame,
      "one",
      { type: "USE_ITEM", itemId },
      prototype,
      () => 1,
    );
    expect(potion.events.at(-1)).toMatchObject({
      kind: "HEAL",
      actorId: "one",
      source: "POTION",
    });
    expect(potion.events.at(-1)).not.toHaveProperty("targetId");

    const fountainGame = setup();
    const fountain = fountainGame.zones.find(
      (zone) => zone.kind === "fountain",
    )!;
    fountainGame.players[0].x = fountain.x - 1;
    fountainGame.players[0].y = fountain.y;
    const healed = resolve(
      fountainGame,
      "one",
      { type: "INTERACT", targetId: fountain.id },
      prototype,
      () => 1,
    );
    expect(
      [...healed.events].reverse().find((event) => event.kind === "HEAL"),
    ).toMatchObject({
      kind: "HEAL",
      actorId: "one",
      source: "FOUNTAIN",
    });
  });
});
