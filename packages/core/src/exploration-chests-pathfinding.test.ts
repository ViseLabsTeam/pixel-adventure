import { describe, expect, it, vi } from "vitest";
import { prototype } from "@umbral/content/prototype";
import {
  addPlayer,
  createGame,
  resolve,
  type Content,
  type Game,
  type Action,
} from "./index";

function fixture(enemyX = 10) {
  const content: Content = structuredClone(prototype);
  content.map = {
    minX: 0,
    minY: 0,
    width: 16,
    height: 8,
    terrain: Array(8).fill("1".repeat(16)),
    walls: [],
    spawns: [
      { x: 1, y: 2 },
      { x: 1, y: 3 },
    ],
  };
  content.enemies = [
    {
      ...prototype.enemies[0],
      id: "enemy",
      x: enemyX,
      y: 2,
      movement: 1,
      range: 1,
    },
  ];
  content.chests = [
    {
      id: "chest",
      x: 2,
      y: 2,
      opened: false,
      itemDefinition: "paladin-shield",
    },
  ];
  content.interactables = [];
  content.zones = [];
  let game = createGame("test", "ABC234", content);
  game = addPlayer(game, "one", "Ada", "paladin", content);
  game = addPlayer(game, "two", "Bea", "mage", content);
  game = resolve(game, null, { type: "START" }, content, () => 1);
  const act = (state: Game, action: Action, dice = (_sides: number) => 1) =>
    resolve(state, state.activePlayerId, action, content, dice);
  return { game, content, act };
}

describe("exploración por cercanía", () => {
  it("usa el límite siete inclusivo alrededor de cualquier jugador vivo", () => {
    expect(fixture(8).game.encounterMode).toBe("COMBAT");
    const { game, act } = fixture(9);
    expect(game).toMatchObject({
      encounterMode: "EXPLORATION",
      movementLeft: 6,
      movementRoll: null,
    });
    game.players[1].x = 8;
    expect(act(game, { type: "FINISH_MOVEMENT" }).encounterMode).toBe("COMBAT");
    game.players[1].hp = 0;
    expect(act(game, { type: "FINISH_MOVEMENT" }).encounterMode).toBe(
      "EXPLORATION",
    );
    game.enemies[0].hp = 0;
    expect(act(game, { type: "FINISH_MOVEMENT" }).encounterMode).toBe(
      "EXPLORATION",
    );
  });
  it("da seis pasos por turno sin azar y rechaza tirar nuevamente", () => {
    const { game, act } = fixture();
    const dice = vi.fn(() => 1);
    expect(() => act(game, { type: "ROLL_MOVEMENT" }, dice)).toThrow(
      "ya se resolvió",
    );
    expect(dice).not.toHaveBeenCalled();
    let next = game;
    for (let i = 0; i < 6; i++)
      next = act(
        next,
        { type: "MOVE_STEP", direction: i % 2 ? "RIGHT" : "LEFT" },
        dice,
      );
    expect(next.movementLeft).toBe(0);
    expect(() => act(next, { type: "MOVE_STEP", direction: "LEFT" })).toThrow(
      "No hay movimiento",
    );
    expect(act(next, { type: "END_TURN" })).toMatchObject({
      activePlayerId: "two",
      movementLeft: 6,
      movementSpent: 0,
    });
    expect(dice).not.toHaveBeenCalled();
  });
  it("atravesar el límite no regala movimientos ni habilita otra tirada", () => {
    const { game, act } = fixture(9);
    game.chests = [];
    let next = act(game, { type: "MOVE_STEP", direction: "RIGHT" });
    expect(next).toMatchObject({
      encounterMode: "COMBAT",
      movementLeft: 3,
      movementSpent: 1,
    });
    expect(() => act(next, { type: "ROLL_MOVEMENT" })).toThrow(
      "ya se resolvió",
    );
    next = act(next, { type: "MOVE_STEP", direction: "LEFT" });
    expect(next).toMatchObject({
      encounterMode: "EXPLORATION",
      movementLeft: 4,
      movementSpent: 2,
    });
    next = act(next, { type: "MOVE_STEP", direction: "RIGHT" });
    expect(next.movementLeft).toBe(1);
    next = act(next, { type: "MOVE_STEP", direction: "LEFT" });
    expect(next.movementLeft).toBe(2);
  });
});

