export const perceptionRange = 6;

type Position = { x: number; y: number };
type EnemyPosition = Position & { hp: number };

export function perceivedEnemies<T extends EnemyPosition>(
  player: Position,
  enemies: readonly T[],
): T[] {
  return enemies
    .filter(
      (enemy) =>
        enemy.hp > 0 &&
        Math.abs(enemy.x - player.x) + Math.abs(enemy.y - player.y) <=
          perceptionRange,
    )
    .sort(
      (a, b) =>
        Math.abs(a.x - player.x) +
        Math.abs(a.y - player.y) -
        Math.abs(b.x - player.x) -
        Math.abs(b.y - player.y),
    );
}
