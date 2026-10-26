import { describe, expect, it } from "vitest";
import {
  chooseInvitationOrigin,
  invitationUrl,
  normalizeInvitationOrigin,
} from "./invitation";

describe("invitación por modo de partida", () => {
  it("conserva la dirección LAN para partidas locales", () => {
    expect(normalizeInvitationOrigin("http://192.168.1.10:8088", "LOCAL")).toBe(
      "http://192.168.1.10:8088",
    );
    expect(invitationUrl("http://192.168.1.10:8088", "ABC123", "LOCAL")).toBe(
      "http://192.168.1.10:8088/#/join/ABC123",
    );
    expect(normalizeInvitationOrigin("http://localhost:8088", "LOCAL")).toBe(
      null,
    );
  });

  it("para online solo ofrece un origen HTTPS público sin credenciales", () => {
    expect(
      normalizeInvitationOrigin("https://mesa.trycloudflare.com", "ONLINE"),
    ).toBe("https://mesa.trycloudflare.com");
    for (const address of [
      "http://mesa.trycloudflare.com",
      "https://localhost:8088",
      "https://192.168.1.10",
      "https://10.0.0.2",
      "https://usuario:clave@mesa.trycloudflare.com",
      "https://mesa.trycloudflare.com/path",
      "https://mesa.trycloudflare.com/?token=secreto",
      "https://mesa.trycloudflare.com/#/session",
    ]) {
      expect(normalizeInvitationOrigin(address, "ONLINE")).toBe(null);
    }
  });

  it("usa el enlace actual del túnel y conserva uno elegido al volver desde localhost", () => {
    expect(
      chooseInvitationOrigin({
        mode: "ONLINE",
        currentOrigin: "https://actual.trycloudflare.com",
        savedOrigin: "https://anterior.trycloudflare.com",
      }),
    ).toBe("https://actual.trycloudflare.com");
    expect(
      chooseInvitationOrigin({
        mode: "ONLINE",
        currentOrigin: "http://localhost:8088",
        savedOrigin: "https://mesa.trycloudflare.com",
      }),
    ).toBe("https://mesa.trycloudflare.com");
  });
});