describe("cofres manuales", () => {
  it.each([1, 2, 3])(
    "resuelve la categoría %i una sola vez y conserva el input",
    (outcome) => {
      const { game, act } = fixture(8);
      const original = structuredClone(game);
      const dice = vi.fn((sides: number) => (sides === 3 ? outcome : 1));
      const opened = act(game, { type: "INTERACT", targetId: "chest" }, dice);
      expect(game).toEqual(original);
      expect(dice.mock.calls[0]).toEqual([3]);
      expect(opened.chests[0].opened).toBe(true);
      expect(opened.actionUsed).toBe(true);
      if (outcome === 3) {
        expect(opened.enemies.at(-1)).toMatchObject({
          id: "test:chest:snake",
          archetypeId: "snake",
        });
      } else {
        const item = opened.items[opened.chests[0].lootId!];
        expect(item.slot).toBe(outcome === 1 ? "weapon" : null);
        expect(item.ownerId).toBe("one");
        expect(
          prototype.items[item.definitionId as keyof typeof prototype.items]
            .allowedClasses,
        ).toContain("paladin");
      }
      const reloaded = JSON.parse(JSON.stringify(opened)) as Game;
      reloaded.actionUsed = false;
      const retryDice = vi.fn(() => 1);
      expect(() =>
        act(reloaded, { type: "INTERACT", targetId: "chest" }, retryDice),
      ).toThrow("ya está resuelto");
      expect(retryDice).not.toHaveBeenCalled();
    },
  );
  it("con bolsa llena conserva un único objeto junto al cofre", () => {
    const { game, act } = fixture();
    const existing = Object.values(game.items).find(
      (item) => item.ownerId === "one" && item.slot,
    )!;
    const free = game.players[0].inventory.indexOf(null);
    const id = "extra-item";
    game.items[id] = { ...existing, id };
    game.players[0].inventory[free] = id;
    const opened = act(game, { type: "INTERACT", targetId: "chest" }, () => 1);
    expect(opened.items[opened.chests[0].lootId!].ownerId).toBe("");
    opened.actionUsed = false;
    expect(() => act(opened, { type: "INTERACT", targetId: "chest" })).toThrow(
      "No hay espacio",
    );
    expect(opened.chests[0].lootId).toBe("test:chest:loot");
  });
  it("busca espacio legal para la serpiente y rechaza antes del azar si no existe", () => {
    const { game, act, content } = fixture();
    game.map.walls = [
      { x: 2, y: 1 },
      { x: 2, y: 3 },
      { x: 3, y: 2 },
    ];
    const opened = act(game, { type: "INTERACT", targetId: "chest" }, () => 3);
    const snake = opened.enemies.at(-1)!;
    expect(game.map.walls).not.toContainEqual({ x: snake.x, y: snake.y });
    expect({ x: snake.x, y: snake.y }).not.toEqual({ x: 2, y: 2 });
    content.map.terrain = Array(8).fill("0".repeat(16));
    const dice = vi.fn(() => 3);
    expect(() =>
      act(game, { type: "INTERACT", targetId: "chest" }, dice),
    ).toThrow("No hay espacio para resolver");
    expect(dice).not.toHaveBeenCalled();
    expect(game.chests[0].opened).toBe(false);
  });
});

describe("rutas hacia posiciones de ataque", () => {
  function enemyTurn(game: Game, act: ReturnType<typeof fixture>["act"]) {
    game.activePlayerId = "two";
    return act(game, { type: "END_TURN" });
  }
  it("se aleja del objetivo para rodear un muro", () => {
    const { game, act } = fixture(4);
    game.players[0].x = 2;
    game.players[0].y = 2;
    game.players[1].hp = 0;
    game.chests = [];
    game.map.walls = [
      { x: 3, y: 1 },
      { x: 3, y: 2 },
      { x: 3, y: 3 },
      { x: 4, y: 3 },
    ];
    // The second player remains alive to end the round, but cannot be reached.
    game.players[1].hp = 1;
    game.players[1].x = 15;
    game.players[1].y = 7;
    const next = enemyTurn(game, act);
    expect(next.enemies[0]).toMatchObject({ x: 4, y: 1 });
  });
  it("un arquero dentro de alcance busca otra posición si su línea está bloqueada", () => {
    const { game, act } = fixture(4);
    game.chests = [];
    game.enemies[0].range = 3;
    game.map.walls = [{ x: 3, y: 2 }];
    const next = enemyTurn(game, act);
    expect({ x: next.enemies[0].x, y: next.enemies[0].y }).not.toEqual({
      x: 4,
      y: 2,
    });
  });
  it("no atraviesa ocupantes ni muros y permanece inmóvil sin ruta", () => {
    const { game, act } = fixture(4);
    game.chests = [];
    game.map.walls = [
      { x: 3, y: 2 },
      { x: 4, y: 1 },
      { x: 4, y: 3 },
    ];
    game.enemies.push({
      ...game.enemies[0],
      id: "blocker",
      x: 5,
      y: 2,
      movement: 0,
    });
    expect(enemyTurn(game, act).enemies[0]).toMatchObject({ x: 4, y: 2 });
  });
});
