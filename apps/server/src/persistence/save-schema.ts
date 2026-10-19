import { z } from "zod";
const integer = z.number().int().nonnegative();
const coordinate = z.number().int();
const point = { x: coordinate, y: coordinate };
const slot = z.enum(["helmet", "gloves", "pants", "chest"]);
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
});
export const saveSchema = z.object({
  id: z.string(),
  code: z.string(),
  revision: integer,
  animationUntil: integer.optional(),
  animationPending: z.boolean().optional(),
  saveSchemaVersion: z.literal(2),
  rulesVersion: z.literal("0.5-demo"),
  contentVersion: z.string(),
  status: z.enum(["LOBBY", "ACTIVE", "WON", "LOST"]),
  round: integer,
  phase: z.enum(["MOVEMENT", "ACTION"]),
  activePlayerId: z.string().nullable(),
  movementRoll: z.number().int().min(1).max(6).nullable(),
  movementLeft: integer.max(4),
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
        equipment: z.object({
          helmet: z.string().nullable(),
          gloves: z.string().nullable(),
          pants: z.string().nullable(),
          chest: z.string().nullable(),
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
    }),
  ),
  fountainUsed: z.array(z.string()),
});
