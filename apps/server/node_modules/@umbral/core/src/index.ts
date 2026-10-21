export type ClassId = "paladin" | "warrior" | "mage" | "archer";
export type EquipmentSlot =
  | "helmet"
  | "chest"
  | "weapon"
  | "boots"
  | "gloves"
  | "pants";
export interface Point {
  x: number;
  y: number;
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
export type Ability = "basic" | "special" | "ultimate";
export interface Player extends Point {
  resource: number;
  id: string;
  name: string;
  classId: ClassId;
  slot: number;
  hp: number;
  stats: Stats;
  inventory: (string | null)[];
  potions: (string | null)[];
  equipment: Record<EquipmentSlot, string | null>;
}
export interface Item {
  id: string;
  definitionId: string;
  ownerId: string;
  name: string;
  slot: EquipmentSlot | null;
  defense: number;
  resistance: number;
  heal: number;
  restoreResource: number;
  physicalDamage?: number;
  magicDamage?: number;
}
export interface Enemy extends Point {
  id: string;
  archetypeId?: string;
  name: string;
  hp: number;
  maxHp: number;
  defense: number;
  resistance: number;
  accuracy: number;
  dodge: number;
  agility: number;
  range: number;
  movement: number;
}
export interface Event {
  id: string;
  kind: string;
  text: string;
  dice?: number[];
  actorId?: string;
  targetId?: string;
  ability?: Ability;
  amount?: number;
}
export interface Chest extends Point {
  id: string;
  opened: boolean;
  itemDefinition: string;
  lootId?: string;
}
export interface Zone extends Point {
  id: string;
  name: string;
  kind: "fountain" | "exit";
}
export interface Interactable extends Point {
  id: string;
  kind: string;
  name: string;
  itemDefinition: string;
  used: boolean;
}
export interface Content {
  version: string;
  classes: Record<ClassId, Stats>;
  map: {
    minX: number;
    minY: number;
    width: number;
    height: number;
    terrain: readonly string[];
    walls: Point[];
    spawns: Point[];
  };
  enemies: Enemy[];
  chests: Chest[];
  interactables: Interactable[];
  zones: Zone[];
  items: Record<
    string,
    {
      name: string;
      slot: EquipmentSlot | null;
      defense: number;
      resistance: number;
      heal: number;
      restoreResource: number;
      physicalDamage?: number;
      magicDamage?: number;
      allowedClasses: ClassId[];
    }
  >;
  starterItems: Record<ClassId, string[]>;
  legacyClassItems: Record<ClassId, Record<string, string>>;
  resource: {
    max: number;
    initial: number;
    basicGain: number;
    specialCost: number;
    ultimateCost: number;
    specialMultiplier: number;
    ultimateMultiplier: number;
  };
  policies: {
    distance: "manhattan";
    rounding: "floor";
    minimumDamage: number;
    interactConsumesAction: boolean;
    equipConsumesAction: boolean;
    chestLootAfterClearOnly: boolean;
  };
}
export interface Game {
  itemClassRulesVersion: 1;
  potionSlotsVersion: 1;
  paladinShieldVersion: 1;
  animationUntil?: number;
  animationPending?: boolean;
  pendingAttack?: {
    actorId: string;
    targetId: string;
    ability: Ability;
    d20: number;
  } | null;
  id: string;
  code: string;
  revision: number;
  saveSchemaVersion: number;
  rulesVersion: string;
  contentVersion: string;
  status: "LOBBY" | "ACTIVE" | "WON" | "LOST";
  round: number;
  phase: "MOVEMENT" | "ACTION";
  activePlayerId: string | null;
  movementRoll: number | null;
  movementLeft: number;
  actionUsed: boolean;
  players: Player[];
  enemies: Enemy[];
  chests: Chest[];
  interactables: Interactable[];
  zones: Zone[];
  items: Record<string, Item>;
  map: {
    minX: number;
    minY: number;
    width: number;
    height: number;
    walls: Point[];
  };
  events: Event[];
  fountainUsed: string[];
}
export type Action =
  | { type: "START" | "ROLL_MOVEMENT" | "FINISH_MOVEMENT" | "END_TURN" }
  | { type: "MOVE_STEP"; direction: "UP" | "DOWN" | "LEFT" | "RIGHT" }
  | { type: "ATTACK"; targetId: string; ability?: Ability }
  | { type: "ROLL_ATTACK_D6" }
  | { type: "INTERACT"; targetId: string }
  | { type: "EQUIP" | "USE_ITEM" | "DISCARD_ITEM"; itemId: string }
  | { type: "UNEQUIP"; slot: EquipmentSlot };
export type Dice = (sides: number) => number;
export class RuleError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
function requireRule(
  condition: unknown,
  code: string,
  message: string,
): asserts condition {
  if (!condition) throw new RuleError(code, message);
}
export const distance = (a: Point, b: Point) =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const same = (a: Point, b: Point) => a.x === b.x && a.y === b.y;
export function movementTotal(d6: number) {
  return 2 + Math.floor((d6 - 1) / 2);
}
export function damage(
  base: number,
  bonus: number,
  defense: number,
  stealth = false,
  power = 1,
) {
  return Math.max(
    0,
    Math.floor(
      base * power * (stealth ? 1.5 : 1 + Math.floor((bonus - 1) / 2) * 0.25),
    ) - defense,
  );
}
export function rollDamage(
  dice: Dice,
  defense: number,
  stealth = false,
  power = 1,
) {
  const base = dice(20),
    bonus = stealth ? null : dice(6);
  return {
    amount: damage(base, bonus ?? 1, defense, stealth, power),
    dice: bonus === null ? [base] : [base, bonus],
  };
}
export function effectiveStats(game: Game, player: Player): Stats {
  const stats = { ...player.stats };
  for (const id of Object.values(player.equipment)) {
    if (id) {
      stats.defense += game.items[id].defense;
      stats.resistance += game.items[id].resistance;
      stats.physicalDamage =
        (stats.physicalDamage ?? 0) + (game.items[id].physicalDamage ?? 0);
      stats.magicDamage =
        (stats.magicDamage ?? 0) + (game.items[id].magicDamage ?? 0);
    }
  }
  return stats;
}
export function hitChance(
  attacker: Stats & { hp: number },
  defender: { dodge: number; agility: number },
  range: number,
) {
  const evasion = 0.7 * defender.dodge + 0.3 * defender.agility;
  const wounds = 20 * Math.max(0, 1 - (2 * attacker.hp) / attacker.maxHp);
  return Math.max(
    10,
    Math.min(
      95,
      85 +
        3 * (attacker.accuracy - evasion) -
        wounds -
        (attacker.range > 1 ? 8 * Math.max(0, range - 1) : 0),
    ),
  );
}
export function clearPath(game: Game, a: Point, b: Point) {
  const steps = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) * 4;
  for (let i = 1; i < steps; i++) {
    const p = {
      x: Math.round(a.x + ((b.x - a.x) * i) / steps),
      y: Math.round(a.y + ((b.y - a.y) * i) / steps),
    };
    if (game.map.walls.some((w) => same(w, p))) return false;
  }
  return true;
}
export function attackPreview(game: Game, player: Player, enemy: Enemy) {
  const stats = effectiveStats(game, player);
  return {
    chance: Math.round(
      hitChance({ ...stats, hp: player.hp }, enemy, distance(player, enemy)),
    ),
    valid:
      enemy.hp > 0 &&
      distance(player, enemy) <= stats.range &&
      clearPath(game, player, enemy),
  };
}
export function createGame(id: string, code: string, content: Content): Game {
  return {
    itemClassRulesVersion: 1,
    potionSlotsVersion: 1,
    paladinShieldVersion: 1,
    id,
    code,
    revision: 0,
    saveSchemaVersion: 2,
    rulesVersion: "0.5-demo",
    contentVersion: content.version,
    status: "LOBBY",
    round: 0,
    phase: "MOVEMENT",
    activePlayerId: null,
    movementRoll: null,
    movementLeft: 0,
    actionUsed: false,
    pendingAttack: null,
    players: [],
    enemies: structuredClone(content.enemies),
    chests: structuredClone(content.chests),
    interactables: structuredClone(content.interactables),
    zones: structuredClone(content.zones),
    items: {},
    map: {
      minX: content.map.minX,
      minY: content.map.minY,
      width: content.map.width,
      height: content.map.height,
      walls: structuredClone(content.map.walls),
    },
    events: [],
    fountainUsed: [],
  };
}
function addEvent(
  game: Game,
  kind: string,
  text: string,
  dice?: number[],
  detail?: Pick<Event, "actorId" | "targetId" | "ability" | "amount">,
) {
  game.events.push({
    id: `${game.id}:${game.revision + 1}:${game.events.length}:${kind}`,
    kind,
    text,
    ...(dice ? { dice } : {}),
    ...detail,
  });
}
export function addPlayer(
  input: Game,
  id: string,
  name: string,
  classId: ClassId,
  content: Content,
): Game {
  requireRule(
    input.status === "LOBBY",
    "ALREADY_STARTED",
    "La aventura ya comenzó. Recuperá un personaje existente.",
  );
  requireRule(
    Object.hasOwn(content.classes, classId),
    "INVALID_CLASS",
    "Clase no disponible.",
  );
  requireRule(
    !input.players.some((player) => player.classId === classId),
    "CLASS_TAKEN",
    "Ese personaje ya fue elegido en esta mesa.",
  );
  requireRule(
    input.players.length < Math.min(4, Object.keys(content.classes).length),
    "LOBBY_FULL",
    "La mesa ya tiene todos los personajes disponibles.",
  );
  const game = structuredClone(input),
    slot = game.players.length;
  const player: Player = {
    id,
    name,
    classId,
    slot,
    hp: content.classes[classId].maxHp,
    resource: content.resource.initial,
    stats: { ...content.classes[classId] },
    ...content.map.spawns[slot],
    inventory: [null, null, null, null],
    potions: [null, null, null, null],
    equipment: {
      helmet: null,
      chest: null,
      weapon: null,
      boots: null,
      gloves: null,
      pants: null,
    },
  };
  game.players.push(player);
  for (const definitionId of content.starterItems[classId])
    giveItem(game, player, `${id}:${definitionId}`, definitionId, content);
  addEvent(game, "JOIN", `${name} se sentó a la mesa.`);
  game.revision++;
  assertInventory(game, content);
  return game;
}
export function canOwnItem(
  content: Content,
  definitionId: string,
  classId: ClassId,
) {
  return (
    Object.hasOwn(content.items, definitionId) &&
    content.items[definitionId].allowedClasses.includes(classId)
  );
}
function requireItemClass(
  content: Content,
  definitionId: string,
  classId: ClassId,
) {
  requireRule(
    canOwnItem(content, definitionId, classId),
    "ITEM_WRONG_CLASS",
    "Ese objeto no pertenece a tu clase.",
  );
}
function giveItem(
  game: Game,
  player: Player,
  id: string,
  definitionId: string,
  content: Content,
) {
  requireItemClass(content, definitionId, player.classId);
  const slots = itemSlots(player, content.items[definitionId].slot);
  const index = freeItemSlot(slots);
  game.items[id] = {
    id,
    definitionId,
    ownerId: player.id,
    ...itemProperties(content, definitionId),
  };
  slots[index] = id;
}
function itemSlots(player: Player, slot: EquipmentSlot | null) {
  return slot === null ? player.potions : player.inventory;
}
function freeItemSlot(slots: (string | null)[]) {
  const index = slots.indexOf(null);
  requireRule(
    index >= 0,
    "INVENTORY_FULL",
    "No hay espacio en las casillas correspondientes.",
  );
  return index;
}
function itemProperties(content: Content, definitionId: string) {
  requireRule(
    Object.hasOwn(content.items, definitionId),
    "UNKNOWN_ITEM",
    "El objeto no está disponible.",
  );
  const { allowedClasses, ...properties } = content.items[definitionId];
  return properties;
}
function passable(game: Game, content: Content, p: Point, exceptId: string) {
  return (
    p.x >= game.map.minX &&
    p.y >= game.map.minY &&
    p.x < game.map.minX + game.map.width &&
    p.y < game.map.minY + game.map.height &&
    content.map.terrain[p.y - game.map.minY]?.[p.x - game.map.minX] === "1" &&
    !game.map.walls.some((w) => same(w, p)) &&
    !game.players.some((a) => a.id !== exceptId && a.hp > 0 && same(a, p)) &&
    !game.enemies.some((a) => a.id !== exceptId && a.hp > 0 && same(a, p)) &&
    !game.chests.some((c) => same(c, p))
  );
}
function consumeAction(game: Game) {
  requireRule(
    !game.actionUsed,
    "ACTION_USED",
    "Ya usaste la acción de este turno.",
  );
  game.phase = "ACTION";
  game.movementLeft = 0;
  game.actionUsed = true;
}
function safeLoot(game: Game, content: Content) {
  if (game.enemies.some((e) => e.hp > 0)) return;
  for (const chest of game.chests) {
    if (chest.opened) continue;
    chest.opened = true;
    const id = `${game.id}:${chest.id}:loot`;
    chest.lootId = id;
    const player = game.players.find(
      (p) =>
        p.hp > 0 &&
        canOwnItem(content, chest.itemDefinition, p.classId) &&
        itemSlots(p, content.items[chest.itemDefinition].slot).includes(null),
    );
    if (player) giveItem(game, player, id, chest.itemDefinition, content);
    else
      game.items[id] = {
        id,
        definitionId: chest.itemDefinition,
        ownerId: "",
        ...itemProperties(content, chest.itemDefinition),
      };
    addEvent(
      game,
      "LOOT",
      player
        ? `${player.name} recibe ${game.items[id].name}.`
        : "Un cofre se abrió. Su botín espera junto al cofre.",
    );
  }
}
function enemyPhase(game: Game, content: Content, dice: Dice) {
  for (const enemy of game.enemies.filter((e) => e.hp > 0)) {
    const target = game.players
      .filter((p) => p.hp > 0)
      .sort(
        (a, b) => distance(enemy, a) - distance(enemy, b) || a.slot - b.slot,
      )[0];
    if (!target) break;
    for (
      let step = 0;
      step < enemy.movement && distance(enemy, target) > enemy.range;
      step++
    ) {
      const options = [
        { x: enemy.x + 1, y: enemy.y },
        { x: enemy.x - 1, y: enemy.y },
        { x: enemy.x, y: enemy.y + 1 },
        { x: enemy.x, y: enemy.y - 1 },
      ]
        .filter((p) => passable(game, content, p, enemy.id))
        .sort((a, b) => distance(a, target) - distance(b, target));
      if (
        options[0] &&
        distance(options[0], target) < distance(enemy, target)
      ) {
        enemy.x = options[0].x;
        enemy.y = options[0].y;
      }
    }
    if (
      distance(enemy, target) <= enemy.range &&
      clearPath(game, enemy, target)
    ) {
      const defense = effectiveStats(game, target),
        chance = hitChance(
          { ...enemy, damageType: "physical" },
          defense,
          distance(enemy, target),
        );
      if (dice(100) <= chance) {
        const result = rollDamage(dice, defense.defense);
        target.hp = Math.max(0, target.hp - result.amount);
        addEvent(
          game,
          "ENEMY",
          `${enemy.name} inflige ${result.amount} a ${target.name}.`,
          result.dice,
          {
            actorId: enemy.id,
            targetId: target.id,
            amount: result.amount,
            ability: "basic",
          },
        );
      } else
        addEvent(game, "MISS", `${enemy.name} falla su ataque.`, undefined, {
          actorId: enemy.id,
          targetId: target.id,
          amount: 0,
          ability: "basic",
        });
    }
  }
}
function endTurn(game: Game, content: Content, dice: Dice) {
  const current = game.players.find((p) => p.id === game.activePlayerId)!;
  let next = game.players.find((p) => p.slot > current.slot && p.hp > 0);
  if (!next) {
    enemyPhase(game, content, dice);
    game.round++;
    next = game.players.find((p) => p.hp > 0);
  }
  if (!next) {
    game.status = "LOST";
    game.activePlayerId = null;
    addEvent(
      game,
      "LOST",
      "La expedición ha caído. El umbral guarda sus secretos.",
    );
    return;
  }
  game.activePlayerId = next.id;
  game.phase = "MOVEMENT";
  game.movementRoll = null;
  game.movementLeft = 0;
  game.actionUsed = false;
  addEvent(game, "TURN", `Es el turno de ${next.name}.`);
}
export function resolve(
  input: Game,
  actorId: string | null,
  action: Action,
  content: Content,
  dice: Dice,
): Game {
  assertInventory(input, content);
  const game = structuredClone(input);
  if (action.type === "START") {
    requireRule(
      actorId === null,
      "FORBIDDEN",
      "Solo el coordinador puede comenzar.",
    );
    requireRule(
      game.status === "LOBBY" && game.players.length >= 2,
      "NOT_READY",
      "Se necesitan entre dos y cuatro viajeros.",
    );
    game.status = "ACTIVE";
    game.round = 1;
    game.activePlayerId = game.players[0].id;
    addEvent(
      game,
      "START",
      "El Anfitrión: «El umbral se abre. Avancen juntos.»",
    );
    game.revision++;
    return game;
  }
  requireRule(
    game.status === "ACTIVE",
    "WRONG_PHASE",
    "La aventura no está activa.",
  );
  requireRule(
    actorId && actorId === game.activePlayerId,
    "NOT_YOUR_TURN",
    "Esperá tu turno.",
  );
  const player = game.players.find((p) => p.id === actorId)!;
  requireRule(player.hp > 0, "PLAYER_DEAD", "Tu personaje ha caído.");
  requireRule(
    !game.pendingAttack || action.type === "ROLL_ATTACK_D6",
    "ATTACK_PENDING",
    "Primero tirá el D6 del ataque pendiente.",
  );
  switch (action.type) {
    case "ROLL_MOVEMENT":
      requireRule(
        game.phase === "MOVEMENT" && game.movementRoll === null,
        "ALREADY_ROLLED",
        "El movimiento ya se resolvió.",
      );
      game.movementRoll = dice(6);
      game.movementLeft = movementTotal(game.movementRoll);
      addEvent(
        game,
        "DICE",
        `${player.name}: ${game.movementLeft} casillas de movimiento.`,
        [game.movementRoll],
        { actorId: player.id },
      );
      break;
    case "MOVE_STEP": {
      requireRule(
        game.phase === "MOVEMENT" && game.movementLeft > 0,
        "NO_MOVEMENT",
        "No hay movimiento disponible.",
      );
      const delta = { UP: [0, -1], DOWN: [0, 1], LEFT: [-1, 0], RIGHT: [1, 0] }[
        action.direction
      ];
      requireRule(delta, "INVALID_DIRECTION", "Usá una dirección cardinal.");
      const next = { x: player.x + delta[0], y: player.y + delta[1] };
      requireRule(
        passable(game, content, next, player.id),
        "BLOCKED_PATH",
        "Esa casilla está bloqueada.",
      );
      player.x = next.x;
      player.y = next.y;
      game.movementLeft--;
      break;
    }
    case "FINISH_MOVEMENT":
      requireRule(
        game.phase === "MOVEMENT",
        "WRONG_PHASE",
        "El movimiento ya terminó.",
      );
      game.phase = "ACTION";
      game.movementLeft = 0;
      break;
    case "ATTACK": {
      requireRule(!game.actionUsed, "ACTION_USED", "Ya usaste tu acción.");
      const enemy = game.enemies.find((e) => e.id === action.targetId),
        ability = action.ability ?? "basic";
      requireRule(
        ["basic", "special", "ultimate"].includes(ability),
        "INVALID_ABILITY",
        "Habilidad no disponible.",
      );
      requireRule(
        enemy && attackPreview(game, player, enemy).valid,
        "OUT_OF_RANGE",
        "Objetivo fuera de alcance o trayectoria bloqueada.",
      );
      const cost =
        ability === "special"
          ? content.resource.specialCost
          : ability === "ultimate"
            ? content.resource.ultimateCost
            : 0;
      requireRule(
        player.resource >= cost,
        "NOT_ENOUGH_RESOURCE",
        "No tenés suficiente recurso para esa habilidad.",
      );
      consumeAction(game);
      player.resource -= cost;
      if (ability === "basic")
        player.resource = Math.min(
          content.resource.max,
          player.resource + content.resource.basicGain,
        );
      const chance = attackPreview(game, player, enemy).chance;
      const label =
        ability === "basic"
          ? "ataque básico"
          : ability === "special"
            ? "ataque especial"
            : "ulti";
      const hit = dice(100) <= chance;
      const d20 = dice(20);
      if (hit) {
        game.pendingAttack = {
          actorId: player.id,
          targetId: enemy.id,
          ability,
          d20,
        };
        addEvent(
          game,
          "ATTACK_D20",
          `${player.name} tira D20 para ${label}: ${d20}. Ahora debe tirar D6.`,
          [d20],
          {
            actorId: player.id,
            targetId: enemy.id,
            ability,
          },
        );
      } else {
        addEvent(
          game,
          "ATTACK_MISS_ROLL",
          player.name +
            " falla su " +
            label +
            ". La acción y el costo se consumen.",
          [d20],
          { actorId: player.id, targetId: enemy.id, ability, amount: 0 },
        );
      }
      break;
    }
    case "ROLL_ATTACK_D6": {
      const pending = game.pendingAttack;
      requireRule(
        pending && pending.actorId === player.id,
        "NO_ATTACK_PENDING",
        "No hay un ataque esperando el D6.",
      );
      const enemy = game.enemies.find(
        (candidate) => candidate.id === pending.targetId,
      );
      requireRule(
        enemy && enemy.hp > 0,
        "TARGET_GONE",
        "El objetivo ya no está disponible.",
      );
      const d6 = dice(6);
      const power =
        (player.stats.damageMultiplier ?? 1) *
        (pending.ability === "special"
          ? content.resource.specialMultiplier
          : pending.ability === "ultimate"
            ? content.resource.ultimateMultiplier
            : 1);
      const amount = damage(
        pending.d20,
        d6,
        player.stats.damageType === "magic" ? enemy.resistance : enemy.defense,
        false,
        power,
      );
      enemy.hp = Math.max(0, enemy.hp - amount);
      game.pendingAttack = null;
      addEvent(
        game,
        "ATTACK_D6",
        `${player.name} tira D6: ${d6}. Daño final: ${amount}.`,
        [d6],
        {
          actorId: player.id,
          targetId: enemy.id,
          ability: pending.ability,
          amount,
        },
      );
      addEvent(
        game,
        "ATTACK",
        `${player.name} causa ${amount} de daño a ${enemy.name}.`,
        [pending.d20, d6],
        {
          actorId: player.id,
          targetId: enemy.id,
          ability: pending.ability,
          amount,
        },
      );
      safeLoot(game, content);
      break;
    }
    case "EQUIP": {
      const item = game.items[action.itemId],
        index = player.inventory.indexOf(action.itemId);
      requireRule(
        item && item.ownerId === player.id && index >= 0 && item.slot,
        "ITEM_NOT_OWNED",
        "No podés equipar ese objeto.",
      );
      consumeAction(game);
      player.inventory[index] = player.equipment[item.slot];
      player.equipment[item.slot] = item.id;
      addEvent(game, "EQUIP", `${player.name} equipa ${item.name}.`);
      break;
    }
    case "UNEQUIP": {
      const id = player.equipment[action.slot],
        index = player.inventory.indexOf(null);
      requireRule(id, "NO_ITEM", "La ranura está vacía.");
      requireRule(index >= 0, "INVENTORY_FULL", "La bolsa está llena.");
      consumeAction(game);
      player.inventory[index] = id;
      player.equipment[action.slot] = null;
      addEvent(
        game,
        "UNEQUIP",
        `${player.name} desequipa ${game.items[id].name}.`,
      );
      break;
    }
    case "USE_ITEM": {
      const item = game.items[action.itemId],
        index = player.potions.indexOf(action.itemId);
      requireRule(
        item &&
          item.ownerId === player.id &&
          index >= 0 &&
          (item.heal > 0 || item.restoreResource > 0),
        "ITEM_NOT_OWNED",
        "Ese objeto no se puede consumir.",
      );
      consumeAction(game);
      player.hp = Math.min(player.stats.maxHp, player.hp + item.heal);
      player.resource = Math.min(
        content.resource.max,
        player.resource + item.restoreResource,
      );
      player.potions[index] = null;
      delete game.items[item.id];
      addEvent(
        game,
        "HEAL",
        `${player.name} usa una poción: recupera vida y recurso.`,
      );
      break;
    }
    case "DISCARD_ITEM": {
      const item = game.items[action.itemId];
      const slots = item ? itemSlots(player, item.slot) : player.inventory;
      const index = slots.indexOf(action.itemId);
      requireRule(
        item && item.ownerId === player.id && index >= 0,
        "ITEM_NOT_OWNED",
        "Solo podés descartar un objeto de tu bolsa.",
      );
      consumeAction(game);
      slots[index] = null;
      delete game.items[item.id];
      addEvent(
        game,
        "DISCARD",
        `${player.name} descarta ${item.name}.`,
        undefined,
        { targetId: item.id },
      );
      break;
    }
    case "INTERACT": {
      const chest = game.chests.find((c) => c.id === action.targetId),
        zone = game.zones.find((z) => z.id === action.targetId),
        object = game.interactables.find((o) => o.id === action.targetId);
      const target = chest ?? zone ?? object;
      requireRule(
        target && distance(player, target) <= 1,
        "OUT_OF_RANGE",
        "Acercate a la zona para interactuar.",
      );
      if (chest) {
        requireRule(
          chest.opened &&
            chest.lootId &&
            game.items[chest.lootId]?.ownerId === "",
          "CHEST_LOCKED",
          "Los cofres entregan botín al derrotar a todos los enemigos.",
        );
        const item = game.items[chest.lootId];
        requireItemClass(content, item.definitionId, player.classId);
        const slots = itemSlots(player, item.slot);
        const index = freeItemSlot(slots);
        consumeAction(game);
        item.ownerId = player.id;
        slots[index] = item.id;
      } else if (object) {
        requireRule(!object.used, "ALREADY_USED", "Ya se recogió ese objeto.");
        requireRule(
          Object.hasOwn(content.items, object.itemDefinition),
          "UNKNOWN_ITEM",
          "El objeto no está disponible.",
        );
        requireItemClass(content, object.itemDefinition, player.classId);
        freeItemSlot(
          itemSlots(player, content.items[object.itemDefinition].slot),
        );
        consumeAction(game);
        const itemId = `${game.id}:${object.id}:gather`;
        giveItem(game, player, itemId, object.itemDefinition, content);
        object.used = true;
        addEvent(
          game,
          "GATHER",
          `${player.name} recoge ${game.items[itemId].name} de ${object.name}.`,
        );
      } else if (zone?.kind === "fountain") {
        requireRule(
          !game.fountainUsed.includes(player.id),
          "ALREADY_USED",
          "Ya usaste la fuente en esta expedición.",
        );
        consumeAction(game);
        player.hp = Math.min(player.stats.maxHp, player.hp + 8);
        game.fountainUsed.push(player.id);
        addEvent(game, "HEAL", `${player.name} bebe de la fuente.`);
      } else {
        requireRule(
          !game.enemies.some((e) => e.hp > 0),
          "ENEMIES_REMAIN",
          "La puerta de esta demo se abre al limpiar el patio.",
        );
        consumeAction(game);
        game.status = "WON";
        addEvent(game, "WON", "El patio está a salvo. La aventura continuará…");
      }
      break;
    }
    case "END_TURN":
      endTurn(game, content, dice);
      break;
  }
  game.revision++;
  assertInventory(game, content);
  return game;
}
export function assertInventory(game: Game, content: Content) {
  const seen = new Set<string>();
  for (const player of game.players) {
    requireRule(
      player.inventory.length === 4,
      "INVENTORY_CORRUPT",
      "Bolsa inválida.",
    );
    requireRule(
      player.potions.length === 4,
      "INVENTORY_CORRUPT",
      "Casillas de pociones inválidas.",
    );
    for (const id of player.inventory)
      if (id)
        requireRule(
          game.items[id]?.slot !== null,
          "INVENTORY_CORRUPT",
          "Poción en la bolsa.",
        );
    for (const id of player.potions)
      if (id)
        requireRule(
          game.items[id]?.slot === null,
          "INVENTORY_CORRUPT",
          "Equipo en casilla de pociones.",
        );
    for (const id of [
      ...player.inventory,
      ...player.potions,
      ...Object.values(player.equipment),
    ]) {
      if (id) {
        requireRule(
          !seen.has(id) && game.items[id]?.ownerId === player.id,
          "INVENTORY_CORRUPT",
          "Identidad de objeto inválida.",
        );
        seen.add(id);
        requireItemClass(content, game.items[id].definitionId, player.classId);
      }
    }
  }
  for (const item of Object.values(game.items)) {
    requireRule(
      Object.hasOwn(content.items, item.definitionId),
      "INVENTORY_CORRUPT",
      "Objeto desconocido en el guardado.",
    );
    requireRule(
      !item.ownerId || seen.has(item.id),
      "INVENTORY_CORRUPT",
      "Objeto sin referencia.",
    );
  }
}
