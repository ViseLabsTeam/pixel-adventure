import actorRecipes from "../actor-recipes.json";
export { actorRecipes };
export const classes = {
  paladin: {
    name: "Paladín",
    title: "El juramento de hierro",
    description: "Su escudo abre camino donde otros retroceden.",
    color: "#e7c67b",
    portrait: "/assets/paladin/generated/portrait.png",
    idlePortrait: "/assets/paladin/generated/idle-portrait.webp",
    demoDamage: { physical: 4, magic: 0 },
    attack: "Golpe de escudo",
    range: 1,
  },
  warrior: {
    name: "Guerrero",
    title: "El filo incansable",
    description: "Acero, coraje y una razón para seguir luchando.",
    color: "#df896c",
    portrait: "/assets/guerrero/generated/portrait.png",
    idlePortrait: "/assets/guerrero/generated/idle-portrait.webp",
    demoDamage: { physical: 7, magic: 0 },
    attack: "Corte de espada",
    range: 1,
  },
  mage: {
    name: "Mago",
    title: "El guardián de la chispa",
    description: "Los antiguos secretos responden a su llamado.",
    color: "#aaa0e7",
    portrait: "/assets/mago/generated/portrait.png",
    idlePortrait: "/assets/mago/generated/idle-portrait.webp",
    demoDamage: { physical: 1, magic: 9 },
    attack: "Descarga arcana",
    range: 2,
  },
  archer: {
    name: "Arquera",
    title: "La mirada del bosque",
    description: "Cada flecha encuentra el camino entre las sombras.",
    color: "#a8d677",
    portrait: "/assets/arquera/generated/portrait.png",
    idlePortrait: "/assets/arquera/generated/idle-portrait.webp",
    demoDamage: { physical: 8, magic: 0 },
    attack: "Disparo certero",
    range: 3,
  },
} as const;
export type ClassId = keyof typeof classes;
export const equipmentSlots = {
  helmet: "Casco",
  chest: "Pechera",
  weapon: "Arma",
  boots: "Botas",
} as const;
export const guide = {
  name: "El Anfitrión",
  portrait: "/assets/maestro/maestro_de_seremonias.png",
  backdrop: "/assets/maestro/maestro2.PNG",
};

export const resources = {
  paladin: { name: "Fe", color: "#e6bd52" },
  warrior: { name: "Furia", color: "#e45c58" },
  mage: { name: "Maná", color: "#65bdf4" },
  archer: { name: "Enfoque", color: "#acdb76" },
} as const;
export const abilities = {
  paladin: { special: "Impacto consagrado", ultimate: "Juicio del guardián" },
  warrior: { special: "Corte furioso", ultimate: "Furia desatada" },
  mage: { special: "Lanza de hielo", ultimate: "Sobrecarga arcana" },
  archer: { special: "Flecha concentrada", ultimate: "Lluvia de flechas" },
} as const;

export { animationTimings, movementStepMs } from "./animation-timings";
export { diceTimings } from "./dice-timings";
export const animationGraceMs = 300;
export const combatPresentation = {
  resultMs: 650,
  lingerMs: 450,
  get totalMs() {
    return this.resultMs + this.lingerMs;
  },
} as const;
