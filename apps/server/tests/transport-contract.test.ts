import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { addPlayer, createGame } from "@umbral/core";
import { prototype } from "@umbral/content/prototype";
import {
  apiResponseSchemas,
  commandSchema,
  gameViewSchema,
  receiptSchema,
  sessionSchema,
} from "@umbral/protocol";
import { projectView } from "../src/application/campaigns";

describe("contratos recibidos por la web", () => {
  it("acepta la proyección real del servidor y rechaza una ficha incompleta", () => {
    const id = randomUUID();
    const game = addPlayer(
      createGame(randomUUID(), "ABC234", prototype),
      id,
      "Ada",
      "paladin",
      prototype,
    );
    const view = projectView(
      game,
      { campaignId: game.id, role: "PLAYER", playerId: id, tokenHash: "test" },
      [id],
      null,
    );
    expect(gameViewSchema.safeParse(view).success).toBe(true);
    expect(
      gameViewSchema.safeParse({
        ...view,
        players: [{ ...view.players[0], stats: { maxHp: 60 } }],
      }).success,
    ).toBe(false);
  });

  it("rechaza sesiones y recibos corruptos sin convertirlos en estado confirmado", () => {
    const session = {
      campaignId: randomUUID(),
      playerId: randomUUID(),
      token: "credential",
      role: "PLAYER",
      code: "ABC234",
    };
    expect(sessionSchema.safeParse(session).success).toBe(true);
    expect(sessionSchema.safeParse({ ...session, role: "ADMIN" }).success).toBe(
      false,
    );
    expect(apiResponseSchemas.join.safeParse({ session }).success).toBe(true);
    const command = {
      commandId: randomUUID(),
      expectedRevision: 1,
      action: { type: "ROLL_MOVEMENT" },
    };
    expect(commandSchema.safeParse(command).success).toBe(true);
    expect(
      receiptSchema.safeParse({
        commandId: command.commandId,
        revision: "1",
        events: [],
      }).success,
    ).toBe(false);
  });
});
