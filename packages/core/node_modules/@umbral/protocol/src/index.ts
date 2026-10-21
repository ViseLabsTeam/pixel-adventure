import { z } from "zod";
// Custom application code; 4001 is reserved for Colyseus server shutdown.
export const SESSION_REPLACED = 4401;
export const classSchema = z.enum(["paladin", "warrior", "mage", "archer"]);
export const reservationTokenSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const availabilitySchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z2-9]{6}$/),
  reservationToken: reservationTokenSchema.optional(),
});
export const reserveClassSchema = availabilitySchema.extend({
  classId: classSchema,
  reservationToken: reservationTokenSchema,
});
export interface ClassAvailability {
  status: "LOBBY" | "ACTIVE" | "WON" | "LOST";
  occupied: Array<z.infer<typeof classSchema>>;
  reserved: Array<z.infer<typeof classSchema>>;
}
export const joinSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z2-9]{6}$/),
  name: z.string().trim().min(2).max(20),
  classId: classSchema,
  reservationToken: reservationTokenSchema.optional(),
});
export const commandSchema = z.object({
  commandId: z.uuid(),
  expectedRevision: z.number().int().nonnegative(),
  action: z.discriminatedUnion("type", [
    z.object({ type: z.literal("START") }),
    z.object({ type: z.literal("ROLL_MOVEMENT") }),
    z.object({
      type: z.literal("MOVE_STEP"),
      direction: z.enum(["UP", "DOWN", "LEFT", "RIGHT"]),
    }),
    z.object({ type: z.literal("FINISH_MOVEMENT") }),
    z.object({ type: z.literal("END_TURN") }),
    z.object({
      type: z.literal("ATTACK"),
      ability: z.enum(["basic", "special", "ultimate"]).optional(),
      targetId: z.string().min(1).max(80),
    }),
    z.object({ type: z.literal("ROLL_ATTACK_D6") }),
    z.object({
      type: z.literal("INTERACT"),
      targetId: z.string().min(1).max(80),
    }),
    z.object({ type: z.literal("EQUIP"), itemId: z.string().min(1).max(100) }),
    z.object({
      type: z.literal("DISCARD_ITEM"),
      itemId: z.string().min(1).max(100),
    }),
    z.object({
      type: z.literal("UNEQUIP"),
      slot: z.enum(["helmet", "chest", "weapon", "boots", "gloves", "pants"]),
    }),
    z.object({
      type: z.literal("USE_ITEM"),
      itemId: z.string().min(1).max(100),
    }),
  ]),
});
export type Command = z.infer<typeof commandSchema>;
export type Role = "COORDINATOR" | "DISPLAY" | "PLAYER";
export interface Session {
  campaignId: string;
  token: string;
  role: Role;
  playerId: string | null;
  code: string;
}
export interface Stats {
  maxHp: number;
  accuracy: number;
  dodge: number;
  agility: number;
  defense: number;
  resistance: number;
  range: number;
  physicalDamage?: number;
  magicDamage?: number;
  damageType: "physical" | "magic";
  damageMultiplier?: number;
}
export interface PlayerView {
  resource: number;
  id: string;
  name: string;
  classId: z.infer<typeof classSchema>;
  slot: number;
  hp: number;
  stats: Stats;
  x: number;
  y: number;
  inventory: (string | null)[];
  potions: (string | null)[];
  equipment: Record<
    "helmet" | "chest" | "weapon" | "boots" | "gloves" | "pants",
    string | null
  >;
}
export interface ItemView {
  allowedClasses: z.infer<typeof classSchema>[];
  id: string;
  definitionId: string;
  ownerId: string;
  name: string;
  slot: "helmet" | "chest" | "weapon" | "boots" | "gloves" | "pants" | null;
  defense: number;
  resistance: number;
  heal: number;
  restoreResource: number;
  physicalDamage?: number;
  magicDamage?: number;
}
export interface EnemyView {
  id: string;
  archetypeId: string;
  name: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
}
export interface GameView {
  animationUntil: number;
  animationPending: boolean;
  serverNow: number;
  id: string;
  code: string;
  revision: number;
  status: "LOBBY" | "ACTIVE" | "WON" | "LOST";
  round: number;
  phase: "MOVEMENT" | "ACTION";
  activePlayerId: string | null;
  movementRoll: number | null;
  movementLeft: number;
  actionUsed: boolean;
  pendingAttack?: {
    actorId: string;
    targetId: string;
    ability: "basic" | "special" | "ultimate";
    d20: number;
  } | null;
  players: PlayerView[];
  enemies: EnemyView[];
  items: Record<string, ItemView>;
  chests: { id: string; x: number; y: number; opened: boolean }[];
  interactables: {
    id: string;
    kind: string;
    name: string;
    x: number;
    y: number;
    used: boolean;
  }[];
  zones: {
    id: string;
    name: string;
    x: number;
    y: number;
    kind: "fountain" | "exit";
  }[];
  map: {
    minX: number;
    minY: number;
    width: number;
    height: number;
    walls: { x: number; y: number }[];
  };
  events: {
    id: string;
    text: string;
    kind: string;
    dice?: number[];
    actorId?: string;
    targetId?: string;
    ability?: "basic" | "special" | "ultimate";
    amount?: number;
  }[];
  onlinePlayerIds: string[];
  paused: boolean;
  targets: Record<string, { chance: number; valid: boolean }>;
  selectedTarget: string | null;
  storageError: boolean;
}
export interface Receipt {
  commandId: string;
  revision: number;
  events: GameView["events"];
}

