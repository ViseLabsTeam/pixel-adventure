import { z } from "zod";
// Custom application code; 4001 is reserved for Colyseus server shutdown.
export const SESSION_REPLACED = 4401;
export const classSchema = z.enum(["paladin", "warrior", "mage"]);
export const joinSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z2-9]{6}$/),
  name: z.string().trim().min(2).max(20),
  classId: classSchema,
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
    z.object({
      type: z.literal("INTERACT"),
      targetId: z.string().min(1).max(80),
    }),
    z.object({ type: z.literal("EQUIP"), itemId: z.string().min(1).max(100) }),
    z.object({
      type: z.literal("UNEQUIP"),
      slot: z.enum(["helmet", "gloves", "pants", "chest"]),
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
  damageType: "physical" | "magic";
  damageMultiplier?: number;
}
export interface PlayerView {
  resource: number;
  id: string;
  name: string;
  classId: "paladin" | "warrior" | "mage";
  slot: number;
  hp: number;
  stats: Stats;
  x: number;
  y: number;
  inventory: (string | null)[];
  equipment: Record<"helmet" | "gloves" | "pants" | "chest", string | null>;
}
export interface ItemView {
  id: string;
  definitionId: string;
  ownerId: string;
  name: string;
  slot: "helmet" | "gloves" | "pants" | "chest" | null;
  defense: number;
  resistance: number;
  heal: number;
  restoreResource: number;
}
export interface EnemyView {
  id: string;
  name: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
}
export interface GameView {
  animationUntil: number;
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
  players: PlayerView[];
  enemies: EnemyView[];
  items: Record<string, ItemView>;
  chests: { id: string; x: number; y: number; opened: boolean }[];
  zones: {
    id: string;
    name: string;
    x: number;
    y: number;
    kind: "fountain" | "exit";
  }[];
  map: { width: number; height: number; walls: { x: number; y: number }[] };
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
