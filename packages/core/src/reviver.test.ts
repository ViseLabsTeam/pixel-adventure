import { describe, expect, it } from "vitest";
import { addPlayer, createGame, resolve } from "./index";
import { prototype } from "@umbral/content/prototype";

function gameWithFallen(count = 1) {
  let game = createGame("revive-campaign", "REV234", prototype);
  game = addPlayer(game, "one", "Ada", "paladin", prototype);
  game = addPlayer(game, "two", "Bea", "mage", prototype);
  if (count > 1) game = addPlayer(game, "three", "Ciro", "warrior", prototype);
  game = resolve(game, null, { type: "START" }, prototype, () => 1);
  game.players[0].x = 10;
  game.players[0].y = -15;
  for (const fallen of game.players.slice(1)) fallen.hp = 0;
  return game;
}

describe("revividor del mapa", () => {
  it("revive dos casillas al sur con una vida, una sola vez, sin mutar la entrada", () => {
    const game = gameWithFallen();
    const next = resolve(
      game,
      "one",
      { type: "INTERACT", targetId: "reviver-1" },
      prototype,
      () => 1,
    );
    expect(next.players[1]).toMatchObject({ x: 10, y: -12, hp: 1 });
    expect(
      next.interactables.find((item) => item.id === "reviver-1")?.used,
    ).toBe(true);
    expect(next.actionUsed).toBe(true);
    expect(next.events.some((event) => event.kind === "REVIVE")).toBe(true);
    expect(game.players[1].hp).toBe(0);
    expect(
      game.interactables.find((item) => item.id === "reviver-1")?.used,
    ).toBe(false);
    next.actionUsed = false;
    expect(() =>
      resolve(
        next,
        "one",
        { type: "INTERACT", targetId: "reviver-1" },
        prototype,
        () => 1,
      ),
    ).toThrow("Ya se usó");
  });

  it("ubica varios caídos en casillas libres sin superponerlos", () => {
    const next = resolve(
      gameWithFallen(2),
      "one",
      { type: "INTERACT", targetId: "reviver-1" },
      prototype,
      () => 1,
    );
    const revived = next.players.slice(1);
    expect(revived.every((player) => player.hp === 1)).toBe(true);
    expect(
      new Set(revived.map((player) => `${player.x},${player.y}`)).size,
    ).toBe(2);
    expect(revived[0]).toMatchObject({ x: 10, y: -12 });
  });

  it("rechaza sin caídos y sin espacio de llegada sin gastar acción", () => {
    const noFallen = gameWithFallen();
    noFallen.players[1].hp = 1;
    expect(() =>
      resolve(
        noFallen,
        "one",
        { type: "INTERACT", targetId: "reviver-1" },
        prototype,
        () => 1,
      ),
    ).toThrow("No hay compañeros caídos");
    const blocked = gameWithFallen();
    const altar = blocked.interactables.find(
      (item) => item.id === "reviver-1",
    )!;
    for (let dy = -3; dy <= 3; dy++)
      for (let dx = -3; dx <= 3; dx++)
        if (Math.abs(dx) + Math.abs(dy) <= 3)
          blocked.map.walls.push({ x: altar.x + dx, y: altar.y + 2 + dy });
    expect(() =>
      resolve(
        blocked,
        "one",
        { type: "INTERACT", targetId: "reviver-1" },
        prototype,
        () => 1,
      ),
    ).toThrow("No hay espacio libre");
    expect(blocked.actionUsed).toBe(false);
    expect(blocked.players[1].hp).toBe(0);
  });
});
