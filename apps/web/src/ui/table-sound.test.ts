import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Preferences } from "./shared";

const preferences: Preferences = {
  sound: false,
  tableSound: true,
  volume: 0.6,
  reducedMotion: false,
  grid: true,
};

class FakeSource {
  onended: (() => void) | null = null;
  buffer: unknown;
  starts = 0;
  stops = 0;
  connect() {}
  disconnect() {}
  start() {
    this.starts++;
  }
  stop() {
    this.stops++;
    this.onended?.();
  }
}

class FakeGain {
  gain = { value: 0 };
  connect() {}
  disconnect() {}
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  state = "suspended";
  destination = {};
  sources: FakeSource[] = [];
  gains: FakeGain[] = [];
  rejectResume = false;
  constructor() {
    FakeAudioContext.instances.push(this);
  }
  async resume() {
    if (this.rejectResume) throw new Error("blocked");
    this.state = "running";
  }
  async decodeAudioData() {
    return {};
  }
  createBufferSource() {
    const source = new FakeSource();
    this.sources.push(source);
    return source;
  }
  createGain() {
    const gain = new FakeGain();
    this.gains.push(gain);
    return gain;
  }
}

const fetchSound = vi.fn(async (_url: string) => ({
  ok: true,
  arrayBuffer: async () => new ArrayBuffer(8),
}));

beforeEach(() => {
  vi.resetModules();
  FakeAudioContext.instances = [];
  fetchSound.mockClear();
  vi.stubGlobal("AudioContext", FakeAudioContext);
  vi.stubGlobal("fetch", fetchSound);
});

afterEach(() => vi.unstubAllGlobals());

describe("sonidos de acciones confirmadas en la mesa", () => {
  it("carga cuatro archivos diferentes y usa un timbre por acción", async () => {
    const sound = await import("./table-sound");
    expect(await sound.unlockTableSound()).toBe(true);
    await vi.waitFor(() => expect(fetchSound).toHaveBeenCalledTimes(4));
    const urls = fetchSound.mock.calls.map(([url]) => String(url));
    expect(new Set(urls).size).toBe(4);
    for (const name of ["damage", "equip", "unequip", "heal"] as const)
      expect(urls.some((url) => url.endsWith(`${name}.wav`))).toBe(true);

    for (const kind of ["damage", "equip", "unequip", "heal"] as const)
      sound.playTableSound(kind, preferences);
    const audio = FakeAudioContext.instances[0];
    await vi.waitFor(() =>
      expect(
        audio.sources.reduce((total, source) => total + source.starts, 0),
      ).toBe(4),
    );
    expect(audio.gains.map((gain) => gain.gain.value)).toEqual([
      0.3, 0.3, 0.3, 0.3,
    ]);
    sound.stopTableSounds();
  });

  it("no reproduce sin gesto, con mute o con volumen cero", async () => {
    const sound = await import("./table-sound");
    sound.playTableSound("damage", preferences);
    expect(FakeAudioContext.instances[0].sources).toHaveLength(0);
    await sound.unlockTableSound();
    sound.playTableSound("equip", { ...preferences, tableSound: false });
    sound.playTableSound("heal", { ...preferences, volume: 0 });
    await Promise.resolve();
    expect(FakeAudioContext.instances[0].sources).toHaveLength(0);
  });

  it("detiene una voz activa al silenciar la mesa", async () => {
    const sound = await import("./table-sound");
    await sound.unlockTableSound();
    sound.playTableSound("heal", preferences);
    const audio = FakeAudioContext.instances[0];
    await vi.waitFor(() => expect(audio.sources[0]?.starts).toBe(1));
    sound.configureTableSounds({ ...preferences, tableSound: false });
    expect(audio.sources[0].stops).toBe(1);
  });

  it("no reproduce una carga pendiente después de cerrar la mesa", async () => {
    let finishFetch!: (value: {
      ok: boolean;
      arrayBuffer: () => Promise<ArrayBuffer>;
    }) => void;
    fetchSound.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishFetch = resolve;
        }),
    );
    const sound = await import("./table-sound");
    sound.playTableSound("damage", preferences);
    const audio = FakeAudioContext.instances[0];
    audio.state = "running";
    sound.playTableSound("damage", preferences);
    sound.stopTableSounds();
    finishFetch({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
    });
    await vi.waitFor(() => expect(fetchSound).toHaveBeenCalledTimes(1));
    await Promise.resolve();
    await Promise.resolve();
    expect(audio.sources).toHaveLength(0);
  });

  it("tolera el bloqueo del navegador sin reproducir ni fallar", async () => {
    const sound = await import("./table-sound");
    sound.preloadTableSounds();
    FakeAudioContext.instances[0].rejectResume = true;
    await expect(sound.unlockTableSound()).resolves.toBe(false);
    expect(() => sound.playTableSound("damage", preferences)).not.toThrow();
    expect(FakeAudioContext.instances[0].sources).toHaveLength(0);
  });
});
