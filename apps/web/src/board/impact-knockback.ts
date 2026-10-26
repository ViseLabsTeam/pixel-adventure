import type { GameView } from "@umbral/protocol";
import { TILE_SIZE } from "./camera-geometry";

type Point = { x: number; y: number };
type ImpactEvent = Pick<GameView["events"][number], "kind" | "amount">;

export function isDamagingImpact(event: ImpactEvent, reducedMotion = false) {
  return (
    !reducedMotion &&
    (event.kind === "ATTACK" || event.kind === "ENEMY") &&
    typeof event.amount === "number" &&
    event.amount > 0
  );
}

export function impactKnockback(
  attacker: Point,
  target: Point,
  distance = 14,
): Point {
  const dx = target.x - attacker.x;
  const dy = target.y - attacker.y;
  const length = Math.hypot(dx, dy);
  if (length === 0 || !Number.isFinite(length)) return { x: 0, y: 0 };
  const pixels = Number.isFinite(distance)
    ? Math.max(0, Math.min(distance, TILE_SIZE / 2 - 1))
    : 0;
  return { x: (dx / length) * pixels, y: (dy / length) * pixels };
}
