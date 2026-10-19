import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { facingOriginX } from "./sprite-facing";

describe("anclaje horizontal de sprites reflejados", () => {
  it("mantiene el centro del cuerpo sobre la casilla en todas las animaciones", () => {
    for (const folder of ["paladin", "guerrero", "mago", "enemigos/goblin"]) {
      const clips = JSON.parse(
        readFileSync(`assets/${folder}/generated/animations.json`, "utf8"),
      ) as Record<string, { originX: number; scale: number }>;
      for (const clip of Object.values(clips)) {
        const mirroredBodyX = (1 - clip.originX) * 256 * clip.scale;
        const mirroredAnchorX =
          facingOriginX(clip.originX, true) * 256 * clip.scale;
        expect(mirroredBodyX - mirroredAnchorX).toBeCloseTo(0, 8);
        expect(facingOriginX(clip.originX, false)).toBe(clip.originX);
      }
    }
  });
});
