export const TILE_SIZE = 70;
export const BOARD_OFFSET = 30;

type Point = { x: number; y: number };
type Size = { width: number; height: number };
type ScrollRange = { minX: number; maxX: number; minY: number; maxY: number };

export function zoomForExtraTiles(viewport: Size, extraTiles = 3) {
  if (viewport.width <= 0 || viewport.height <= 0) return 1;
  return Math.min(
    viewport.width / (viewport.width + extraTiles * TILE_SIZE),
    viewport.height / (viewport.height + extraTiles * TILE_SIZE),
  );
}

export function worldViewport(viewport: Size, zoom: number): Size {
  return { width: viewport.width / zoom, height: viewport.height / zoom };
}

export function tileCenter(point: Point): Point {
  return {
    x: BOARD_OFFSET + (point.x + 0.5) * TILE_SIZE,
    y: BOARD_OFFSET + (point.y + 0.5) * TILE_SIZE,
  };
}

export function tileGroupCenter(points: readonly Point[]): Point | null {
  if (!points.length) return null;
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  };
}

export function initialFocusTile(
  players: readonly (Point & { id: string; slot: number })[],
  spawns: readonly Point[],
  activePlayerId: string | null,
  round: number,
): Point | null {
  if (!players.length) return null;
  if (
    round === 1 &&
    players.every((player) => {
      const spawn = spawns[player.slot];
      return spawn?.x === player.x && spawn.y === player.y;
    })
  )
    return tileGroupCenter(players);
  return players.find((player) => player.id === activePlayerId) ?? players[0];
}

export function centeredScroll(center: Point, viewport: Size): Point {
  return {
    x: center.x - viewport.width / 2,
    y: center.y - viewport.height / 2,
  };
}

// Phaser keeps scroll relative to the unzoomed viewport center.
export function scrollToWorldOrigin(
  scroll: Point,
  screen: Size,
  world: Size,
): Point {
  return {
    x: scroll.x + (screen.width - world.width) / 2,
    y: scroll.y + (screen.height - world.height) / 2,
  };
}

export function worldOriginToScroll(
  origin: Point,
  screen: Size,
  world: Size,
): Point {
  return {
    x: origin.x + (world.width - screen.width) / 2,
    y: origin.y + (world.height - screen.height) / 2,
  };
}

export function cameraScrollRange(
  map: { minX: number; minY: number; width: number; height: number },
  viewport: Size,
  initialCenter: Point,
): ScrollRange {
  const initial = centeredScroll(initialCenter, viewport);
  const left = BOARD_OFFSET + map.minX * TILE_SIZE;
  const top = BOARD_OFFSET + map.minY * TILE_SIZE;
  const right = left + map.width * TILE_SIZE;
  const bottom = top + map.height * TILE_SIZE;
  return {
    minX: Math.min(left, initial.x),
    maxX: Math.max(right - viewport.width, initial.x),
    minY: Math.min(top, initial.y),
    maxY: Math.max(bottom - viewport.height, initial.y),
  };
}

export function followScroll(
  target: Point,
  current: Point,
  viewport: Size,
  zoom: number,
  range: ScrollRange,
): Point {
  const margin =
    Math.min(125, (viewport.width * zoom) / 4, (viewport.height * zoom) / 4) /
    zoom;
  const next = (position: number, scroll: number, size: number) =>
    position < scroll + margin
      ? position - margin
      : position > scroll + size - margin
        ? position - size + margin
        : scroll;
  return {
    x: Math.min(
      range.maxX,
      Math.max(range.minX, next(target.x, current.x, viewport.width)),
    ),
    y: Math.min(
      range.maxY,
      Math.max(range.minY, next(target.y, current.y, viewport.height)),
    ),
  };
}
