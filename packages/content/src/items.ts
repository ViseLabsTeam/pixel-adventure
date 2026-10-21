type ClassId = "paladin" | "warrior" | "mage" | "archer";
type Slot = "helmet" | "chest" | "weapon" | "boots" | "gloves" | "pants";
const classIds: ClassId[] = ["paladin", "warrior", "mage", "archer"];
const labels = {
  paladin: "paladín",
  warrior: "guerrero",
  mage: "mago",
  archer: "arquera",
};
interface Definition {
  name: string;
  slot: Slot | null;
  allowedClasses: ClassId[];
  defense: number;
  resistance: number;
  heal: number;
  restoreResource: number;
  physicalDamage?: number;
  magicDamage?: number;
}
const bases: {
  id: string;
  owner: ClassId;
  name: string;
  slot: Slot;
  defense: number;
  resistance: number;
}[] = [
  {
    id: "iron-helmet",
    owner: "paladin",
    name: "Yelmo de hierro",
    slot: "helmet",
    defense: 2,
    resistance: 0,
  },
  {
    id: "cloth-gloves",
    owner: "mage",
    name: "Guantes del eco",
    slot: "gloves",
    defense: 0,
    resistance: 2,
  },
  {
    id: "travel-pants",
    owner: "warrior",
    name: "Pantalones de viaje",
    slot: "pants",
    defense: 1,
    resistance: 0,
  },
  {
    id: "travel-boots",
    owner: "paladin",
    name: "Botas de viaje",
    slot: "boots",
    defense: 1,
    resistance: 0,
  },
  {
    id: "paladin-shield",
    owner: "paladin",
    name: "Escudo de paladín",
    slot: "weapon",
    defense: 0,
    resistance: 0,
  },
  {
    id: "old-chestplate",
    owner: "paladin",
    name: "Pechera antigua",
    slot: "chest",
    defense: 2,
    resistance: 1,
  },
];
const slotNames = {
  helmet: "Casco",
  chest: "Pechera",
  boots: "Botas",
  gloves: "Guantes",
  pants: "Pantalones",
  weapon: "Arma",
};
const weapons = {
  paladin: "Escudo de paladín",
  warrior: "Espada de guerrero",
  mage: "Bastón de mago",
  archer: "Arco de arquera",
};
const weaponIds = {
  paladin: "paladin-shield",
  warrior: "warrior-sword",
  mage: "mage-staff",
  archer: "archer-bow",
};
export const itemDefinitions: Record<string, Definition> = {
  potion: {
    name: "Poción menor",
    slot: null,
    allowedClasses: [...classIds],
    defense: 0,
    resistance: 0,
    heal: 12,
    restoreResource: 100,
  },
};
export const legacyClassItems = Object.fromEntries(
  classIds.map((id) => [id, {}]),
) as Record<ClassId, Record<string, string>>;
for (const base of bases)
  for (const classId of classIds) {
    const id =
      classId === base.owner
        ? base.id
        : base.slot === "weapon"
          ? weaponIds[classId]
          : `${classId}-${base.id}`;
    legacyClassItems[classId][base.id] = id;
    itemDefinitions[id] = {
      name:
        classId === base.owner
          ? base.name
          : base.slot === "weapon"
            ? weapons[classId]
            : `${slotNames[base.slot]} de ${labels[classId]}`,
      slot: base.slot,
      allowedClasses: [classId],
      defense: base.defense,
      resistance: base.resistance,
      heal: 0,
      restoreResource: 0,
      ...(base.slot === "weapon"
        ? classId === "mage"
          ? { magicDamage: 2 }
          : { physicalDamage: 2 }
        : {}),
    };
  }
for (const classId of classIds)
  legacyClassItems[classId]["rusty-sword"] = weaponIds[classId];
export const starterItems = Object.fromEntries(
  classIds.map((classId) => [
    classId,
    [
      "potion",
      ...["travel-boots", "paladin-shield", "old-chestplate"].map(
        (id) => legacyClassItems[classId][id],
      ),
    ],
  ]),
) as Record<ClassId, string[]>;
