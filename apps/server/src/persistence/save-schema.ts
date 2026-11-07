import { z } from "zod";
const integer = z.number().int().nonnegative();
const coordinate = z.number().int();
const point = { x: coordinate, y: coordinate };
const slot = z.enum(["helmet", "chest", "weapon", "boots", "gloves", "pants"]);
const stats = z.object({
  maxHp: integer.positive(),
  accuracy: integer,
  dodge: integer,
  agility: integer,
  defense: integer,
  resistance: integer,
  range: integer,
  damageType: z.enum(["physical", "magic"]),
  damageMultiplier: z.number().positive(),
  physicalDamage: integer.max(10).optional(),
  magicDamage: integer.max(10).optional(),
});
export const saveSchema = z.object({
  mode: z.enum(["LOCAL", "ONLINE"]).default("LOCAL"),
  itemClassRulesVersion: z.literal(1).optional(),
  potionSlotsVersion: z.literal(1).optional(),
  paladinShieldVersion: z.literal(1).optional(),
  id: z.string(),
  code: z.string(),
  revision: integer,
  animationUntil: integer.optional(),
  animationPending: z.boolean().optional(),
  turnRemainingMs: integer.max(20_000).optional(),
  turnDeadlineAt: integer.nullable().optional(),
  pendingAttack: z
    .object({
      actorId: z.string(),
      targetId: z.string(),
      ability: z.enum(["basic", "special", "ultimate"]),
      d20: z.number().int().min(1).max(20),
    })
    .nullable()
    .optional(),
  saveSchemaVersion: z.literal(2),
  rulesVersion: z.literal("0.5-demo"),
  contentVersion: z.string(),
  status: z.enum(["LOBBY", "ACTIVE", "WON", "LOST"]),
  round: integer,
  phase: z.enum(["MOVEMENT", "ACTION"]),
  encounterMode: z.enum(["EXPLORATION", "COMBAT"]).optional(),
  movementMode: z.enum(["EXPLORATION", "COMBAT"]).optional(),
  movementSpent: integer.max(6).optional(),
  activePlayerId: z.string().nullable(),
  movementRoll: z.number().int().min(1).max(6).nullable(),
  movementLeft: integer.max(6),
  actionUsed: z.boolean(),
  players: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        classId: z.enum(["paladin", "warrior", "mage", "archer"]),
        slot: integer.max(3),
        hp: integer,
        resource: integer.max(300),
        stats,
        ...point,
        inventory: z.array(z.string().nullable()).length(4),
        potions: z.array(z.string().nullable()).length(4).optional(),
        equipment: z.object({
          helmet: z.string().nullable(),
          chest: z.string().nullable(),
          weapon: z.string().nullable().default(null),
          boots: z.string().nullable().default(null),
          gloves: z.string().nullable(),
          pants: z.string().nullable(),
        }),
      }),
    )
    .max(4),
  enemies: z.array(
    z.object({
      id: z.string(),
      archetypeId: z.string().optional(),
      name: z.string(),
      hp: integer,
      maxHp: integer.positive(),
      defense: integer,
      resistance: integer,
      accuracy: integer,
      dodge: integer,
      agility: integer,
      range: integer,
      movement: integer,
      ...point,
    }),
  ),
  chests: z.array(
    z.object({
      id: z.string(),
      opened: z.boolean(),
      itemDefinition: z.string(),
      lootId: z.string().optional(),
      ...point,
    }),
  ),
  interactables: z
    .array(
      z.object({
        id: z.string(),
        kind: z.string(),
        name: z.string(),
        itemDefinition: z.string(),
        used: z.boolean(),
        ...point,
      }),
    )
    .default([]),
  zones: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      kind: z.enum(["fountain", "exit"]),
      ...point,
    }),
  ),
  items: z.record(
    z.string(),
    z.object({
      id: z.string(),
      definitionId: z.string(),
      ownerId: z.string(),
      name: z.string(),
      slot: slot.nullable(),
      defense: integer,
      resistance: integer,
      heal: integer,
      restoreResource: integer.max(300),
      physicalDamage: integer.optional(),
      magicDamage: integer.optional(),
    }),
  ),
  map: z.object({
    minX: coordinate,
    minY: coordinate,
    width: integer.positive(),
    height: integer.positive(),
    walls: z.array(z.object(point)),
  }),
  events: z.array(
    z.object({
      id: z.string(),
      kind: z.string(),
      text: z.string(),
      dice: z.array(integer.positive()).optional(),
      actorId: z.string().optional(),
      targetId: z.string().optional(),
      ability: z.enum(["basic", "special", "ultimate"]).optional(),
      amount: integer.optional(),
      source: z.enum(["POTION", "FOUNTAIN"]).optional(),
    }),
  ),
  fountainUsed: z.array(z.string()),
});
