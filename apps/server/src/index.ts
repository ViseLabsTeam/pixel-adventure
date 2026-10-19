import type { IncomingMessage } from "node:http";
import { Server, matchMaker } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import express from "express";
import { z, ZodError } from "zod";
import { RuleError } from "@umbral/core";
import {
  CampaignRoom,
  activeRooms,
  roomCreationKey,
} from "./rooms/campaign-room.js";
import {
  authenticate,
  createCampaign,
  joinCampaign,
  classAvailability,
  reserveClass,
  releaseClass,
  recoverCampaign,
  reclaimPlayer,
  claimPlayer,
  readGame,
} from "./application/campaigns.js";
import { pool } from "./persistence/database.js";
import { migrate } from "./persistence/migrate.js";
const port = Number(process.env.PORT ?? 2567);
const allowed = (process.env.APP_ORIGINS ?? "").split(",").filter(Boolean);
const roomLocks = new Map<string, Promise<string>>();
async function ensureRoom(campaignId: string) {
  const existing = activeRooms.get(campaignId);
  if (existing) return existing;
  let pending = roomLocks.get(campaignId);
  if (!pending) {
    pending = matchMaker
      .createRoom("campaign", { campaignId, creationKey: roomCreationKey })
      .then((r) => r.roomId)
      .finally(() => roomLocks.delete(campaignId));
    roomLocks.set(campaignId, pending);
  }
  return pending;
}
const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
const requests = new Map<string, { at: number; count: number }>();
app.use((req, res, next) => {
  const origin = req.headers.origin,
    host = req.headers["x-forwarded-host"] ?? req.headers.host;
  if (origin && new URL(origin).host !== host && !allowed.includes(origin)) {
    res.status(403).json({ message: "Origen no permitido." });
    return;
  }
  if (req.path.startsWith("/api")) {
    const key = req.ip ?? "local",
      now = Date.now();
    let record = requests.get(key);
    if (!record || now - record.at > 60000) {
      record = { at: now, count: 0 };
      requests.set(key, record);
    }
    if (++record.count > 120) {
      res
        .status(429)
        .json({ message: "Demasiados intentos. Esperá un minuto." });
      return;
    }
  }
  next();
});
const sweep = setInterval(() => {
  for (const [key, record] of requests)
    if (Date.now() - record.at > 60000) requests.delete(key);
}, 60000);
sweep.unref();
app.use(express.json({ limit: "16kb" }));
app.get("/health/live", (_req, res) => res.json({ ok: true }));
app.get("/health/ready", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  } catch {
    res.status(503).json({ ok: false });
  }
});
app.post("/api/campaigns", async (_req, res) =>
  res.json(await createCampaign()),
);
app.post("/api/join", async (req, res) =>
  res.json(await joinCampaign(req.body)),
);
app.post("/api/class-availability", async (req, res) =>
  res.json(await classAvailability(req.body)),
);
app.post("/api/reserve-class", async (req, res) =>
  res.json(await reserveClass(req.body)),
);
app.post("/api/release-class", async (req, res) =>
  res.json(await releaseClass(req.body)),
);
app.post("/api/recover", async (req, res) =>
  res.json(
    await recoverCampaign(z.string().max(120).parse(req.body.recoveryCode)),
  ),
);
app.post("/api/claim", async (req, res) =>
  res.json(
    await claimPlayer(z.string().min(16).max(16).parse(req.body.claimCode)),
  ),
);
app.post("/api/reclaim", async (req, res) =>
  res.json(
    await reclaimPlayer(
      req.headers.authorization?.replace(/^Bearer /, "") ?? "",
      z.uuid().parse(req.body.playerId),
    ),
  ),
);
app.post("/api/connect", async (req, res) => {
  const auth = await authenticate(
    req.headers.authorization?.replace(/^Bearer /, "") ?? "",
  );
  const game = await readGame(auth.campaignId);
  res.json({ roomId: await ensureRoom(auth.campaignId), code: game.code });
});
app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    if (error instanceof RuleError)
      res
        .status(error.code === "UNAUTHORIZED" ? 401 : 400)
        .json({ code: error.code, message: error.message });
    else if (error instanceof ZodError)
      res.status(400).json({
        code: "INVALID_INPUT",
        message: "Revisá el nombre, código y personaje elegidos.",
      });
    else {
      console.error(
        "http_error",
        error instanceof Error ? error.message : "unknown",
      );
      res.status(503).json({
        code: "UNAVAILABLE",
        message: "No pudimos guardar la operación. Intentá nuevamente.",
      });
    }
  },
);
const server = new Server({
  greet: false,
  transport: new WebSocketTransport({
    maxPayload: 16384,
    pingInterval: 3000,
    pingMaxRetries: 2,
    verifyClient: ({ origin, req }: { origin: string; req: IncomingMessage }) =>
      !origin ||
      new URL(origin).host ===
        (req.headers["x-forwarded-host"] ?? req.headers.host) ||
      allowed.includes(origin),
  }),
  express: (transportApp) => {
    transportApp.use(app);
  },
  beforeListen: migrate,
});
server.define("campaign", CampaignRoom);
server.onShutdown(async () => {
  clearInterval(sweep);
  await pool.end();
});
await server.listen(port, "0.0.0.0");
console.log(`Umbral server ready on :${port}`);
