import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { transaction, validateSave } from "./database.js";
export async function migrate() {
  const root = existsSync("pnpm-workspace.yaml")
    ? process.cwd()
    : resolve(process.cwd(), "../..");
  await transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(7140621)");
    await client.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
    );
    for (const name of (await readdir(resolve(root, "apps/server/migrations")))
      .filter((n) => n.endsWith(".sql"))
      .sort()) {
      if (
        (
          await client.query("SELECT 1 FROM schema_migrations WHERE name=$1", [
            name,
          ])
        ).rowCount
      )
        continue;
      await client.query(
        await readFile(resolve(root, "apps/server/migrations", name), "utf8"),
      );
      await client.query("INSERT INTO schema_migrations(name) VALUES($1)", [
        name,
      ]);
    }
    // Upgrade legacy items and potion storage once, with durable backups.
    const legacy = await client.query(
      "SELECT id,snapshot FROM campaigns WHERE NOT (snapshot ? 'itemClassRulesVersion') OR NOT (snapshot ? 'potionSlotsVersion') OR NOT (snapshot ? 'paladinShieldVersion') FOR UPDATE",
    );
    for (const row of legacy.rows) {
      const upgraded = validateSave(row.snapshot);
      for (const [marker, migration] of [
        ["itemClassRulesVersion", "class-items-v1"],
        ["potionSlotsVersion", "potion-slots-v1"],
        ["paladinShieldVersion", "paladin-shield-v1"],
      ])
        if (!Object.hasOwn(row.snapshot, marker))
          await client.query(
            "INSERT INTO campaign_save_backups(campaign_id,migration,snapshot) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
            [row.id, migration, row.snapshot],
          );
      await client.query("UPDATE campaigns SET snapshot=$1 WHERE id=$2", [
        JSON.stringify(upgraded),
        row.id,
      ]);
    }
  });
}
