import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { transaction } from "./database.js";
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
  });
}
