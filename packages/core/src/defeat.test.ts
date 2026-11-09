import { expect, it } from "vitest";
import { prototype } from "@umbral/content/prototype";
import { addPlayer, createGame, resolve } from "./index";

it("termina la campaña al caer el último jugador y rechaza nuevos turnos", () => {
  let game = createGame("defeat", "ABC234", prototype);
  game = addPlayer(game, "one", "Ada", "paladin", prototype);
  game = addPlayer(game, "two", "Bea", "mage", prototype);
  game = resolve(game, null, { type: "START" }, prototype, () => 1);

  game.players[0].hp = 1;
  game.players[1].hp = 0;
  game.enemies = [
    {
      ...game.enemies[0],
      id: "last-enemy",
      x: game.players[0].x + 1,
      y: game.players[0].y,
    },
  ];

  const lost = resolve(game, "one", { type: "END_TURN" }, prototype, (sides) =>
    sides === 100 ? 1 : sides,
  );
  expect(lost.players.every((player) => player.hp === 0)).toBe(true);
  expect(lost.status).toBe("LOST");
  expect(lost.activePlayerId).toBeNull();
  expect(lost.events.at(-1)?.kind).toBe("LOST");
  expect(() =>
    resolve(lost, "one", { type: "END_TURN" }, prototype, () => 1),
  ).toThrow("La aventura no está activa");
});
