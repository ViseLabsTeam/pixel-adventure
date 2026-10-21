import { saveSchema } from "./save-schema.js";
import { Pool, type PoolClient } from "pg";
import { createHash } from "node:crypto";
import { assertInventory, RuleError, type Game } from "@umbral/core";
import { prototype } from "@umbral/content/prototype";
export const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    "postgres://umbral:umbral_local@127.0.0.1:5434/umbral",
  max: 10,
  connectionTimeoutMillis: 4000,
  statement_timeout: 6000,
});
pool.on("error", (error) =>
  console.error("database_pool_error", error.message),
);
export const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export async function transaction<T>(
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
export function validateSave(input: unknown): Game {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success)
    throw new RuleError(
      "INCOMPATIBLE_SAVE",
      "El guardado tiene un formato incompatible o incompleto.",
    );
  const value: Game = {
    ...parsed.data,
    itemClassRulesVersion: 1,
    potionSlotsVersion: 1,
    paladinShieldVersion: 1,
    players: parsed.data.players.map((player) => ({
      ...player,
      potions: player.potions ?? [null, null, null, null],
    })),
  };
  if (
    value.saveSchemaVersion !== 2 ||
    value.contentVersion !== prototype.version ||
    value.rulesVersion !== "0.5-demo"
  )
    throw new RuleError(
      "INCOMPATIBLE_SAVE",
      "Este guardado necesita una migración antes de continuar.",
    );
  if (parsed.data.itemClassRulesVersion === undefined) {
    for (const item of Object.values(value.items)) {
      const owner = value.players.find((player) => player.id === item.ownerId);
      const variants = owner && prototype.legacyClassItems[owner.classId];
      const replacement =
        variants && Object.hasOwn(variants, item.definitionId)
          ? variants[item.definitionId]
          : undefined;
      if (!replacement) continue;
      item.definitionId = replacement;
      item.name = prototype.items[replacement].name;
      if (owner?.classId === "mage" && item.slot === "weapon") {
        item.magicDamage = item.physicalDamage ?? item.magicDamage;
        delete item.physicalDamage;
      }
    }
  }
  if (parsed.data.paladinShieldVersion === undefined) {
    for (const item of Object.values(value.items)) {
      if (item.definitionId !== "rusty-sword") continue;
      const owner = value.players.find((player) => player.id === item.ownerId);
      if (owner?.classId !== "paladin") continue;
      item.definitionId = "paladin-shield";
      item.name = prototype.items["paladin-shield"].name;
    }
  }
  if (parsed.data.potionSlotsVersion === undefined) {
    for (const player of value.players) {
      for (let index = 0; index < player.inventory.length; index++) {
        const id = player.inventory[index];
        if (!id || value.items[id]?.slot !== null) continue;
        const potionIndex = player.potions.indexOf(null);
        if (potionIndex < 0)
          throw new RuleError(
            "INCOMPATIBLE_SAVE",
            "El guardado contiene demasiadas pociones.",
          );
        player.potions[potionIndex] = id;
        player.inventory[index] = null;
      }
    }
  } else if (parsed.data.players.some((player) => !player.potions)) {
    throw new RuleError(
      "INCOMPATIBLE_SAVE",
      "Faltan las casillas de pociones del guardado.",
    );
  }
  assertInventory(value, prototype);
  return value;
}
export async function readGame(id: string) {
  const result = await pool.query(
    "SELECT snapshot FROM campaigns WHERE id=$1",
    [id],
  );
  if (!result.rows[0])
    throw new RuleError("NOT_FOUND", "No encontramos esa mesa.");
  return validateSave(result.rows[0].snapshot);
}
export async function writeGame(
  client: PoolClient,
  previous: Game,
  next: Game,
) {
  assertInventory(next, prototype);
  next.events = next.events.slice(-40);
  const result = await client.query(
    "UPDATE campaigns SET snapshot=$1,revision=$2,updated_at=now() WHERE id=$3 AND revision=$4",
    [JSON.stringify(next), next.revision, next.id, previous.revision],
  );
  if (result.rowCount !== 1)
    throw new RuleError(
      "STALE_REVISION",
      "La mesa cambió. Actualizá tu vista.",
    );
  const previousIds = new Set(previous.events.map((e) => e.id));
  for (const event of next.events.filter((e) => !previousIds.has(e.id)))
    await client.query(
      "INSERT INTO campaign_events(event_id,campaign_id,revision,event) VALUES($1,$2,$3,$4)",
      [event.id, next.id, next.revision, JSON.stringify(event)],
    );
}
