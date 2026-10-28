import { describe, expect, it } from "vitest";
import { addPlayer, createGame, resolve } from "@umbral/core";
import { prototype } from "@umbral/content/prototype";
import { gameViewSchema } from "@umbral/protocol";
import { projectView } from "../src/application/campaigns";
import { saveSchema } from "../src/persistence/save-schema";

const campaignId = "00000000-0000-4000-8000-000000000001";
const playerOne = "00000000-0000-4000-8000-000000000002";
const playerTwo = "00000000-0000-4000-8000-000000000003";

function potionGame() {
  let game = createGame(campaignId, "ABC234", prototype);
  game = addPlayer(game, playerOne, "Ada", "paladin", prototype);
  game = addPlayer(game, playerTwo, "Bea", "mage", prototype);
  game = resolve(game, null, { type: "START" }, prototype, () => 1);
  return resolve(
    game,
    playerOne,
    { type: "USE_ITEM", itemId: game.players[0].potions[0]! },
    prototype,
    () => 1,
  );
}

function view(game: ReturnType<typeof potionGame>) {
  return projectView(
    game,
    {
      campaignId: game.id,
      role: "COORDINATOR",
      playerId: null,
      tokenHash: "test",
    },
    [],
    null,
  );
}

describe("metadatos de eventos en guardado y vista", () => {
  it("conserva el origen de la poción en el guardado y en la proyección pública", () => {
    const game = potionGame();
    expect(saveSchema.parse(game).events.at(-1)).toMatchObject({
      kind: "HEAL",
      actorId: playerOne,
      source: "POTION",
    });
    expect(gameViewSchema.parse(view(game)).events.at(-1)).toMatchObject({
      kind: "HEAL",
      actorId: playerOne,
      source: "POTION",
    });
  });

  it("acepta un evento previo sin origen y rechaza uno desconocido", () => {
    const game = potionGame();
    const older = structuredClone(game);
    delete older.events.at(-1)!.source;
    expect(saveSchema.safeParse(older).success).toBe(true);
    expect(gameViewSchema.safeParse(view(older)).success).toBe(true);

    const invalid = structuredClone(game) as unknown as Record<string, unknown>;
    const events = invalid.events as Array<Record<string, unknown>>;
    events[events.length - 1].source = "UNKNOWN";
    expect(saveSchema.safeParse(invalid).success).toBe(false);
    expect(
      gameViewSchema.safeParse(
        view(invalid as unknown as ReturnType<typeof potionGame>),
      ).success,
    ).toBe(false);
  });
});
