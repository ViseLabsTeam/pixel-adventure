import { expect, it } from "vitest";
import { perceivedEnemies } from "./perceived-enemies";

it("muestra solo enemigos vivos a seis pasos en todas las direcciones y los ordena por cercanía", () => {
  const enemies = [
    { id: "west", x: -6, y: 0, hp: 1 },
    { id: "diagonal-inside", x: 3, y: 3, hp: 1 },
    { id: "diagonal-outside", x: 4, y: 3, hp: 1 },
    { id: "north", x: 0, y: -6, hp: 1 },
    { id: "east", x: 6, y: 0, hp: 1 },
    { id: "south", x: 0, y: 6, hp: 1 },
    { id: "closer", x: -1, y: -1, hp: 1 },
    { id: "dead", x: 0, y: 1, hp: 0 },
    { id: "far", x: -7, y: 0, hp: 1 },
  ];
  expect(perceivedEnemies({ x: 0, y: 0 }, enemies).map((e) => e.id)).toEqual([
    "closer",
    "west",
    "diagonal-inside",
    "north",
    "east",
    "south",
  ]);
  expect(
    perceivedEnemies({ x: -7, y: 0 }, enemies).map((enemy) => enemy.id),
  ).toContain("far");
});