const nonnegative = z.number().int().nonnegative();
const pointSchema = z.object({ x: z.number().int(), y: z.number().int() });
const equipmentSlotSchema = z.enum([
  "helmet",
  "chest",
  "weapon",
  "boots",
  "gloves",
  "pants",
]);
const gameStatusSchema = z.enum(["LOBBY", "ACTIVE", "WON", "LOST"]);
const eventSchema = z.object({
  id: z.string(),
  text: z.string(),
  kind: z.string(),
  dice: z.array(z.number().int().positive()).optional(),
  actorId: z.string().optional(),
  targetId: z.string().optional(),
  ability: z.enum(["basic", "special", "ultimate"]).optional(),
  amount: z.number().optional(),
});

export const sessionSchema: z.ZodType<Session> = z.object({
  campaignId: z.uuid(),
  token: z.string().min(1),
  role: z.enum(["COORDINATOR", "DISPLAY", "PLAYER"]),
  playerId: z.uuid().nullable(),
  code: z.string().regex(/^[A-Z2-9]{6}$/),
});

export const classAvailabilitySchema: z.ZodType<ClassAvailability> = z.object({
  status: gameStatusSchema,
  occupied: z.array(classSchema),
  reserved: z.array(classSchema),
});

export const gameViewSchema: z.ZodType<GameView> = z.object({
  animationUntil: nonnegative,
  animationPending: z.boolean(),
  serverNow: nonnegative,
  id: z.uuid(),
  code: z.string(),
  revision: nonnegative,
  status: gameStatusSchema,
  round: nonnegative,
  phase: z.enum(["MOVEMENT", "ACTION"]),
  activePlayerId: z.uuid().nullable(),
  movementRoll: z.number().int().min(1).max(6).nullable(),
  movementLeft: nonnegative,
  actionUsed: z.boolean(),
  pendingAttack: z
    .object({
      actorId: z.string(),
      targetId: z.string(),
      ability: z.enum(["basic", "special", "ultimate"]),
      d20: z.number().int().min(1).max(20),
    })
    .nullable()
    .optional(),
  players: z.array(
    pointSchema.extend({
      resource: nonnegative,
      id: z.uuid(),
      name: z.string(),
      classId: classSchema,
      slot: nonnegative,
      hp: nonnegative,
      stats: z.object({
        maxHp: z.number().positive(),
        accuracy: z.number(),
        dodge: z.number(),
        agility: z.number(),
        defense: z.number(),
        resistance: z.number(),
        range: nonnegative,
        damageType: z.enum(["physical", "magic"]),
        damageMultiplier: z.number().optional(),
        physicalDamage: nonnegative.optional(),
        magicDamage: nonnegative.optional(),
      }),
      inventory: z.array(z.string().nullable()),
      potions: z.array(z.string().nullable()).length(4),
      equipment: z.object({
        helmet: z.string().nullable(),
        chest: z.string().nullable(),
        weapon: z.string().nullable(),
        boots: z.string().nullable(),
        gloves: z.string().nullable(),
        pants: z.string().nullable(),
      }),
    }),
  ),
  enemies: z.array(
    pointSchema.extend({
      id: z.string(),
      archetypeId: z.string(),
      name: z.string(),
      hp: nonnegative,
      maxHp: z.number().positive(),
    }),
  ),
  items: z.record(
    z.string(),
    z.object({
      id: z.string(),
      definitionId: z.string(),
      ownerId: z.string(),
      name: z.string(),
      slot: equipmentSlotSchema.nullable(),
      defense: z.number(),
      resistance: z.number(),
      heal: nonnegative,
      restoreResource: nonnegative,
      physicalDamage: nonnegative.optional(),
      magicDamage: nonnegative.optional(),
      allowedClasses: z.array(classSchema).min(1),
    }),
  ),
  chests: z.array(pointSchema.extend({ id: z.string(), opened: z.boolean() })),
  interactables: z.array(
    pointSchema.extend({
      id: z.string(),
      kind: z.string(),
      name: z.string(),
      used: z.boolean(),
    }),
  ),
  zones: z.array(
    pointSchema.extend({
      id: z.string(),
      name: z.string(),
      kind: z.enum(["fountain", "exit"]),
    }),
  ),
  map: z.object({
    minX: z.number().int(),
    minY: z.number().int(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    walls: z.array(pointSchema),
  }),
  events: z.array(eventSchema),
  onlinePlayerIds: z.array(z.uuid()),
  paused: z.boolean(),
  targets: z.record(
    z.string(),
    z.object({ chance: z.number(), valid: z.boolean() }),
  ),
  selectedTarget: z.string().nullable(),
  storageError: z.boolean(),
});

export const receiptSchema: z.ZodType<Receipt> = z.object({
  commandId: z.uuid(),
  revision: nonnegative,
  events: z.array(eventSchema),
});

export const failureSchema = z.object({
  code: z.string(),
  message: z.string(),
});

export const storageErrorSchema = z.object({ message: z.string() });

export const apiResponseSchemas = {
  campaigns: z.object({ session: sessionSchema, recoveryCode: z.string() }),
  join: z.object({ session: sessionSchema }),
  recover: z.object({ session: sessionSchema }),
  claim: z.object({ session: sessionSchema }),
  reclaim: z.object({ claimCode: z.string().regex(/^[A-F0-9]{16}$/) }),
  connect: z.object({ roomId: z.string().min(1), code: z.string() }),
  "class-availability": classAvailabilitySchema,
  "reserve-class": z.object({ reserved: classSchema }),
  "release-class": z.object({ released: z.boolean() }),
} as const;

export type ApiPath = keyof typeof apiResponseSchemas;
export type ApiResponse<Path extends ApiPath> = z.output<
  (typeof apiResponseSchemas)[Path]
>;
