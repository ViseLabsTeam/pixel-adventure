import { describe, expect, it } from "vitest";
import { allowedOrigins, originAllowed } from "./origin-policy";

describe("orígenes HTTP y WebSocket", () => {
  it("acepta el mismo host o una excepción explícita", () => {
    expect(
      originAllowed("https://demo.example.org", "demo.example.org", []),
    ).toBe(true);
    expect(
      originAllowed("https://invite.example.org", "demo.example.org", [
        "https://invite.example.org",
      ]),
    ).toBe(true);
    expect(
      originAllowed("https://otro.example.org", "demo.example.org", []),
    ).toBe(false);
  });

  it("rechaza encabezados inválidos sin lanzar una excepción", () => {
    for (const origin of [
      "null",
      "not a URL",
      "javascript://demo.example.org",
      "https://usuario:clave@demo.example.org",
      "https://demo.example.org/path",
    ]) {
      expect(originAllowed(origin, "demo.example.org", [])).toBe(false);
    }
    expect(originAllowed(undefined, "demo.example.org", [])).toBe(true);
    expect(
      originAllowed("https://demo.example.org", ["demo.example.org"], []),
    ).toBe(false);
  });

  it("valida los orígenes configurados al iniciar", () => {
    expect(
      allowedOrigins("https://uno.example.org, http://localhost:5173"),
    ).toEqual(["https://uno.example.org", "http://localhost:5173"]);
    expect(() => allowedOrigins("https://usuario:clave@example.org")).toThrow();
  });
});
