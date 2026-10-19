import { describe, expect, it } from "vitest";
import { addPlayer, createGame } from "@umbral/core";
import {
  animationTimings,
  combatPresentation,
  movementStepMs,
} from "@umbral/content";
import { prototype } from "@umbral/content/prototype";
import { animationDuration } from "../src/application/animation-duration";

const gameWithPlayer = () =>
  addPlayer(
    createGame("campaign", "ABC234", prototype),
    "one",
    "Ada",
    "paladin",
    prototype,
  );

describe("duración de presentación", () => {
  it("reserva 2 segundos para cada dirección de un paso", () => {
    const game = gameWithPlayer();
    expect(movementStepMs).toBe(2000);
    for (const direction of ["UP", "DOWN", "LEFT", "RIGHT"] as const)
      expect(
        animationDuration(game, game, { type: "MOVE_STEP", direction }, "one"),
      ).toBe(movementStepMs);
  });

  it("espera el clip, el resultado y la transición de vida al atacar", () => {
    const game = gameWithPlayer();
    expect(
      animationDuration(
        game,
        game,
        { type: "ATTACK", targetId: "enemy", ability: "basic" },
        "one",
      ),
    ).toBe(animationTimings.paladin.basic + combatPresentation.totalMs);
  });

  it("presenta movimiento enemigo y ataques sucesivos sin adelantar el turno", () => {
    const before = gameWithPlayer();
    const after = structuredClone(before);
    after.enemies[0].x++;
    after.events.push(
      {
        id: "attack-1",
        kind: "ENEMY",
        text: "",
        actorId: "goblin",
        targetId: "one",
        amount: 3,
      },
      {
        id: "attack-2",
        kind: "MISS",
        text: "",
        actorId: "sentinel",
        targetId: "one",
        amount: 0,
      },
    );
    expect(animationDuration(before, after, { type: "END_TURN" }, null)).toBe(
      movementStepMs +
        animationTimings.goblin.basic +
        1100 +
        combatPresentation.totalMs * 2,
    );
  });
});
