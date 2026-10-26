import { randomBytes } from "node:crypto";
import { Room, type Client } from "@colyseus/core";
import {
  authenticate,
  finishAnimation,
  execute,
  tickTurn,
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
  private refreshRequested = false;
  private messageCounts = new Map<string, { since: number; count: number }>();
  private lastSync = new Map<string, number>();
  private turnTimer?: ReturnType<typeof setTimeout>;
  private retryTurnAt = 0;
  private closing = false;
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
    this.onMessage("sync", (client) => {
      if (!this.allowMessage(client.sessionId)) return;
      const now = Date.now();
      if (now - (this.lastSync.get(client.sessionId) ?? 0) < 500) return;
      this.lastSync.set(client.sessionId, now);
      void this.refresh();
    });
    this.onMessage("animation-complete", async (client, revision: unknown) => {
      if (!this.allowMessage(client.sessionId)) return;
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
      if (!this.allowMessage(client.sessionId)) return;
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
      if (!this.allowMessage(client.sessionId)) {
        client.send("failure", {
          commandId:
            typeof input === "object" && input
              ? Reflect.get(input, "commandId")
              : null,
          code: "RATE_LIMITED",
          message: "Demasiados mensajes. Esperá un momento y reintentá.",
        });
        return;
      }
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
    void this.refresh();
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
    this.messageCounts.delete(client.sessionId);
    this.lastSync.delete(client.sessionId);
    void this.refresh();
  }
  onDispose() {
    this.closing = true;
    clearTimeout(this.turnTimer);
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
  private allowMessage(sessionId: string) {
    const now = Date.now();
    let record = this.messageCounts.get(sessionId);
    if (!record || now - record.since >= 10_000) {
      record = { since: now, count: 0 };
      this.messageCounts.set(sessionId, record);
    }
    return ++record.count <= 50;
  }
  refresh() {
    if (this.closing) return this.refreshChain;
    if (this.refreshRequested) return this.refreshChain;
    this.refreshRequested = true;
    this.refreshChain = this.refreshChain
      .catch(() => undefined)
      .then(async () => {
        this.refreshRequested = false;
        try {
          const game = await readGame(this.campaignId);
          this.storageError = false;
          this.scheduleTurn(game);
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
          if (!this.closing) {
            clearTimeout(this.turnTimer);
            this.turnTimer = setTimeout(() => void this.refresh(), 1000);
          }
          for (const client of this.clients)
            client.send("storage-error", {
              message:
                "La base de datos no está disponible. La partida está detenida.",
            });
        }
      });
    return this.refreshChain;
  }
  private scheduleTurn(game: Awaited<ReturnType<typeof readGame>>) {
    clearTimeout(this.turnTimer);
    if (this.closing || game.status !== "ACTIVE") return;
    const due =
      game.turnDeadlineAt === undefined
        ? Date.now()
        : game.turnDeadlineAt === null
          ? (game.animationUntil ?? Date.now())
          : game.turnDeadlineAt;
    this.turnTimer = setTimeout(
      () => {
        void tickTurn(this.campaignId)
          .then(() => {
            this.retryTurnAt = 0;
            return this.refresh();
          })
          .catch((error: unknown) => {
            this.retryTurnAt = Date.now() + 1000;
            console.error(
              "turn_timer_storage_error",
              error instanceof Error ? error.message : "unknown",
            );
            void this.refresh();
          });
      },
      Math.max(0, Math.max(due, this.retryTurnAt) - Date.now()),
    );
  }
}
