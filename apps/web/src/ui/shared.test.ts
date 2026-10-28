import { afterEach, describe, expect, it, vi } from "vitest";
import { readPreferences } from "./shared";

function storedPreferences(value: string | null) {
  vi.stubGlobal("localStorage", { getItem: () => value });
}

afterEach(() => vi.unstubAllGlobals());

describe("preferencias de sonido", () => {
  it("activa los efectos de mesa para una instalación nueva sin activar los clics", () => {
    storedPreferences(null);
    expect(readPreferences()).toMatchObject({
      sound: false,
      tableSound: true,
      volume: 0.3,
    });
  });

  it("mantiene activa la mesa aunque los clics anteriores estuvieran apagados", () => {
    storedPreferences('{"sound":false,"volume":0.6}');
    expect(readPreferences()).toMatchObject({
      sound: false,
      tableSound: true,
      volume: 0.6,
    });
  });

  it("respeta el silencio explícito de la mesa y acota el volumen", () => {
    storedPreferences('{"sound":true,"tableSound":false,"volume":3}');
    expect(readPreferences()).toMatchObject({
      sound: true,
      tableSound: false,
      volume: 1,
    });
  });

  it("usa valores seguros si los ajustes están dañados", () => {
    storedPreferences("{not-json}");
    expect(readPreferences()).toMatchObject({ tableSound: true, volume: 0.3 });
    storedPreferences('{"tableSound":"false","volume":null}');
    expect(readPreferences()).toMatchObject({ tableSound: true, volume: 0.3 });
  });
});
