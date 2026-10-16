export const classes = {
  paladin: {
    name: "Paladín",
    title: "El juramento de hierro",
    description: "Su escudo abre camino donde otros retroceden.",
    color: "#e7c67b",
    portrait: "/assets/paladin/generated/portrait.png",
    attack: "Golpe de escudo",
    range: 1,
  },
  warrior: {
    name: "Guerrero",
    title: "El filo incansable",
    description: "Acero, coraje y una razón para seguir luchando.",
    color: "#df896c",
    portrait: "/assets/guerrero/generated/portrait.png",
    attack: "Corte de espada",
    range: 1,
  },
  mage: {
    name: "Mago",
    title: "El guardián de la chispa",
    description: "Los antiguos secretos responden a su llamado.",
    color: "#aaa0e7",
    portrait: "/assets/mago/generated/portrait.png",
    attack: "Descarga arcana",
    range: 2,
  },
} as const;
export type ClassId = keyof typeof classes;
export const equipmentSlots = {
  helmet: "Casco",
  gloves: "Guantes",
  pants: "Pantalones",
  chest: "Pechera",
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
} as const;

export { animationTimings } from "./animation-timings";
