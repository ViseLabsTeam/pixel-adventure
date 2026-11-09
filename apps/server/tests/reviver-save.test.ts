import { expect, it } from "vitest";
import { addPlayer, createGame, resolve } from "@umbral/core";
import { prototype } from "@umbral/content/prototype";
import { saveSchema } from "../src/persistence/save-schema";

it("recupera el revividor usado y las posiciones revividas desde el snapshot", () => {
  let game = createGame(
    "00000000-0000-4000-8000-000000000011",
    "REV234",
    prototype,
  );
  game = addPlayer(
    game,
    "00000000-0000-4000-8000-000000000012",
    "Ada",
    "paladin",
    prototype,
  );
  game = addPlayer(
    game,
    "00000000-0000-4000-8000-000000000013",
    "Bea",
    "mage",
    prototype,
  );
  game = resolve(game, null, { type: "START" }, prototype, () => 1);
  game.players[0].x = 10;
  game.players[0].y = -15;
  game.players[1].hp = 0;
  const committed = resolve(
    game,
    game.players[0].id,
    { type: "INTERACT", targetId: "reviver-1" },
    prototype,
    () => 1,
  );
  const restored = saveSchema.parse(JSON.parse(JSON.stringify(committed)));
  expect(restored.players[1]).toMatchObject({ x: 10, y: -12, hp: 1 });
  expect(
    restored.interactables.find((item) => item.id === "reviver-1")?.used,
  ).toBe(true);
  expect(restored.events.some((event) => event.kind === "REVIVE")).toBe(true);
});
