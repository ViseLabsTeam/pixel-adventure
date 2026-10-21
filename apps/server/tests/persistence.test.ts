import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";
import { randomUUID } from "node:crypto";
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgres://umbral:umbral_local@127.0.0.1:5434/umbral_test";
if (!new URL(process.env.DATABASE_URL).pathname.endsWith("_test"))
  throw new Error("Integration tests require a database name ending in _test");
const { pool, validateSave } = await import("../src/persistence/database");
const { migrate } = await import("../src/persistence/migrate");
const api = await import("../src/application/campaigns");
const campaigns: string[] = [];
it("guarda el descarte y recupera su recibo sin ejecutarlo dos veces", async () => {
  const f = await setup();
  const game = await api.readGame(f.host.session.campaignId);
  const itemId = game.players[0].inventory[1]!;
  const request = {
    commandId: randomUUID(),
    expectedRevision: game.revision,
    action: { type: "DISCARD_ITEM", itemId },
  };
  const receipt = await api.execute(f.one.token, request, f.online);
  const after = await api.readGame(game.id);
  expect(after.items[itemId]).toBeUndefined();
  expect(after.players[0].inventory[1]).toBeNull();
  expect(after.actionUsed).toBe(true);
  expect(
    after.events.filter((e) => e.kind === "DISCARD" && e.targetId === itemId),
  ).toHaveLength(1);
  expect(await api.execute(f.one.token, request, f.online)).toEqual(receipt);
  expect(await api.readGame(game.id)).toEqual(after);
}, 15_000);
it("revierte un descarte si falla el guardado y permite reintentar el mismo comando", async () => {
  const f = await setup();
  const game = await api.readGame(f.host.session.campaignId);
  const itemId = game.players[0].inventory[0]!;
  const request = {
    commandId: randomUUID(),
    expectedRevision: game.revision,
    action: { type: "DISCARD_ITEM", itemId },
  };
  await pool.query(
    `CREATE FUNCTION fail_discard_save() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF OLD.id = '${game.id}'::uuid THEN RAISE EXCEPTION 'discard_save_failure'; END IF; RETURN NEW; END $$`,
  );
  await pool.query(
    "CREATE TRIGGER fail_discard_save BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION fail_discard_save()",
  );
  try {
    await expect(api.execute(f.one.token, request, f.online)).rejects.toThrow(
      "discard_save_failure",
    );
    expect(await api.readGame(game.id)).toEqual(game);
    expect(
      (
        await pool.query(
          "SELECT 1 FROM command_receipts WHERE campaign_id=$1 AND command_id=$2",
          [game.id, request.commandId],
        )
      ).rowCount,
    ).toBe(0);
  } finally {
    await pool.query("DROP TRIGGER IF EXISTS fail_discard_save ON campaigns");
    await pool.query("DROP FUNCTION IF EXISTS fail_discard_save()");
  }
  const receipt = await api.execute(f.one.token, request, f.online);
  expect((await api.readGame(game.id)).items[itemId]).toBeUndefined();
  expect(await api.execute(f.one.token, request, f.online)).toEqual(receipt);
});
it("persiste el intercambio de cascos en su espacio original con bolsa llena", async () => {
  const f = await setup();
  const game = await api.readGame(f.host.session.campaignId);
  const { prototype } = await import("@umbral/content/prototype");
  const player = game.players[0];
  delete game.items[player.inventory[2]!];
  for (const id of ["helmet-old", "helmet-new"])
    game.items[id] = {
      ...prototype.items["iron-helmet"],
      id,
      definitionId: "iron-helmet",
      ownerId: player.id,
    };
  player.inventory[2] = "helmet-new";
  player.equipment.helmet = "helmet-old";
  await pool.query("UPDATE campaigns SET snapshot=$1 WHERE id=$2", [
    JSON.stringify(game),
    game.id,
  ]);
  const request = {
    commandId: randomUUID(),
    expectedRevision: game.revision,
    action: { type: "EQUIP", itemId: "helmet-new" },
  };
  const receipt = await api.execute(f.one.token, request, f.online);
  const after = await api.readGame(game.id);
  expect(after.players[0].inventory).toEqual([
    player.inventory[0],
    player.inventory[1],
    "helmet-old",
    player.inventory[3],
  ]);
  expect(after.players[0].equipment.helmet).toBe("helmet-new");
  expect(after.items["helmet-old"].ownerId).toBe(player.id);
  expect(await api.execute(f.one.token, request, f.online)).toEqual(receipt);
  expect(await api.readGame(game.id)).toEqual(after);
});
it("rechaza desequipar con bolsa llena sin gastar la acción y confirma al liberar espacio", async () => {
  const f = await setup();
  const game = await api.readGame(f.host.session.campaignId);
  const { prototype } = await import("@umbral/content/prototype");
  const player = game.players[0];
  game.items.helmet = {
    ...prototype.items["iron-helmet"],
    id: "helmet",
    definitionId: "iron-helmet",
    ownerId: player.id,
  };
  player.equipment.helmet = "helmet";
  game.items.filler = { ...game.items[player.inventory[0]!], id: "filler" };
  player.inventory[3] = "filler";
  await pool.query("UPDATE campaigns SET snapshot=$1 WHERE id=$2", [
    JSON.stringify(game),
    game.id,
  ]);
  const before = await api.readGame(game.id);
  const request = {
    commandId: randomUUID(),
    expectedRevision: game.revision,
    action: { type: "UNEQUIP", slot: "helmet" },
  };
  await expect(
    api.execute(f.one.token, request, f.online),
  ).rejects.toMatchObject({ code: "INVENTORY_FULL" });
  expect(await api.readGame(game.id)).toEqual(before);
  expect(
    (
      await pool.query(
        "SELECT 1 FROM command_receipts WHERE campaign_id=$1 AND command_id=$2",
        [game.id, request.commandId],
      )
    ).rowCount,
  ).toBe(0);
  delete game.items[player.inventory[1]!];
  player.inventory[1] = null;
  await pool.query("UPDATE campaigns SET snapshot=$1 WHERE id=$2", [
    JSON.stringify(game),
    game.id,
  ]);
  await api.execute(f.one.token, request, f.online);
  const after = await api.readGame(game.id);
  expect(after.players[0].equipment.helmet).toBeNull();
  expect(after.players[0].inventory[1]).toBe("helmet");
  expect(after.actionUsed).toBe(true);
});
it("rechaza botín de otra clase sin guardarlo ni confirmar un recibo", async () => {
  const fixture = await setup();
  const game = await api.readGame(fixture.host.session.campaignId);
  const player = game.players[0];
  delete game.items[player.inventory[0]!];
  player.inventory[0] = null;
  const { prototype } = await import("@umbral/content/prototype");
  game.chests = [
    {
      id: "class-chest",
      x: player.x,
      y: player.y,
      opened: true,
      itemDefinition: "mage-staff",
      lootId: "class-loot",
    },
  ];
  game.items["class-loot"] = {
    ...prototype.items["mage-staff"],
    id: "class-loot",
    definitionId: "mage-staff",
    ownerId: "",
  };
  await pool.query("UPDATE campaigns SET snapshot=$1 WHERE id=$2", [
    JSON.stringify(game),
    game.id,
  ]);
  const before = await api.readGame(game.id);
  const request = {
    commandId: randomUUID(),
    expectedRevision: game.revision,
    action: { type: "INTERACT", targetId: "class-chest" },
  };
  await expect(
    api.execute(fixture.one.token, request, fixture.online),
  ).rejects.toMatchObject({ code: "ITEM_WRONG_CLASS" });
  expect(await api.readGame(game.id)).toEqual(before);
  expect(
    (
      await pool.query(
        "SELECT 1 FROM command_receipts WHERE campaign_id=$1 AND command_id=$2",
        [game.id, request.commandId],
      )
    ).rowCount,
  ).toBe(0);
});
it("migra equipo genérico a su clase con respaldo y conserva IDs y revisión", async () => {
  const fixture = await setup();
  const game = await api.readGame(fixture.host.session.campaignId);
  const old = JSON.parse(JSON.stringify(game));
  const receiptsBefore = (
    await pool.query(
      "SELECT command_id,result FROM command_receipts WHERE campaign_id=$1 ORDER BY command_id",
      [game.id],
    )
  ).rows;
  delete old.itemClassRulesVersion;
  const mage = old.players.find(
    (p: { classId: string }) => p.classId === "mage",
  );
  const id = mage.inventory.find(
    (itemId: string | null) => itemId && old.items[itemId].slot === "weapon",
  );
  old.items[id].definitionId = "rusty-sword";
  old.items[id].name = "Espada gastada";
  old.items[id].physicalDamage = 2;
  delete old.items[id].magicDamage;
  await pool.query("UPDATE campaigns SET snapshot=$1 WHERE id=$2", [
    JSON.stringify(old),
    game.id,
  ]);
  await migrate();
  const upgraded = await api.readGame(game.id);
  expect(upgraded.items[id]).toMatchObject({
    id,
    definitionId: "mage-staff",
    ownerId: mage.id,
    name: "Bastón de mago",
    magicDamage: 2,
  });
  expect(upgraded.items[id].physicalDamage).toBeUndefined();
  expect(upgraded.players[1].inventory).toEqual(mage.inventory);
  expect(upgraded.revision).toBe(game.revision);
  expect(upgraded.itemClassRulesVersion).toBe(1);
  expect(
    (
      await pool.query(
        "SELECT command_id,result FROM command_receipts WHERE campaign_id=$1 ORDER BY command_id",
        [game.id],
      )
    ).rows,
  ).toEqual(receiptsBefore);
  expect(
    (
      await pool.query(
        "SELECT snapshot FROM campaign_save_backups WHERE campaign_id=$1 AND migration='class-items-v1'",
        [game.id],
      )
    ).rows[0].snapshot,
  ).toEqual(old);
  await migrate();
  expect(await api.readGame(game.id)).toEqual(upgraded);
  expect(
    (
      await pool.query(
        "SELECT 1 FROM campaign_save_backups WHERE campaign_id=$1 AND migration='class-items-v1'",
        [game.id],
      )
    ).rowCount,
  ).toBe(1);
});
it("migra pociones de partidas anteriores sin duplicar objetos ni recibos", async () => {
  const fixture = await setup();
  const game = await api.readGame(fixture.host.session.campaignId);
  const old = JSON.parse(JSON.stringify(game));
  delete old.potionSlotsVersion;
  for (const player of old.players) {
    player.inventory[3] = player.potions[0];
    delete player.potions;
  }
  const receipts = (
    await pool.query(
      "SELECT command_id,result FROM command_receipts WHERE campaign_id=$1 ORDER BY command_id",
      [game.id],
    )
  ).rows;
  await pool.query("UPDATE campaigns SET snapshot=$1 WHERE id=$2", [
    JSON.stringify(old),
    game.id,
  ]);
  await migrate();
  const upgraded = await api.readGame(game.id);
  expect(upgraded.revision).toBe(game.revision);
  expect(upgraded.potionSlotsVersion).toBe(1);
  for (const [index, player] of upgraded.players.entries()) {
    expect(player.inventory[3]).toBeNull();
    expect(player.potions[0]).toBe(game.players[index].potions[0]);
    expect(upgraded.items[player.potions[0]!].ownerId).toBe(player.id);
  }
  expect(
    (
      await pool.query(
        "SELECT command_id,result FROM command_receipts WHERE campaign_id=$1 ORDER BY command_id",
        [game.id],
      )
    ).rows,
  ).toEqual(receipts);
  expect(
    (
      await pool.query(
        "SELECT snapshot FROM campaign_save_backups WHERE campaign_id=$1 AND migration='potion-slots-v1'",
        [game.id],
      )
    ).rows[0].snapshot,
  ).toEqual(old);
  await migrate();
  expect(await api.readGame(game.id)).toEqual(upgraded);
});
it("convierte la espada anterior del paladín en escudo sin cambiar su ID", async () => {
  const fixture = await setup();
  const game = await api.readGame(fixture.host.session.campaignId);
  const old = JSON.parse(JSON.stringify(game));
  const player = old.players[0];
  const id = player.inventory.find(
    (itemId: string | null) =>
      itemId && old.items[itemId].definitionId === "paladin-shield",
  );
  old.items[id].definitionId = "rusty-sword";
  old.items[id].name = "Espada gastada";
  delete old.paladinShieldVersion;
  const receipts = (
    await pool.query(
      "SELECT command_id,result FROM command_receipts WHERE campaign_id=$1 ORDER BY command_id",
      [game.id],
    )
  ).rows;
  await pool.query("UPDATE campaigns SET snapshot=$1 WHERE id=$2", [
    JSON.stringify(old),
    game.id,
  ]);
  await migrate();
  const upgraded = await api.readGame(game.id);
  expect(upgraded.items[id]).toMatchObject({
    id,
    ownerId: player.id,
    definitionId: "paladin-shield",
    name: "Escudo de paladín",
  });
  expect(upgraded.players[0].inventory).toEqual(player.inventory);
  expect(upgraded.revision).toBe(game.revision);
  expect(
    (
      await pool.query(
        "SELECT command_id,result FROM command_receipts WHERE campaign_id=$1 ORDER BY command_id",
        [game.id],
      )
    ).rows,
  ).toEqual(receipts);
  expect(
    (
      await pool.query(
        "SELECT snapshot FROM campaign_save_backups WHERE campaign_id=$1 AND migration='paladin-shield-v1'",
        [game.id],
      )
    ).rows[0].snapshot,
  ).toEqual(old);
  await migrate();
  expect(await api.readGame(game.id)).toEqual(upgraded);
});
it("revierte la migración de pociones y su respaldo si falla el guardado", async () => {
  const fixture = await setup();
  const game = await api.readGame(fixture.host.session.campaignId);
  const old = JSON.parse(JSON.stringify(game));
  delete old.potionSlotsVersion;
  for (const player of old.players) {
    player.inventory[3] = player.potions[0];
    delete player.potions;
  }
  await pool.query("UPDATE campaigns SET snapshot=$1 WHERE id=$2", [
    JSON.stringify(old),
    game.id,
  ]);
  await pool.query(
    `CREATE FUNCTION fail_potion_upgrade() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF OLD.id = '${game.id}'::uuid THEN RAISE EXCEPTION 'potion_upgrade_test_failure'; END IF; RETURN NEW; END $$`,
  );
  await pool.query(
    "CREATE TRIGGER fail_potion_upgrade BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION fail_potion_upgrade()",
  );
  try {
    await expect(migrate()).rejects.toThrow("potion_upgrade_test_failure");
    expect(
      (
        await pool.query("SELECT snapshot FROM campaigns WHERE id=$1", [
          game.id,
        ])
      ).rows[0].snapshot,
    ).toEqual(old);
    expect(
      (
        await pool.query(
          "SELECT 1 FROM campaign_save_backups WHERE campaign_id=$1 AND migration='potion-slots-v1'",
          [game.id],
        )
      ).rowCount,
    ).toBe(0);
  } finally {
    await pool.query("DROP TRIGGER IF EXISTS fail_potion_upgrade ON campaigns");
    await pool.query("DROP FUNCTION IF EXISTS fail_potion_upgrade()");
    await migrate();
  }
});
it("revierte la actualización y su respaldo si falla guardar la migración de objetos", async () => {
  const fixture = await setup();
  const game = await api.readGame(fixture.host.session.campaignId);
  const old = JSON.parse(JSON.stringify(game));
  delete old.itemClassRulesVersion;
  delete old.paladinShieldVersion;
  const paladinWeapon = old.players[0].inventory.find(
    (itemId: string | null) =>
      itemId && old.items[itemId].definitionId === "paladin-shield",
  );
  old.items[paladinWeapon].definitionId = "rusty-sword";
  old.items[paladinWeapon].name = "Espada gastada";
  await pool.query("UPDATE campaigns SET snapshot=$1 WHERE id=$2", [
    JSON.stringify(old),
    game.id,
  ]);
  await pool.query(
    `CREATE FUNCTION fail_class_item_upgrade() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF OLD.id = '${game.id}'::uuid THEN RAISE EXCEPTION 'class_upgrade_test_failure'; END IF; RETURN NEW; END $$`,
  );
  await pool.query(
    "CREATE TRIGGER fail_class_item_upgrade BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION fail_class_item_upgrade()",
  );
  try {
    await expect(migrate()).rejects.toThrow("class_upgrade_test_failure");
    expect(
      (
        await pool.query("SELECT snapshot FROM campaigns WHERE id=$1", [
          game.id,
        ])
      ).rows[0].snapshot,
    ).toEqual(old);
    expect(
      (
        await pool.query(
          "SELECT 1 FROM campaign_save_backups WHERE campaign_id=$1 AND migration='class-items-v1'",
          [game.id],
        )
      ).rowCount,
    ).toBe(0);
    expect(
      (
        await pool.query(
          "SELECT 1 FROM campaign_save_backups WHERE campaign_id=$1 AND migration='paladin-shield-v1'",
          [game.id],
        )
      ).rowCount,
    ).toBe(0);
  } finally {
    await pool.query(
      "DROP TRIGGER IF EXISTS fail_class_item_upgrade ON campaigns",
    );
    await pool.query("DROP FUNCTION IF EXISTS fail_class_item_upgrade()");
    await migrate();
  }
});
it("recupera una campaña anterior sin puntos interactuables", async () => {
  const host = await api.createCampaign();
  campaigns.push(host.session.campaignId);
  const game = await api.readGame(host.session.campaignId);
  const old = JSON.parse(JSON.stringify(game));
  delete old.interactables;
  expect(validateSave(old).interactables).toEqual([]);
});
it("conserva equipo anterior al cargar ranuras nuevas", async () => {
  const fixture = await setup();
  const game = await api.readGame(fixture.host.session.campaignId);
  const old = JSON.parse(JSON.stringify(game));
  delete old.players[0].equipment.weapon;
  delete old.itemClassRulesVersion;
  delete old.players[0].equipment.boots;
  old.items["legacy:gloves"] = {
    id: "legacy:gloves",
    definitionId: "cloth-gloves",
    ownerId: old.players[0].id,
    name: "Guantes del eco",
    slot: "gloves",
    defense: 0,
    resistance: 2,
    heal: 0,
    restoreResource: 0,
  };
  old.players[0].equipment.gloves = "legacy:gloves";
  const loaded = validateSave(old);
  expect(loaded.players[0]?.equipment).toMatchObject({
    weapon: null,
    boots: null,
    gloves: "legacy:gloves",
  });
});
beforeAll(migrate);
afterAll(async () => {
  for (const table of [
    "campaign_save_backups",
    "player_claims",
    "class_reservations",
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
  it("guarda una planta recolectada y recupera el recibo sin duplicar su objeto", async () => {
    const fixture = await setup();
    const game = await api.readGame(fixture.host.session.campaignId);
    game.players[0].x = -7;
    game.players[0].y = -3;
    game.players[0].potions[0] = null;
    delete game.items[`${game.players[0].id}:potion`];
    await pool.query("UPDATE campaigns SET snapshot=$1 WHERE id=$2", [
      JSON.stringify(game),
      game.id,
    ]);
    const request = {
      commandId: randomUUID(),
      expectedRevision: game.revision,
      action: { type: "INTERACT", targetId: "object-1" },
    };
    const receipt = await api.execute(
      fixture.one.token,
      request,
      fixture.online,
    );
    const saved = await api.readGame(game.id);
    expect(saved.interactables[0].used).toBe(true);
    expect(saved.players[0].potions).toContain(`${game.id}:object-1:gather`);
    expect(
      await api.execute(fixture.one.token, request, fixture.online),
    ).toEqual(receipt);
    expect((await api.readGame(game.id)).revision).toBe(saved.revision);
  });
  it("reserva y recupera a la arquera como cuarta clase", async () => {
    const host = await api.createCampaign();
    campaigns.push(host.session.campaignId);
    const code = host.session.code;
    const token = "c".repeat(64);
    await api.reserveClass({
      code,
      classId: "archer",
      reservationToken: token,
    });
    for (const [name, classId] of [
      ["Ada", "paladin"],
      ["Bruno", "warrior"],
      ["Cira", "mage"],
      ["Dara", "archer"],
    ] as const)
      await api.joinCampaign({
        code,
        name,
        classId,
        ...(classId === "archer" ? { reservationToken: token } : {}),
      });
    const saved = await api.readGame(host.session.campaignId);
    expect(saved.players).toHaveLength(4);
    expect(saved.players[3]).toMatchObject({
      classId: "archer",
      slot: 3,
      hp: 34,
      stats: { range: 3 },
    });
    expect(saved.enemies.find((enemy) => enemy.id === "goblin")).toMatchObject({
      archetypeId: "goblin",
    });
    await expect(
      api.joinCampaign({ code, name: "Otra", classId: "archer" }),
    ).rejects.toMatchObject({ code: "CLASS_TAKEN" });
  });
  it("reserva la clase al seleccionarla y rechaza una elección simultánea", async () => {
    const host = await api.createCampaign();
    campaigns.push(host.session.campaignId);
    const code = host.session.code;
    const first = "a".repeat(64),
      second = "b".repeat(64);
    const attempts = await Promise.allSettled([
      api.reserveClass({ code, classId: "paladin", reservationToken: first }),
      api.reserveClass({ code, classId: "paladin", reservationToken: second }),
    ]);
    expect(
      attempts.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      attempts.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
    const winner = attempts[0].status === "fulfilled" ? first : second;
    const loser = winner === first ? second : first;
    expect(
      (await api.classAvailability({ code, reservationToken: loser })).reserved,
    ).toEqual(["paladin"]);
    await expect(
      api.joinCampaign({
        code,
        name: "Bea",
        classId: "paladin",
        reservationToken: loser,
      }),
    ).rejects.toMatchObject({ code: "CLASS_TAKEN" });
    await api.joinCampaign({
      code,
      name: "Ada",
      classId: "paladin",
      reservationToken: winner,
    });
    expect((await api.classAvailability({ code })).occupied).toEqual([
      "paladin",
    ]);
    await expect(
      api.joinCampaign({ code, name: "Cira", classId: "paladin" }),
    ).rejects.toMatchObject({ code: "CLASS_TAKEN" });
    expect((await api.readGame(host.session.campaignId)).players).toHaveLength(
      1,
    );
  });
  it("libera una reserva y deja volver a elegir esa clase", async () => {
    const host = await api.createCampaign();
    campaigns.push(host.session.campaignId);
    const code = host.session.code;
    await api.reserveClass({
      code,
      classId: "mage",
      reservationToken: "a".repeat(64),
    });
    await api.releaseClass({ code, reservationToken: "a".repeat(64) });
    await api.reserveClass({
      code,
      classId: "mage",
      reservationToken: "b".repeat(64),
    });
    expect(
      (await api.classAvailability({ code, reservationToken: "b".repeat(64) }))
        .reserved,
    ).toEqual([]);
  });
  it("vence una selección abandonada y permite tomarla de nuevo", async () => {
    const host = await api.createCampaign();
    campaigns.push(host.session.campaignId);
    const code = host.session.code;
    await api.reserveClass({
      code,
      classId: "warrior",
      reservationToken: "a".repeat(64),
    });
    await pool.query(
      "UPDATE class_reservations SET expires_at=now()-interval '1 second' WHERE campaign_id=$1",
      [host.session.campaignId],
    );
    expect((await api.classAvailability({ code })).reserved).toEqual([]);
    await api.reserveClass({
      code,
      classId: "warrior",
      reservationToken: "b".repeat(64),
    });
    expect((await api.classAvailability({ code })).reserved).toEqual([
      "warrior",
    ]);
  });
  it("recupera una tirada confirmada antes de verificar revisión antigua", async () => {
    const f = await setup(),
      cmd = command(3, "ROLL_MOVEMENT");
    const receipt = await api.execute(f.one.token, cmd, f.online);
    const rolled = await api.readGame(f.host.session.campaignId);
    expect(rolled.animationPending).toBe(true);
    expect(rolled.animationUntil! - Date.now()).toBeGreaterThan(1500);
    await expect(
      api.execute(f.one.token, command(4, "END_TURN"), f.online),
    ).rejects.toMatchObject({ code: "ANIMATION_PLAYING" });
    const clock = vi
      .spyOn(Date, "now")
      .mockReturnValue(rolled.animationUntil! + 1);
    try {
      await api.finishAnimation(f.host.session.token, rolled.revision);
      await api.execute(f.one.token, command(4, "END_TURN"), f.online);
    } finally {
      clock.mockRestore();
    }
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
        action: { type: "EQUIP", itemId: f.one.playerId + ":travel-boots" },
      },
      f.online,
    );
    const game = await api.readGame(f.host.session.campaignId);
    expect(game.players[0].inventory).toHaveLength(4);
    expect(game.players[0].equipment.boots).toBe(
      f.one.playerId + ":travel-boots",
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
  const clock = vi
    .spyOn(Date, "now")
    .mockReturnValue(after.animationUntil! + 1);
  try {
    await api.finishAnimation(f.host.session.token, after.revision);
    const d6 = command(after.revision, "ROLL_ATTACK_D6");
    const damageReceipt = await api.execute(f.one.token, d6, f.online);
    const damaged = await api.readGame(g.id);
    expect(damaged.pendingAttack).toBeNull();
    expect(await api.execute(f.one.token, d6, f.online)).toEqual(damageReceipt);
    expect(await api.readGame(g.id)).toEqual(damaged);
  } finally {
    clock.mockRestore();
  }
});
it("migra guardado anterior conservando identidad, turno y respaldo", async () => {
  const f = await setup();
  const g = await api.readGame(f.host.session.campaignId);
  const old = JSON.parse(JSON.stringify(g));
  old.saveSchemaVersion = 1;
  old.rulesVersion = "0.4-demo";
  old.contentVersion = "prototype-content-0.1.0";
  old.map = { width: 10, height: 10, walls: old.map.walls };
  old.enemies = old.enemies.filter(
    (enemy: { id: string }) => enemy.id !== "goblin",
  );
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
  const mapSql = await readFile(
    "apps/server/migrations/0004-explorable-courtyard.sql",
    "utf8",
  );
  await pool.query(mapSql);
  const next = await api.readGame(g.id);
  expect(next.revision).toBe(g.revision);
  expect(next.activePlayerId).toBe(g.activePlayerId);
  expect(next.players[0].inventory).toEqual(g.players[0].inventory);
  expect(next.players[0].resource).toBe(100);
  expect(next.map).toMatchObject({
    minX: -21,
    minY: -21,
    width: 58,
    height: 70,
  });
  expect(next.enemies.some((enemy) => enemy.id === "goblin")).toBe(true);
  expect(
    (
      await pool.query(
        "SELECT snapshot FROM campaign_save_backups WHERE campaign_id=$1",
        [g.id],
      )
    ).rows[0].snapshot,
  ).toEqual(old);
  await pool.query(sql);
  await pool.query(mapSql);
  expect(await api.readGame(g.id)).toEqual(next);
});

it("recupera posiciones con coordenadas negativas del mapa ampliado", async () => {
  const f = await setup();
  const game = await api.readGame(f.host.session.campaignId);
  game.players[0].x = -1;
  game.players[0].y = 8;
  await pool.query("UPDATE campaigns SET snapshot=$1 WHERE id=$2", [
    JSON.stringify(game),
    game.id,
  ]);
  const recovered = await api.readGame(game.id);
  expect(recovered.players[0]).toMatchObject({ x: -1, y: 8 });
  expect(recovered.revision).toBe(game.revision);
});

it("espera el GIF y la confirmación autorizada de la mesa antes de avanzar", async () => {
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
  expect(after.animationPending).toBe(true);
  expect(after.pendingAttack?.ability).toBe("special");
  expect(after.animationUntil! - Date.now()).toBeGreaterThan(2500);
  const end = command(after.revision, "END_TURN");
  await expect(api.execute(f.one.token, end, f.online)).rejects.toMatchObject({
    code: "ANIMATION_PLAYING",
  });
  expect(await api.execute(f.one.token, cmd, f.online)).toEqual(receipt);
  await expect(
    api.finishAnimation(f.one.token, after.revision),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  await api.finishAnimation(f.host.session.token, after.revision - 1);
  expect((await api.readGame(g.id)).animationPending).toBe(true);
  const clock = vi
    .spyOn(Date, "now")
    .mockReturnValue(after.animationUntil! + 1);
  try {
    await expect(api.execute(f.one.token, end, f.online)).rejects.toMatchObject(
      { code: "ANIMATION_PLAYING" },
    );
    await api.finishAnimation(f.host.session.token, after.revision);
    await api.finishAnimation(f.host.session.token, after.revision);
    const d6 = await api.execute(
      f.one.token,
      command(after.revision, "ROLL_ATTACK_D6"),
      f.online,
    );
    const damage = await api.readGame(g.id);
    expect(damage.pendingAttack).toBeNull();
    expect(damage.events.slice(-2).map((event) => event.kind)).toEqual([
      "ATTACK_D6",
      "ATTACK",
    ]);
    expect(damage.animationPending).toBe(true);
    expect(d6.revision).toBe(damage.revision);
    clock.mockReturnValue(damage.animationUntil! + 1);
    await api.finishAnimation(f.host.session.token, damage.revision);
    await api.execute(
      f.one.token,
      command(damage.revision, "END_TURN"),
      f.online,
    );
    expect((await api.readGame(g.id)).activePlayerId).toBe(f.two.playerId);
  } finally {
    clock.mockRestore();
  }
});
it("una confirmación anticipada no salta el tiempo mínimo del GIF", async () => {
  const f = await setup();
  await api.execute(f.one.token, command(3, "ROLL_MOVEMENT"), f.online);
  const rolled = await api.readGame(f.host.session.campaignId);
  const clock = vi
    .spyOn(Date, "now")
    .mockReturnValue(rolled.animationUntil! + 1);
  try {
    await api.finishAnimation(f.host.session.token, rolled.revision);
    await api.execute(
      f.one.token,
      {
        commandId: randomUUID(),
        expectedRevision: 4,
        action: { type: "MOVE_STEP", direction: "UP" },
      },
      f.online,
    );
  } finally {
    clock.mockRestore();
  }
  const g = await api.readGame(f.host.session.campaignId);
  await api.finishAnimation(f.host.session.token, g.revision);
  await expect(
    api.execute(f.one.token, command(g.revision, "FINISH_MOVEMENT"), f.online),
  ).rejects.toMatchObject({ code: "ANIMATION_PLAYING" });
  expect((await api.readGame(g.id)).phase).toBe("MOVEMENT");
});

it("conserva la espera si falla guardar el fin visual y permite reintentar", async () => {
  const f = await setup();
  await api.execute(f.one.token, command(3, "ROLL_MOVEMENT"), f.online);
  const rolled = await api.readGame(f.host.session.campaignId);
  const cmd = {
    commandId: randomUUID(),
    expectedRevision: 4,
    action: { type: "MOVE_STEP", direction: "UP" },
  };
  const clock = vi
    .spyOn(Date, "now")
    .mockReturnValue(rolled.animationUntil! + 1);
  let receipt: Awaited<ReturnType<typeof api.execute>>;
  try {
    await api.finishAnimation(f.host.session.token, rolled.revision);
    receipt = await api.execute(f.one.token, cmd, f.online);
  } finally {
    clock.mockRestore();
  }
  const g = await api.readGame(f.host.session.campaignId);
  await pool.query(
    "CREATE FUNCTION fail_animation_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.id='" +
      g.id +
      "'::uuid THEN RAISE EXCEPTION 'animation save failure'; END IF; RETURN NEW; END $$",
  );
  await pool.query(
    "CREATE TRIGGER fail_animation_test BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION fail_animation_test()",
  );
  try {
    await expect(
      api.finishAnimation(f.host.session.token, g.revision),
    ).rejects.toThrow("animation save failure");
    expect(await api.readGame(g.id)).toEqual(g);
    expect(await api.execute(f.one.token, cmd, f.online)).toEqual(receipt);
  } finally {
    await pool.query("DROP TRIGGER fail_animation_test ON campaigns");
    await pool.query("DROP FUNCTION fail_animation_test()");
  }
  await api.finishAnimation(f.host.session.token, g.revision);
  const after = await api.readGame(g.id);
  expect(after.animationPending).toBe(false);
  expect(after.revision).toBe(g.revision);
  expect(after.events).toEqual(g.events);
  expect(after.players).toEqual(g.players);
});
