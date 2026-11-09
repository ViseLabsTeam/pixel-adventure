import {
  actorRecipes,
  animationTimings,
  combatPresentation,
  diceTimings,
  movementStepMs,
} from "@umbral/content";
import type { Game, Action } from "@umbral/core";
export function animationDuration(
  previous: Game,
  next: Game,
  action: Action,
  playerId: string | null,
) {
  const player = previous.players.find((p) => p.id === playerId);
  if (player && action.type === "ROLL_MOVEMENT") return diceTimings.d6;
  if (player && action.type === "MOVE_STEP") return movementStepMs;
  if (player && action.type === "ATTACK") return diceTimings.d20 + 1250;
  if (player && action.type === "CAST_PALADIN" && action.ability === "ultimate")
    return diceTimings.d20 + 1250;
  if (player && action.type === "ROLL_ATTACK_D6")
    return (
      diceTimings.d6 +
      1250 +
      (animationTimings[player.classId][
        previous.pendingAttack?.ability ?? "basic"
      ] +
        combatPresentation.totalMs) *
        (previous.pendingAttack?.targetIds?.length ?? 1)
    );
  const oldIds = new Set(previous.events.map((e) => e.id));
  const attacks = next.events.filter(
    (event) => !oldIds.has(event.id) && event.actorId && event.targetId,
  );
  const enemiesMoved = next.enemies.some((enemy) => {
    const old = previous.enemies.find((candidate) => candidate.id === enemy.id);
    return old && (old.x !== enemy.x || old.y !== enemy.y);
  });
  if (attacks.length)
    return (
      (enemiesMoved ? movementStepMs : 0) +
      attacks.reduce((total, event) => {
        const enemy = previous.enemies.find(
          (item) => item.id === event.actorId,
        );
        const artId = enemy?.archetypeId ?? enemy?.id;
        const clip =
          artId && artId in actorRecipes.enemies
            ? animationTimings[artId as keyof typeof actorRecipes.enemies].basic
            : 1100;
        return total + clip + combatPresentation.totalMs;
      }, 0)
    );
  return enemiesMoved ? movementStepMs : 0;
}
