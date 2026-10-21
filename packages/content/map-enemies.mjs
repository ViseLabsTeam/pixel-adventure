// Shared by the local editor and map generator. No game state is mutated here.
export function readMapEnemies(value, recipes, legacy) {
  const entries = value === undefined ? legacy : value;
  if (!Array.isArray(entries))
    throw new Error("La lista de enemigos no es válida");
  const ids = new Set();
  const cells = new Set();
  return entries.map((entry) => {
    if (
      !entry ||
      typeof entry.id !== "string" ||
      !/^[a-z0-9-]+$/.test(entry.id) ||
      ids.has(entry.id) ||
      typeof entry.archetypeId !== "string" ||
      !Object.hasOwn(recipes, entry.archetypeId) ||
      !Number.isSafeInteger(entry.x) ||
      !Number.isSafeInteger(entry.y)
    )
      throw new Error(
        "Enemigo inválido: revisá ID único, tipo del catálogo y coordenadas enteras",
      );
    const cell = `${entry.x},${entry.y}`;
    if (cells.has(cell)) throw new Error(`Enemigos superpuestos en ${cell}`);
    ids.add(entry.id);
    cells.add(cell);
    return {
      id: entry.id,
      archetypeId: entry.archetypeId,
      x: entry.x,
      y: entry.y,
    };
  });
}
