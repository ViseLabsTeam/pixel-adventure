import { expect, it } from "vitest";
import { addPlayer, createGame, resolve } from "@umbral/core";
import { prototype } from "@umbral/content/prototype";
import { saveSchema } from "../src/persistence/save-schema";

it("conserva el refuerzo y los objetivos del juicio al recuperar el snapshot", () => {
  let game = createGame("paladin-save", "PAL234", prototype);
  game = addPlayer(game, "paladin", "Ada", "paladin", prototype);
  game = addPlayer(game, "mage", "Bea", "mage", prototype);
  game = resolve(game, null, { type: "START" }, prototype, () => 1);
  game = resolve(
    game,
    "paladin",
    { type: "CAST_PALADIN", ability: "special" },
    prototype,
    () => 1,
  );
  const buffed = saveSchema.parse(JSON.parse(JSON.stringify(game)));
  expect(
    buffed.players.map((player) => player.consecratedBuff?.percent),
  ).toEqual([45, 15]);
  game.actionUsed = false;
  game.players[0].resource = 300;
  game.enemies = [
    { ...prototype.enemies[0], x: game.players[0].x + 1, y: game.players[0].y },
  ];
  game = resolve(
    game,
    "paladin",
    { type: "CAST_PALADIN", ability: "ultimate" },
    prototype,
    () => 12,
  );
  const restored = saveSchema.parse(JSON.parse(JSON.stringify(game)));
  expect(restored.pendingAttack?.targetIds).toEqual([game.enemies[0].id]);
  expect(restored.pendingAttack?.d20).toBe(12);
});
