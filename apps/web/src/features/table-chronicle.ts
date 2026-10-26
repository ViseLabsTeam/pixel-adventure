import type { GameView } from "@umbral/protocol";

type GameEvent = GameView["events"][number];

const actionKinds = new Set([
  "DICE",
  "ATTACK_D20",
  "ATTACK_MISS_ROLL",
  "ATTACK",
  "ENEMY",
  "MISS",
  "EQUIP",
  "UNEQUIP",
  "HEAL",
  "DISCARD",
  "GATHER",
]);

export function recentActionEvents(events: readonly GameEvent[]): GameEvent[] {
  const actions: GameEvent[] = [];
  for (const event of events) {
    if (!actionKinds.has(event.kind)) continue;
    if (event.kind === "ATTACK") {
      const previous = actions.at(-1);
      if (
        previous?.kind === "ATTACK_D20" &&
        previous.actorId === event.actorId &&
        previous.targetId === event.targetId
      )
        actions.pop();
    }
    actions.push(event);
  }
  return actions.slice(-2);
}
