import { expect, it, vi } from "vitest";
import { prototype } from "@umbral/content/prototype";
import { addPlayer, createGame, resolve, type Content } from "./index";

function fixture() {
  const content: Content = structuredClone(prototype);
  content.map = {
    minX: 0,
    minY: 0,
    width: 10,
    height: 10,
    terrain: Array(10).fill("1111111111"),
    walls: [
      { x: 1, y: 2 },
      { x: 3, y: 2 },
      { x: 2, y: 1 },
      { x: 2, y: 3 },
    ],
    spawns: [
      { x: 2, y: 2 },
      { x: 7, y: 2 },
    ],
  };
  content.enemies = [
    { ...prototype.enemies[0], id: "enemy", x: 4, y: 2, range: 1, movement: 1 },
  ];
  content.chests = [
    {
      id: "chest",
      x: 7,
      y: 3,
      opened: false,
      itemDefinition: "paladin-shield",
    },
  ];
  content.interactables = [];
  let game = createGame("review", "ABC234", content);
  game = addPlayer(game, "one", "Ada", "paladin", content);
  game = addPlayer(game, "two", "Bea", "mage", content);
  return {
    content,
    game: resolve(game, null, { type: "START" }, content, () => 1),
  };
}

it("persigue un jugador alcanzable aunque el más cercano esté encerrado", () => {
  const { content, game } = fixture();
  const next = resolve(game, "one", { type: "END_TURN" }, content, () => 1);
  const after = resolve(next, "two", { type: "END_TURN" }, content, () => 1);
  expect(after.enemies[0]).toMatchObject({ x: 5, y: 2 });
  expect(game.enemies[0]).toMatchObject({ x: 4, y: 2 });
});

it("rechaza abrir el cofre desde otro actor sin sortear ni mutar el estado", () => {
  const { content, game } = fixture();
  const original = structuredClone(game);
  const dice = vi.fn(() => 1);
  expect(() =>
    resolve(
      game,
      "two",
      { type: "INTERACT", targetId: "chest" },
      content,
      dice,
    ),
  ).toThrow("Esperá tu turno");
  expect(dice).not.toHaveBeenCalled();
  expect(game).toEqual(original);
});
