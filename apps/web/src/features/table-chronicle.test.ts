import { describe, expect, it } from "vitest";
import type { GameView } from "@umbral/protocol";
import { recentActionEvents } from "./table-chronicle";

type GameEvent = GameView["events"][number];
const event = (id: string, kind: string): GameEvent => ({
  id,
  kind,
  text: id,
});

describe("recentActionEvents", () => {
  it("muestra las últimas dos acciones en orden y excluye avisos de turno", () => {
    const events = [
      event("inicio", "START"),
      event("tirada", "DICE"),
      event("turno", "TURN"),
      event("cura", "HEAL"),
      event("botín", "LOOT"),
      event("equipo", "EQUIP"),
    ];
    expect(recentActionEvents(events).map(({ id }) => id)).toEqual([
      "cura",
      "equipo",
    ]);
  });

  it("muestra el D20 pendiente y lo sustituye por el ataque completo", () => {
    const d20 = {
      ...event("d20", "ATTACK_D20"),
      actorId: "player",
      targetId: "enemy",
    };
    const before = [event("tirada", "DICE"), d20];
    expect(recentActionEvents(before).map(({ id }) => id)).toEqual([
      "tirada",
      "d20",
    ]);

    const after = [
      ...before,
      event("d6", "ATTACK_D6"),
      {
        ...event("ataque", "ATTACK"),
        actorId: "player",
        targetId: "enemy",
      },
      event("turno", "TURN"),
    ];
    expect(recentActionEvents(after).map(({ id }) => id)).toEqual([
      "tirada",
      "ataque",
    ]);
  });
});
