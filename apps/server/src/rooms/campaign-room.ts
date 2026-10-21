import { randomBytes } from "node:crypto";
import { Room, type Client } from "@colyseus/core";
import {
  authenticate,
  finishAnimation,
  execute,
  readGame,
  projectView,
  updates,
  type Auth,
} from "../application/campaigns.js";
import { RuleError } from "@umbral/core";
import { ZodError } from "zod";
import { SESSION_REPLACED } from "@umbral/protocol";
export const roomCreationKey = randomBytes(32).toString("hex");
export const activeRooms = new Map<string, string>();
export class CampaignRoom extends Room {
  campaignId = "";
  selectedTarget: string | null = null;
  storageError = false;
  private credentials = new Map<string, string>();
  private refreshChain = Promise.resolve();
  private changed = () => {
    void this.refresh();
  };
  onCreate(options: { campaignId: string; creationKey?: string }) {
    if (options.creationKey !== roomCreationKey)
      throw new Error("Use the authenticated connect endpoint");
    this.campaignId = options.campaignId;
    this.maxClients = 10;
    this.autoDispose = false;
    if (activeRooms.has(this.campaignId))
      throw new Error("Campaign already has a room");
    activeRooms.set(this.campaignId, this.roomId);
    updates.on(this.campaignId, this.changed);
    this.onMessage("sync", () => this.refresh());
    this.onMessage("animation-complete", async (client, revision: unknown) => {
      if (
        typeof revision !== "number" ||
        !Number.isSafeInteger(revision) ||
        revision < 0
      )
        return;
      try {
        await finishAnimation(
          this.credentials.get(client.sessionId) ?? "",
          revision,
        );
      } catch (error) {
        if (!(error instanceof RuleError))
          client.send("storage-error", {
            message:
              "No se pudo confirmar el fin de la animación. Reintentá la sincronización.",
          });
      }
    });
    this.onMessage("select", async (client, payload: unknown) => {
      try {
        const auth = await authenticate(
          this.credentials.get(client.sessionId) ?? "",
        );
        const game = await readGame(this.campaignId);
        if (
          auth.role === "PLAYER" &&
          auth.playerId === game.activePlayerId &&
          (payload === null ||
            game.enemies.some((e) => e.id === payload && e.hp > 0))
        ) {
          this.selectedTarget = payload as string | null;
          await this.refresh();
        }
      } catch {
        /* State sync reports connection failures. */
      }
    });
    this.onMessage("command", async (client, input: unknown) => {
      try {
        const receipt = await execute(
          this.credentials.get(client.sessionId)!,
          input,
          this.onlineIds(),
        );
        this.storageError = false;
        await this.refreshChain;
        client.send("receipt", receipt);
      } catch (error) {
        const known = error instanceof RuleError || error instanceof ZodError;
        if (!known) {
          this.storageError = true;
          console.error(
            "command_storage_error",
            error instanceof Error ? error.message : "unknown",
          );
        }
        client.send("failure", {
          commandId:
            typeof input === "object" && input
              ? Reflect.get(input, "commandId")
              : null,
          code:
            error instanceof RuleError
              ? error.code
              : known
                ? "INVALID_COMMAND"
                : "STORAGE_UNAVAILABLE",
          message:
            error instanceof RuleError
              ? error.message
              : known
                ? "Comando inválido."
                : "No se pudo confirmar el guardado. Reintentá la misma operación.",
        });
        await this.refresh();
      }
    });
  }
  async onAuth(_client: Client, options: { token?: string }) {
    const auth = await authenticate(options.token ?? "");
    if (auth.campaignId !== this.campaignId)
      throw new RuleError("FORBIDDEN", "Sesión de otra mesa.");
    return auth;
  }
  async onJoin(client: Client, options: { token: string }) {
    this.credentials.set(client.sessionId, options.token);
    const auth = client.auth as Auth;
    if (auth.playerId)
      for (const other of this.clients) {
        if (
          other !== client &&
          (other.auth as Auth)?.playerId === auth.playerId
        )
          other.leave(SESSION_REPLACED);
      }
    await this.refresh();
  }
  onLeave(client: Client) {
    this.credentials.delete(client.sessionId);
    void this.refresh();
  }
  onDispose() {
    updates.off(this.campaignId, this.changed);
    if (activeRooms.get(this.campaignId) === this.roomId)
      activeRooms.delete(this.campaignId);
  }
  onlineIds() {
    return [
      ...new Set(
        this.clients
          .filter((c) => this.credentials.has(c.sessionId))
          .map((c) => (c.auth as Auth).playerId)
          .filter((id): id is string => !!id),
      ),
    ];
  }
  refresh() {
    this.refreshChain = this.refreshChain
      .catch(() => undefined)
      .then(async () => {
        try {
          const game = await readGame(this.campaignId);
          this.storageError = false;
          for (const client of this.clients) {
            try {
              const auth = await authenticate(
                this.credentials.get(client.sessionId) ?? "",
              );
              client.send(
                "state",
                projectView(
                  game,
                  auth,
                  this.onlineIds(),
                  this.selectedTarget,
                  this.storageError,
                ),
              );
            } catch (error) {
              if (error instanceof RuleError) client.leave(SESSION_REPLACED);
              else throw error;
            }
          }
        } catch {
          this.storageError = true;
          for (const client of this.clients)
            client.send("storage-error", {
              message:
                "La base de datos no está disponible. La partida está detenida.",
            });
        }
      });
    return this.refreshChain;
  }
}
