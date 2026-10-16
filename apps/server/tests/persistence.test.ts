import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgres://umbral:umbral_local@127.0.0.1:5434/umbral_test";
if (!new URL(process.env.DATABASE_URL).pathname.endsWith("_test"))
  throw new Error("Integration tests require a database name ending in _test");
const { pool } = await import("../src/persistence/database");
const { migrate } = await import("../src/persistence/migrate");
const api = await import("../src/application/campaigns");
const campaigns: string[] = [];
beforeAll(migrate);
afterAll(async () => {
  for (const table of [
    "campaign_save_backups",
    "player_claims",
    "command_receipts",
    "campaign_events",
    "sessions",
    "campaign_players",
    "campaigns",
  ])
    await pool.query(
      "DELETE FROM " +
        table +
        " WHERE " +
        (table === "campaigns" ? "id" : "campaign_id") +
        "=ANY($1::uuid[])",
      [campaigns],
    );
  await pool.end();
});
async function setup() {
  const host = await api.createCampaign();
  campaigns.push(host.session.campaignId);
  const one = (
    await api.joinCampaign({
      code: host.session.code,
      name: "Ada",
      classId: "paladin",
    })
  ).session;
  const two = (
    await api.joinCampaign({
      code: host.session.code,
      name: "Bea",
      classId: "mage",
    })
  ).session;
  const online = [one.playerId!, two.playerId!];
  await api.execute(
    host.session.token,
    { commandId: randomUUID(), expectedRevision: 2, action: { type: "START" } },
    online,
  );
  return { host, one, two, online };
}
const command = (revision: number, type: string) => ({
  commandId: randomUUID(),
  expectedRevision: revision,
  action: { type },
});
describe("PostgreSQL real: integridad y recuperación", () => {
  it("recupera una tirada confirmada antes de verificar revisión antigua", async () => {
    const f = await setup(),
      cmd = command(3, "ROLL_MOVEMENT");
    const receipt = await api.execute(f.one.token, cmd, f.online);
    await api.execute(f.one.token, command(4, "END_TURN"), f.online);
    const before = await api.readGame(f.host.session.campaignId);
    expect(await api.execute(f.one.token, cmd, f.online)).toEqual(receipt);
    expect(await api.readGame(f.host.session.campaignId)).toEqual(before);
    expect(
      (
        await pool.query(
          "SELECT count(*) FROM command_receipts WHERE command_id=$1",
          [cmd.commandId],
        )
      ).rows[0].count,
    ).toBe("1");
  });
  it("rechaza reutilizar un ID con otra intención", async () => {
    const f = await setup(),
      cmd = command(3, "ROLL_MOVEMENT");
    await api.execute(f.one.token, cmd, f.online);
    await expect(
      api.execute(
        f.one.token,
        { ...cmd, action: { type: "END_TURN" } },
        f.online,
      ),
    ).rejects.toMatchObject({ code: "COMMAND_REUSED" });
  });
  it("serializa dos operaciones concurrentes con la misma revisión", async () => {
    const f = await setup();
    const results = await Promise.allSettled([
      api.execute(f.one.token, command(3, "ROLL_MOVEMENT"), f.online),
      api.execute(f.one.token, command(3, "END_TURN"), f.online),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    expect((await api.readGame(f.host.session.campaignId)).revision).toBe(4);
  });
  it("rechaza suplantación, pantalla compartida actuando y turno sin conexión", async () => {
    const f = await setup();
    await expect(
      api.execute(f.two.token, command(3, "ROLL_MOVEMENT"), f.online),
    ).rejects.toMatchObject({ code: "NOT_YOUR_TURN" });
    await expect(
      api.execute(f.host.session.token, command(3, "ROLL_MOVEMENT"), f.online),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      api.execute(f.one.token, command(3, "ROLL_MOVEMENT"), []),
    ).rejects.toMatchObject({ code: "PLAYER_OFFLINE" });
    expect((await api.readGame(f.host.session.campaignId)).revision).toBe(3);
  });
  it("recupera la campaña y el personaje sin alterar ítems ni repetir tiradas", async () => {
    const f = await setup();
    await api.execute(f.one.token, command(3, "ROLL_MOVEMENT"), f.online);
    const before = await api.readGame(f.host.session.campaignId);
    const recovered = await api.recoverCampaign(f.host.recoveryCode);
    expect(recovered.session.campaignId).toBe(before.id);
    const claim = await api.reclaimPlayer(
      recovered.session.token,
      f.one.playerId!,
    );
    const control = await api.claimPlayer(claim.claimCode);
    expect(control.session.playerId).toBe(f.one.playerId);
    await expect(api.authenticate(f.one.token)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(api.claimPlayer(claim.claimCode)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(await api.readGame(before.id)).toEqual(before);
  });
  it("mantiene inventario y equipo en una lectura desde PostgreSQL", async () => {
    const f = await setup();
    await api.execute(
      f.one.token,
      {
        commandId: randomUUID(),
        expectedRevision: 3,
        action: { type: "EQUIP", itemId: f.one.playerId + ":travel-pants" },
      },
      f.online,
    );
    const game = await api.readGame(f.host.session.campaignId);
    expect(game.players[0].inventory).toHaveLength(4);
    expect(game.players[0].equipment.pants).toBe(
      f.one.playerId + ":travel-pants",
    );
    expect(game.players[0].inventory.filter(Boolean)).toHaveLength(2);
  });
  it("revierte estado, eventos y recibo si falla el guardado; permite conciliar el mismo comando", async () => {
    const f = await setup(),
      cmd = command(3, "ROLL_MOVEMENT"),
      before = await api.readGame(f.host.session.campaignId);
    await pool.query(
      "CREATE FUNCTION fail_demo_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.id='" +
        before.id +
        "'::uuid THEN RAISE EXCEPTION 'simulated disk failure'; END IF; RETURN NEW; END $$",
    );
    await pool.query(
      "CREATE TRIGGER fail_demo_test BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION fail_demo_test()",
    );
    try {
      await expect(api.execute(f.one.token, cmd, f.online)).rejects.toThrow(
        "simulated disk failure",
      );
      expect(await api.readGame(before.id)).toEqual(before);
      expect(
        (
          await pool.query(
            "SELECT count(*) FROM command_receipts WHERE command_id=$1",
            [cmd.commandId],
          )
        ).rows[0].count,
      ).toBe("0");
    } finally {
      await pool.query("DROP TRIGGER fail_demo_test ON campaigns");
      await pool.query("DROP FUNCTION fail_demo_test()");
    }
    const receipt = await api.execute(f.one.token, cmd, f.online);
    expect(receipt.revision).toBe(4);
    expect(await api.execute(f.one.token, cmd, f.online)).toEqual(receipt);
  });
  it("no expone credenciales o código privado en la proyección pública", async () => {
    const f = await setup(),
      view = api.projectView(
        await api.readGame(f.host.session.campaignId),
        await api.authenticate(f.one.token),
        f.online,
        null,
      );
    const json = JSON.stringify(view);
    for (const secret of [
      f.host.recoveryCode,
      f.host.session.token,
      f.one.token,
    ])
      expect(json).not.toContain(secret);
  });
});

it("reintento de especial no vuelve a consumir recurso", async () => {
  const f = await setup();
  const g = await api.readGame(f.host.session.campaignId);
  g.players[0].x = 3;
  g.players[0].y = 6;
  await pool.query("UPDATE campaigns SET snapshot=$1 WHERE id=$2", [
    JSON.stringify(g),
    g.id,
  ]);
  const cmd = {
    commandId: randomUUID(),
    expectedRevision: g.revision,
    action: { type: "ATTACK", targetId: "sentinel", ability: "special" },
  };
  const receipt = await api.execute(f.one.token, cmd, f.online);
  const after = await api.readGame(g.id);
  expect(after.players[0].resource).toBe(0);
  expect(await api.execute(f.one.token, cmd, f.online)).toEqual(receipt);
  expect(await api.readGame(g.id)).toEqual(after);
});
it("migra guardado anterior conservando identidad, turno y respaldo", async () => {
  const f = await setup();
  const g = await api.readGame(f.host.session.campaignId);
  const old = JSON.parse(JSON.stringify(g));
  old.saveSchemaVersion = 1;
  old.rulesVersion = "0.4-demo";
  old.contentVersion = "prototype-content-0.1.0";
  for (const p of old.players) {
    delete p.resource;
    delete p.stats.damageMultiplier;
  }
  for (const item of Object.values(old.items) as Record<string, unknown>[])
    delete item.restoreResource;
  await pool.query("UPDATE campaigns SET snapshot=$1 WHERE id=$2", [
    JSON.stringify(old),
    g.id,
  ]);
  const { readFile } = await import("node:fs/promises");
  const sql = await readFile(
    "apps/server/migrations/0003-class-resources.sql",
    "utf8",
  );
  await pool.query(sql);
  const next = await api.readGame(g.id);
  expect(next.revision).toBe(g.revision);
  expect(next.activePlayerId).toBe(g.activePlayerId);
  expect(next.players[0].inventory).toEqual(g.players[0].inventory);
  expect(next.players[0].resource).toBe(100);
  expect(
    (
      await pool.query(
        "SELECT snapshot FROM campaign_save_backups WHERE campaign_id=$1",
        [g.id],
      )
    ).rows[0].snapshot,
  ).toEqual(old);
  await pool.query(sql);
  expect(await api.readGame(g.id)).toEqual(next);
});
