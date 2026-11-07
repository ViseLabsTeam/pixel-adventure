import { animationDuration } from "./animation-duration.js";
import { randomBytes, randomInt, randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import type { PoolClient } from "pg";
import {
  addPlayer,
  createGame,
  resolve,
  effectiveStats,
  attackPreview,
  RuleError,
  type Game,
} from "@umbral/core";
import { prototype } from "@umbral/content/prototype";
import { animationGraceMs } from "@umbral/content";
import {
  createCampaignSchema,
  commandSchema,
  joinSchema,
  availabilitySchema,
  reserveClassSchema,
  type Session,
  type GameView,
  type Receipt,
  type ClassAvailability,
} from "@umbral/protocol";
import {
  hash,
  pool,
  transaction,
  readGame,
  writeGame,
  validateSave,
} from "../persistence/database.js";
export const updates = new EventEmitter();
updates.setMaxListeners(1000);
const turnDurationMs = 20_000;

function settleTurnClock(game: Game, now: number): Game {
  if (game.status !== "ACTIVE") return game;
  let next = game;
  if (next.turnRemainingMs === undefined || next.turnDeadlineAt === undefined) {
    next = {
      ...next,
      turnRemainingMs: turnDurationMs,
      turnDeadlineAt:
        next.animationPending || (next.animationUntil ?? 0) > now
          ? null
          : now + turnDurationMs,
    };
  }
  if (next.turnDeadlineAt === null && (next.animationUntil ?? 0) <= now) {
    next = {
      ...next,
      animationPending: false,
      turnDeadlineAt: now + (next.turnRemainingMs ?? turnDurationMs),
    };
  }
  return next;
}

function clockAfterAction(
  previous: Game,
  next: Game,
  now: number,
  duration: number,
) {
  if (next.status !== "ACTIVE") {
    next.turnRemainingMs = 0;
    next.turnDeadlineAt = null;
    return;
  }
  const newTurn = next.activePlayerId !== previous.activePlayerId;
  const remaining = newTurn
    ? turnDurationMs
    : Math.max(0, (previous.turnDeadlineAt ?? now) - now);
  next.turnRemainingMs = remaining;
  next.turnDeadlineAt = duration
    ? null
    : newTurn
      ? now + remaining
      : (previous.turnDeadlineAt ?? now + remaining);
}

async function expireTurnLocked(
  client: PoolClient,
  previous: Game,
  current: Game,
  now: number,
) {
  const actorId = current.activePlayerId;
  if (!actorId) return current;
  const action = current.pendingAttack
    ? ({ type: "ROLL_ATTACK_D6" } as const)
    : ({ type: "END_TURN" } as const);
  const next = resolve(current, actorId, action, prototype, (sides) =>
    randomInt(1, sides + 1),
  );
  const duration = animationDuration(current, next, action, actorId);
  next.animationUntil = duration ? now + duration + animationGraceMs : 0;
  next.animationPending = duration > 0;
  clockAfterAction(current, next, now, duration);
  const suffix = current.pendingAttack ? "damage" : "turn";
  const digest = hash(
    `${current.id}:${current.round}:${actorId}:timeout:${suffix}`,
  );
  const variant = "89ab"[parseInt(digest[16], 16) % 4];
  const commandId = `${digest.slice(0, 8)}-${digest.slice(8, 12)}-8${digest.slice(13, 16)}-${variant}${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
  const priorIds = new Set(previous.events.map((event) => event.id));
  const receipt: Receipt = {
    commandId,
    revision: next.revision,
    events: next.events.filter((event) => !priorIds.has(event.id)),
  };
  await writeGame(client, previous, next);
  await client.query(
    "INSERT INTO command_receipts(campaign_id,actor_id,command_id,payload_hash,result) VALUES($1,$2,$3,$4,$5)",
    [current.id, "SYSTEM", commandId, digest, JSON.stringify(receipt)],
  );
  return next;
}

export async function tickTurn(campaignId: string) {
  const result = await transaction(async (client) => {
    const row = (
      await client.query(
        "SELECT snapshot FROM campaigns WHERE id=$1 FOR UPDATE",
        [campaignId],
      )
    ).rows[0];
    if (!row) throw new RuleError("NOT_FOUND", "No encontramos esa mesa.");
    const previous = validateSave(row.snapshot);
    const now = Date.now();
    const current = settleTurnClock(previous, now);
    if (
      current.status === "ACTIVE" &&
      current.turnDeadlineAt !== null &&
      current.turnDeadlineAt !== undefined &&
      current.turnDeadlineAt <= now
    ) {
      await expireTurnLocked(client, previous, current, now);
      return true;
    }
    if (current !== previous) {
      await writeGame(client, previous, current);
      return true;
    }
    return false;
  });
  if (result) updates.emit(campaignId);
  return result;
}
export type Auth = {
  campaignId: string;
  role: Session["role"];
  playerId: string | null;
  tokenHash: string;
};
const token = () => randomBytes(32).toString("base64url");
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const code = () =>
  Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join(
    "",
  );
export async function authenticate(credential: string): Promise<Auth> {
  if (typeof credential !== "string" || credential.length > 120)
    throw new RuleError("UNAUTHORIZED", "Sesión no válida.");
  const result = await pool.query(
    "SELECT campaign_id,role,player_id FROM sessions WHERE token_hash=$1",
    [hash(credential)],
  );
  if (!result.rows[0])
    throw new RuleError(
      "UNAUTHORIZED",
      "La sesión venció o fue reemplazada. Recuperá tu personaje.",
    );
  const row = result.rows[0];
  return {
    campaignId: row.campaign_id,
    role: row.role,
    playerId: row.player_id,
    tokenHash: hash(credential),
  };
}
export async function createCampaign(input: unknown = {}) {
  const { mode } = createCampaignSchema.parse(input);
  const id = randomUUID(),
    credential = token(),
    recoveryCode = token(),
    joinCode = code(),
    game = createGame(id, joinCode, prototype);
  game.mode = mode;
  await transaction(async (client) => {
    await client.query(
      "INSERT INTO campaigns(id,code,recovery_hash,revision,snapshot) VALUES($1,$2,$3,0,$4)",
      [id, joinCode, hash(recoveryCode), JSON.stringify(game)],
    );
    await client.query(
      "INSERT INTO sessions(token_hash,campaign_id,role) VALUES($1,$2,$3)",
      [hash(credential), id, "COORDINATOR"],
    );
  });
  return {
    session: {
      campaignId: id,
      token: credential,
      role: "COORDINATOR",
      playerId: null,
      code: joinCode,
    } satisfies Session,
    recoveryCode,
  };
}
export async function classAvailability(
  input: unknown,
): Promise<ClassAvailability> {
  const data = availabilitySchema.parse(input);
  const result = await pool.query(
    "SELECT id,snapshot FROM campaigns WHERE code=$1",
    [data.code],
  );
  if (!result.rows[0])
    throw new RuleError("NOT_FOUND", "Ese código no corresponde a una mesa.");
  const game = validateSave(result.rows[0].snapshot);
  const reservations = await pool.query(
    "SELECT class_id,token_hash FROM class_reservations WHERE campaign_id=$1 AND expires_at>now()",
    [game.id],
  );
  return {
    status: game.status,
    occupied: game.players.map((player) => player.classId),
    reserved: reservations.rows
      .filter((row) => row.token_hash !== hash(data.reservationToken ?? ""))
      .map((row) => row.class_id),
  };
}
export async function reserveClass(input: unknown) {
  const data = reserveClassSchema.parse(input);
  return transaction(async (client) => {
    const row = (
      await client.query(
        "SELECT snapshot FROM campaigns WHERE code=$1 FOR UPDATE",
        [data.code],
      )
    ).rows[0];
    if (!row)
      throw new RuleError("NOT_FOUND", "Ese código no corresponde a una mesa.");
    const game = validateSave(row.snapshot);
    if (game.status !== "LOBBY")
      throw new RuleError("ALREADY_STARTED", "La aventura ya comenzó.");
    if (game.players.some((player) => player.classId === data.classId))
      throw new RuleError(
        "CLASS_TAKEN",
        "Ese personaje ya fue elegido en esta mesa.",
      );
    await client.query(
      "DELETE FROM class_reservations WHERE campaign_id=$1 AND expires_at<=now()",
      [game.id],
    );
    const existing = (
      await client.query(
        "SELECT token_hash FROM class_reservations WHERE campaign_id=$1 AND class_id=$2",
        [game.id, data.classId],
      )
    ).rows[0];
    const tokenHash = hash(data.reservationToken);
    if (existing && existing.token_hash !== tokenHash)
      throw new RuleError(
        "CLASS_TAKEN",
        "Ese personaje está reservado por otra persona.",
      );
    await client.query(
      "DELETE FROM class_reservations WHERE campaign_id=$1 AND token_hash=$2",
      [game.id, tokenHash],
    );
    await client.query(
      "INSERT INTO class_reservations(campaign_id,class_id,token_hash,expires_at) VALUES($1,$2,$3,now()+interval '30 seconds')",
      [game.id, data.classId, tokenHash],
    );
    return { reserved: data.classId };
  });
}
export async function releaseClass(input: unknown) {
  const data = availabilitySchema.parse(input);
  if (!data.reservationToken) return { released: false };
  await pool.query(
    "DELETE FROM class_reservations WHERE campaign_id=(SELECT id FROM campaigns WHERE code=$1) AND token_hash=$2",
    [data.code, hash(data.reservationToken)],
  );
  return { released: true };
}
export async function joinCampaign(input: unknown) {
  const data = joinSchema.parse(input),
    id = randomUUID(),
    credential = token();
  const session = await transaction(async (client) => {
    const result = await client.query(
      "SELECT snapshot FROM campaigns WHERE code=$1 FOR UPDATE",
      [data.code],
    );
    if (!result.rows[0])
      throw new RuleError("NOT_FOUND", "Ese código no corresponde a una mesa.");
    const previous = validateSave(result.rows[0].snapshot),
      next = addPlayer(previous, id, data.name, data.classId, prototype);
    await client.query(
      "DELETE FROM class_reservations WHERE campaign_id=$1 AND expires_at<=now()",
      [previous.id],
    );
    const reservation = (
      await client.query(
        "SELECT token_hash FROM class_reservations WHERE campaign_id=$1 AND class_id=$2",
        [previous.id, data.classId],
      )
    ).rows[0];
    if (
      reservation &&
      reservation.token_hash !== hash(data.reservationToken ?? "")
    )
      throw new RuleError(
        "CLASS_TAKEN",
        "Ese personaje está reservado por otra persona.",
      );
    await client.query(
      "INSERT INTO campaign_players(id,campaign_id,slot) VALUES($1,$2,$3)",
      [id, previous.id, next.players.length - 1],
    );
    await client.query(
      "INSERT INTO sessions(token_hash,campaign_id,role,player_id) VALUES($1,$2,$3,$4)",
      [hash(credential), previous.id, "PLAYER", id],
    );
    await writeGame(client, previous, next);
    await client.query(
      "DELETE FROM class_reservations WHERE campaign_id=$1 AND (class_id=$2 OR token_hash=$3)",
      [previous.id, data.classId, hash(data.reservationToken ?? "")],
    );
    return {
      campaignId: previous.id,
      token: credential,
      role: "PLAYER",
      playerId: id,
      code: data.code,
    } satisfies Session;
  });
  updates.emit(session.campaignId);
  return { session };
}
export async function recoverCampaign(recoveryCode: string) {
  if (typeof recoveryCode !== "string" || recoveryCode.length > 120)
    throw new RuleError("UNAUTHORIZED", "Código privado no válido.");
  const result = await pool.query(
    "SELECT snapshot FROM campaigns WHERE recovery_hash=$1",
    [hash(recoveryCode.trim())],
  );
  if (!result.rows[0])
    throw new RuleError("NOT_FOUND", "Código privado incorrecto.");
  const game = validateSave(result.rows[0].snapshot),
    credential = token();
  await pool.query(
    "INSERT INTO sessions(token_hash,campaign_id,role) VALUES($1,$2,$3)",
    [hash(credential), game.id, "COORDINATOR"],
  );
  return {
    session: {
      campaignId: game.id,
      token: credential,
      role: "COORDINATOR",
      playerId: null,
      code: game.code,
    } satisfies Session,
  };
}
export async function reclaimPlayer(credential: string, playerId: string) {
  const auth = await authenticate(credential);
  if (auth.role !== "COORDINATOR")
    throw new RuleError(
      "FORBIDDEN",
      "Solo el coordinador reasigna personajes.",
    );
  const claimCode = randomBytes(8).toString("hex").toUpperCase();
  await transaction(async (client) => {
    const row = (
      await client.query(
        "SELECT snapshot FROM campaigns WHERE id=$1 FOR UPDATE",
        [auth.campaignId],
      )
    ).rows[0];
    const game = validateSave(row.snapshot);
    if (!game.players.some((p) => p.id === playerId))
      throw new RuleError("NOT_FOUND", "Personaje inexistente.");
    await client.query(
      "DELETE FROM player_claims WHERE campaign_id=$1 AND player_id=$2",
      [game.id, playerId],
    );
    await client.query(
      "INSERT INTO player_claims(code_hash,campaign_id,player_id,expires_at) VALUES($1,$2,$3,now()+interval '10 minutes')",
      [hash(claimCode), game.id, playerId],
    );
  });
  return { claimCode };
}
export async function claimPlayer(claimCode: string) {
  const credential = token();
  const session = await transaction(async (client) => {
    const claimHash = hash(claimCode.trim().toUpperCase());
    const candidate = (
      await client.query(
        "SELECT campaign_id FROM player_claims WHERE code_hash=$1",
        [claimHash],
      )
    ).rows[0];
    if (!candidate)
      throw new RuleError(
        "UNAUTHORIZED",
        "El código de control venció o ya fue utilizado.",
      );
    await client.query("SELECT id FROM campaigns WHERE id=$1 FOR UPDATE", [
      candidate.campaign_id,
    ]);
    const claim = (
      await client.query(
        "SELECT * FROM player_claims WHERE code_hash=$1 AND expires_at>now() FOR UPDATE",
        [claimHash],
      )
    ).rows[0];
    if (!claim)
      throw new RuleError(
        "UNAUTHORIZED",
        "El código de control venció o ya fue utilizado.",
      );
    const row = (
      await client.query(
        "SELECT snapshot FROM campaigns WHERE id=$1 FOR UPDATE",
        [claim.campaign_id],
      )
    ).rows[0];
    const game = validateSave(row.snapshot);
    await client.query(
      "DELETE FROM sessions WHERE campaign_id=$1 AND player_id=$2",
      [game.id, claim.player_id],
    );
    await client.query(
      "INSERT INTO sessions(token_hash,campaign_id,role,player_id) VALUES($1,$2,$3,$4)",
      [hash(credential), game.id, "PLAYER", claim.player_id],
    );
    await client.query("DELETE FROM player_claims WHERE code_hash=$1", [
      claim.code_hash,
    ]);
    return {
      campaignId: game.id,
      token: credential,
      role: "PLAYER",
      playerId: claim.player_id,
      code: game.code,
    } satisfies Session;
  });
  updates.emit(session.campaignId);
  return { session };
}
export async function execute(
  credential: string,
  input: unknown,
  onlineIds: string[],
): Promise<Receipt> {
  const auth = await authenticate(credential),
    command = commandSchema.parse(input),
    actor = auth.playerId ?? auth.role,
    payloadHash = hash(JSON.stringify(command));
  const outcome = await transaction(async (client) => {
    const row = (
      await client.query(
        "SELECT snapshot FROM campaigns WHERE id=$1 FOR UPDATE",
        [auth.campaignId],
      )
    ).rows[0];
    if (
      !(
        await client.query("SELECT 1 FROM sessions WHERE token_hash=$1", [
          auth.tokenHash,
        ])
      ).rowCount
    )
      throw new RuleError("UNAUTHORIZED", "El control fue reemplazado.");
    const previous = validateSave(row.snapshot);
    const saved = (
      await client.query(
        "SELECT payload_hash,result FROM command_receipts WHERE campaign_id=$1 AND actor_id=$2 AND command_id=$3",
        [auth.campaignId, actor, command.commandId],
      )
    ).rows[0];
    if (saved) {
      if (saved.payload_hash !== payloadHash)
        throw new RuleError(
          "COMMAND_REUSED",
          "El identificador ya se usó para otro comando.",
        );
      return { kind: "receipt" as const, receipt: saved.result as Receipt };
    }
    const now = Date.now();
    const current = settleTurnClock(previous, now);
    if (
      current.status === "ACTIVE" &&
      current.turnDeadlineAt !== null &&
      current.turnDeadlineAt !== undefined &&
      current.turnDeadlineAt <= now
    ) {
      await expireTurnLocked(client, previous, current, now);
      return { kind: "expired" as const };
    }
    if (command.expectedRevision !== current.revision)
      throw new RuleError(
        "STALE_REVISION",
        "La mesa se actualizó. Volvé a intentar con el estado actual.",
      );
    if (command.action.type === "START") {
      if (auth.role !== "COORDINATOR")
        throw new RuleError(
          "FORBIDDEN",
          "Solo el coordinador inicia la aventura.",
        );
      if (current.players.some((p) => !onlineIds.includes(p.id)))
        throw new RuleError(
          "PLAYER_OFFLINE",
          "Todos los controles deben estar conectados para empezar.",
        );
    } else {
      if (auth.role !== "PLAYER")
        throw new RuleError(
          "FORBIDDEN",
          "Esta pantalla no controla un personaje.",
        );
    }
    if (current.animationPending || (current.animationUntil ?? 0) > now)
      throw new RuleError(
        "ANIMATION_PLAYING",
        "Esperá a que termine la animación.",
      );
    const next = resolve(
      current,
      auth.playerId,
      command.action,
      prototype,
      (sides) => randomInt(1, sides + 1),
    );
    const duration = animationDuration(
      current,
      next,
      command.action,
      auth.playerId,
    );
    next.animationUntil = duration ? now + duration + animationGraceMs : 0;
    next.animationPending = duration > 0;
    clockAfterAction(current, next, now, duration);
    const ids = new Set(previous.events.map((e) => e.id)),
      result: Receipt = {
        commandId: command.commandId,
        revision: next.revision,
        events: next.events.filter((e) => !ids.has(e.id)),
      };
    await writeGame(client, previous, next);
    await client.query(
      "INSERT INTO command_receipts(campaign_id,actor_id,command_id,payload_hash,result) VALUES($1,$2,$3,$4,$5)",
      [
        auth.campaignId,
        actor,
        command.commandId,
        payloadHash,
        JSON.stringify(result),
      ],
    );
    return { kind: "receipt" as const, receipt: result };
  });
  updates.emit(auth.campaignId);
  if (outcome.kind === "expired")
    throw new RuleError("TURN_EXPIRED", "Se agotó el tiempo de este turno.");
  return outcome.receipt;
}
export function projectView(
  game: Game,
  auth: Auth,
  onlineIds: string[],
  selectedTarget: string | null,
  storageError = false,
): GameView {
  const player = game.players.find((p) => p.id === auth.playerId);
  return {
    mode: game.mode,
    animationPending: game.animationPending ?? false,
    animationUntil: game.animationUntil ?? 0,
    serverNow: Date.now(),
    turnRemainingMs: game.turnRemainingMs ?? 0,
    turnDeadlineAt: game.turnDeadlineAt ?? null,
    id: game.id,
    code: game.code,
    revision: game.revision,
    status: game.status,
    round: game.round,
    phase: game.phase,
    encounterMode: game.encounterMode ?? "COMBAT",
    movementMode: game.movementMode ?? "COMBAT",
    activePlayerId: game.activePlayerId,
    movementRoll: game.movementRoll,
    movementLeft: game.movementLeft,
    actionUsed: game.actionUsed,
    pendingAttack: game.pendingAttack ?? null,
    players: game.players.map((p) => ({
      ...p,
      stats: effectiveStats(game, p),
    })),
    enemies: game.enemies.map(({ id, archetypeId, name, x, y, hp, maxHp }) => ({
      id,
      archetypeId: archetypeId ?? id,
      name,
      x,
      y,
      hp,
      maxHp,
    })),
    chests: game.chests.map(({ id, x, y, opened }) => ({ id, x, y, opened })),
    interactables: game.interactables.map(({ id, kind, name, x, y, used }) => ({
      id,
      kind,
      name,
      x,
      y,
      used,
    })),
    zones: game.zones,
    map: game.map,
    items: Object.fromEntries(
      Object.entries(game.items).map(([id, item]) => [
        id,
        {
          ...item,
          allowedClasses: prototype.items[item.definitionId].allowedClasses,
        },
      ]),
    ),
    events: game.events,
    onlinePlayerIds: onlineIds,
    paused: false,
    targets: player
      ? Object.fromEntries(
          game.enemies.map((e) => [e.id, attackPreview(game, player, e)]),
        )
      : {},
    selectedTarget,
    storageError,
  };
}
export { readGame };

export async function finishAnimation(credential: string, revision: number) {
  const auth = await authenticate(credential);
  if (auth.role === "PLAYER")
    throw new RuleError(
      "FORBIDDEN",
      "Solo la pantalla compartida confirma animaciones.",
    );
  const changed = await transaction(async (client) => {
    const row = (
      await client.query(
        "SELECT snapshot FROM campaigns WHERE id=$1 FOR UPDATE",
        [auth.campaignId],
      )
    ).rows[0];
    if (
      !(
        await client.query("SELECT 1 FROM sessions WHERE token_hash=$1", [
          auth.tokenHash,
        ])
      ).rowCount
    )
      throw new RuleError("UNAUTHORIZED", "Sesión reemplazada.");
    const game = validateSave(row.snapshot);
    if (game.revision !== revision || !game.animationPending) return false;
    await writeGame(
      client,
      game,
      settleTurnClock({ ...game, animationPending: false }, Date.now()),
    );
    return true;
  });
  if (changed) updates.emit(auth.campaignId);
}
