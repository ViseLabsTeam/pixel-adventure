import { describe, expect, it } from "vitest";
import { impactKnockback, isDamagingImpact } from "./impact-knockback";

describe("presentación de golpes con daño", () => {
  it("solo reacciona al resultado final de un golpe que quitó vida", () => {
    expect(isDamagingImpact({ kind: "ATTACK", amount: 7 })).toBe(true);
    expect(isDamagingImpact({ kind: "ENEMY", amount: 4 })).toBe(true);
    expect(isDamagingImpact({ kind: "ATTACK", amount: 0 })).toBe(false);
    expect(isDamagingImpact({ kind: "ENEMY", amount: 0 })).toBe(false);
    expect(isDamagingImpact({ kind: "MISS", amount: 0 })).toBe(false);
    expect(isDamagingImpact({ kind: "ATTACK_MISS_ROLL", amount: 0 })).toBe(
      false,
    );
    expect(isDamagingImpact({ kind: "ATTACK_D6", amount: 7 })).toBe(false);
    expect(isDamagingImpact({ kind: "ATTACK", amount: 7 }, true)).toBe(false);
    expect(isDamagingImpact({ kind: "ENEMY", amount: 4 }, true)).toBe(false);
  });

  it("empuja al objetivo en la dirección opuesta al atacante", () => {
    expect(impactKnockback({ x: 9, y: -18 }, { x: 12, y: -18 })).toEqual({
      x: 14,
      y: 0,
    });
    expect(impactKnockback({ x: 12, y: -18 }, { x: 9, y: -18 })).toEqual({
      x: -14,
      y: 0,
    });
    expect(impactKnockback({ x: 9, y: -18 }, { x: 9, y: -16 })).toEqual({
      x: 0,
      y: 14,
    });
    expect(impactKnockback({ x: 9, y: -16 }, { x: 9, y: -18 })).toEqual({
      x: 0,
      y: -14,
    });
  });

  it("normaliza diagonales y mantiene el efecto dentro de la casilla", () => {
    const offset = impactKnockback({ x: 0, y: 0 }, { x: 2, y: -2 });
    expect(offset.x).toBeGreaterThan(0);
    expect(offset.y).toBeLessThan(0);
    expect(Math.hypot(offset.x, offset.y)).toBeCloseTo(14);
    expect(Math.abs(offset.x)).toBeLessThan(35);
    expect(Math.abs(offset.y)).toBeLessThan(35);
    expect(impactKnockback({ x: 4, y: 5 }, { x: 4, y: 5 })).toEqual({
      x: 0,
      y: 0,
    });
    const large = impactKnockback({ x: 0, y: 0 }, { x: 1, y: 0 }, 1000);
    expect(large.x).toBeLessThan(35);
    expect(large.y).toBe(0);
  });
});
