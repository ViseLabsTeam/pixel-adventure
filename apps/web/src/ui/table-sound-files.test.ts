import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const names = ["damage", "equip", "unequip", "heal"] as const;

describe("archivos originales de sonido", () => {
  it("incluye cuatro WAV PCM mono válidos y diferentes de menos de un segundo", () => {
    const hashes = new Set<string>();
    for (const name of names) {
      const data = readFileSync(
        new URL(
          `../../../../assets/audio/generated/${name}.wav`,
          import.meta.url,
        ),
      );
      expect(data.toString("ascii", 0, 4)).toBe("RIFF");
      expect(data.toString("ascii", 8, 12)).toBe("WAVE");
      expect(data.toString("ascii", 12, 16)).toBe("fmt ");
      expect(data.readUInt16LE(20)).toBe(1);
      expect(data.readUInt16LE(22)).toBe(1);
      expect(data.readUInt16LE(34)).toBe(16);
      const rate = data.readUInt32LE(24);
      const samples = data.readUInt32LE(40) / 2;
      expect(samples / rate).toBeGreaterThan(0.1);
      expect(samples / rate).toBeLessThan(1);
      hashes.add(createHash("sha256").update(data).digest("hex"));
    }
    expect(hashes.size).toBe(names.length);
  });
});
