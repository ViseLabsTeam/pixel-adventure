import { describe, expect, it } from "vitest";
import {
  TILE_SIZE,
  cameraScrollRange,
  centeredScroll,
  followScroll,
  initialFocusTile,
  scrollToWorldOrigin,
  tileCenter,
  worldOriginToScroll,
  worldViewport,
  zoomForExtraTiles,
} from "./camera-geometry";

const map = { minX: -21, minY: -21, width: 58, height: 70 };
const spawns = [
  { x: 9, y: -18 },
  { x: 12, y: -18 },
  { x: 9, y: -16 },
  { x: 12, y: -16 },
];

describe("cámara de la mesa", () => {
  it("muestra por lo menos tres casillas extra en ambos ejes al cambiar el tamaño", () => {
    for (const size of [
      { width: 1109, height: 900 },
      { width: 800, height: 1200 },
      { width: 400, height: 600 },
    ]) {
      const zoom = zoomForExtraTiles(size);
      const visible = worldViewport(size, zoom);
      expect(visible.width / TILE_SIZE).toBeGreaterThanOrEqual(
        size.width / TILE_SIZE + 3 - 1e-10,
      );
      expect(visible.height / TILE_SIZE).toBeGreaterThanOrEqual(
        size.height / TILE_SIZE + 3 - 1e-10,
      );
    }
  });

  it("centra las apariciones juntas y recupera la cámara en el jugador activo", () => {
    const players = spawns.slice(0, 3).map((spawn, slot) => ({
      ...spawn,
      id: `player-${slot}`,
      slot,
    }));
    const initial = initialFocusTile(players, spawns, "player-0", 1);
    expect(initial?.x).toBe(10);
    expect(initial?.y).toBeCloseTo(-17.3333333333);
    const moved = players.map((player) =>
      player.id === "player-1" ? { ...player, x: 16 } : player,
    );
    expect(initialFocusTile(moved, spawns, "player-1", 1)).toEqual(moved[1]);
    expect(initialFocusTile(players, spawns, "player-1", 2)).toEqual(
      players[1],
    );
  });

  it("permite centrar el respawn cercano al borde y sigue al activo hasta el límite", () => {
    const size = { width: 1109, height: 900 };
    const zoom = zoomForExtraTiles(size);
    const viewport = worldViewport(size, zoom);
    const focus = tileCenter({ x: 10.5, y: -17 });
    const centered = centeredScroll(focus, viewport);
    const phaserScroll = worldOriginToScroll(centered, size, viewport);
    expect(scrollToWorldOrigin(phaserScroll, size, viewport)).toEqual(centered);
    expect(phaserScroll.x + size.width / 2).toBeCloseTo(focus.x);
    expect(phaserScroll.y + size.height / 2).toBeCloseTo(focus.y);
    const range = cameraScrollRange(map, viewport, focus);
    expect(centered.x + viewport.width / 2).toBeCloseTo(focus.x);
    expect(centered.y + viewport.height / 2).toBeCloseTo(focus.y);
    expect(centered.y).toBeLessThan(map.minY * TILE_SIZE + 30);
    expect(centered.y).toBeGreaterThanOrEqual(range.minY);

    const near = followScroll(
      tileCenter({ x: 12, y: -16 }),
      centered,
      viewport,
      zoom,
      range,
    );
    expect(near).toEqual(centered);
    const explored = followScroll(
      tileCenter({ x: 30, y: 30 }),
      near,
      viewport,
      zoom,
      range,
    );
    expect(explored.x).toBeGreaterThan(near.x);
    expect(explored.y).toBeGreaterThan(near.y);
    const edge = followScroll(
      tileCenter({ x: 36, y: 48 }),
      explored,
      viewport,
      zoom,
      range,
    );
    expect(edge.x).toBeLessThanOrEqual(range.maxX);
    expect(edge.y).toBeLessThanOrEqual(range.maxY);
  });
});
