import enemyRecipes from "../../packages/content/enemy-recipes.json";
import legacyEnemies from "../../assets/mapas/legacy-enemies.json";
import { readMapEnemies } from "../../packages/content/map-enemies.mjs";
import { itemDefinitions } from "../../packages/content/src/items.ts";

const $ = (id) => document.getElementById(id);
const canvas = $("map"),
  ctx = canvas.getContext("2d");
let image = new Image(),
  data,
  painting = false,
  preview = null,
  selected = null;
const key = (x, y) => `${x},${y}`;
const coordinates = (key) => key.split(",").map(Number);
const wallCells = new Set();
const trunkCells = new Map();
const treeImages = new Map();

function grid() {
  return {
    x: Number($("origin-x").value),
    y: Number($("origin-y").value),
    size: Number($("tile").value),
  };
}
function importData(source) {
  if (
    source.version !== 1 ||
    !source.origin ||
    !Number.isInteger(source.tileSize) ||
    source.tileSize < 1 ||
    !Array.isArray(source.trees)
  )
    throw new Error("Formato de mapa no válido");
  const enemies = readMapEnemies(source.enemies, enemyRecipes, legacyEnemies);
  data = structuredClone(source);
  data.enemies = enemies;
  data.spawns ??= [];
  data.chests ??= [];
  data.interactables ??= [];
  selected = null;
  $("origin-x").value = source.origin.x;
  $("origin-y").value = source.origin.y;
  $("tile").value = source.tileSize;
  wallCells.clear();
  trunkCells.clear();
  for (const { x, y } of source.walls ?? []) wallCells.add(key(x, y));
  for (const [left, top, right, bottom] of source.wallRects ?? []) {
    for (
      let y = Math.floor((top - source.origin.y) / source.tileSize);
      y <= Math.floor((bottom - source.origin.y) / source.tileSize);
      y++
    )
      for (
        let x = Math.floor((left - source.origin.x) / source.tileSize);
        x <= Math.floor((right - source.origin.x) / source.tileSize);
        x++
      ) {
        const px = source.origin.x + (x + 0.5) * source.tileSize;
        const py = source.origin.y + (y + 0.5) * source.tileSize;
        if (px >= left && px < right && py >= top && py < bottom)
          wallCells.add(key(x, y));
      }
  }
  for (const tree of data.trees)
    for (const [x, y] of tree.trunk) trunkCells.set(key(x, y), tree.id);
  updateTrees();
  showSelection();
  render();
}
function placement() {
  if (!selected) return null;
  if (selected.type === "spawn") return data.spawns[selected.index];
  return data[selected.type].find((entry) => entry.id === selected.id);
}
function showSelection() {
  const entry = placement();
  $("selection").textContent = entry
    ? selected.type === "spawn"
      ? `Aparición ${selected.index + 1}: (${entry.x}, ${entry.y})`
      : `${selected.type === "enemies" ? enemyRecipes[entry.archetypeId].name : selected.type === "chests" ? "Cofre" : "Interactuable"}: (${entry.x}, ${entry.y})`
    : "Objeto: ninguno";
  $("entity-id").value =
    selected?.type === "spawn"
      ? `jugador-${selected.index + 1}`
      : (entry?.id ?? "");
  $("entity-kind").value =
    selected?.type === "interactables" ? (entry?.kind ?? "") : "";
  $("entity-name").value =
    selected?.type === "interactables" ? (entry?.name ?? "") : "";
  $("entity-item").value =
    selected?.type === "spawn" ? "" : (entry?.itemDefinition ?? "");
  for (const id of ["entity-id", "entity-kind", "entity-name", "entity-item"])
    $(id).disabled =
      !entry ||
      selected.type === "spawn" ||
      (selected.type === "chests" &&
        (id === "entity-kind" || id === "entity-name")) ||
      (selected.type === "interactables" &&
        entry.kind === "reviver" &&
        id === "entity-item");
  $("delete-placement").disabled = !entry;
  for (const axis of ["x", "y"]) {
    $("entity-" + axis).value = entry?.[axis] ?? "";
    $("entity-" + axis).disabled = !entry;
  }
  $("entity-archetype").disabled = selected?.type !== "enemies";
  $("entity-archetype").value =
    selected?.type === "enemies" ? entry.archetypeId : "";
  if (selected?.type === "enemies") {
    for (const id of ["entity-kind", "entity-name", "entity-item"])
      $(id).disabled = true;
  }
}
function select(type, entry, index) {
  selected = type === "spawn" ? { type, index } : { type, id: entry.id };
  showSelection();
  render();
}
function nextId(prefix) {
  const ids = new Set(
    [...data.chests, ...data.interactables, ...data.enemies].map(
      ({ id }) => id,
    ),
  );
  let number = 1;
  while (ids.has(`${prefix}-${number}`)) number++;
  return `${prefix}-${number}`;
}
function updateTrees() {
  const current = $("tree").value;
  $("tree").replaceChildren(
    ...data.trees.map((tree) => new Option(tree.id, tree.id)),
  );
  if (data.trees.some((tree) => tree.id === current)) $("tree").value = current;
  $("foot-y").value = selectedTree()?.footY ?? 0;
}
function selectedTree() {
  return data.trees.find((tree) => tree.id === $("tree").value);
}
function render() {
  if (!image.complete || !image.naturalWidth || !data) return;
  const zoom = Number($("zoom").value),
    { x: ox, y: oy, size } = grid();
  canvas.width = image.naturalWidth * zoom;
  canvas.height = image.naturalHeight * zoom;
  ctx.imageSmoothingEnabled = false;
  ctx.scale(zoom, zoom);
  ctx.drawImage(image, 0, 0);
  ctx.lineWidth = 1 / zoom;
  for (const [cells, color] of [
    [wallCells, "#e64753"],
    [trunkCells.keys(), "#8d52dc"],
  ]) {
    ctx.fillStyle = color + "80";
    for (const cell of cells) {
      const [x, y] = coordinates(cell);
      ctx.fillRect(ox + x * size, oy + y * size, size, size);
    }
  }
  ctx.strokeStyle = "#d4ebbd55";
  for (let x = ((ox % size) + size) % size; x < image.width; x += size) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, image.height);
    ctx.stroke();
  }
  for (let y = ((oy % size) + size) % size; y < image.height; y += size) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(image.width, y);
    ctx.stroke();
  }
  for (const tree of data.trees) {
    if (!tree.outline.length) continue;
    ctx.beginPath();
    ctx.moveTo(...tree.outline[0]);
    for (const point of tree.outline.slice(1)) ctx.lineTo(...point);
    if (tree.outline.length > 2) ctx.closePath();
    ctx.strokeStyle = tree.id === $("tree").value ? "#fff27e" : "#67dbd0";
    ctx.lineWidth = 2 / zoom;
    ctx.stroke();
  }
  const marker = (x, y, text, color, active, allowBlocked = false) => {
    const px = ox + (x + 0.5) * size,
      py = oy + (y + 0.5) * size;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(px, py, Math.max(5, size * 0.42), 0, 2 * Math.PI);
    ctx.fill();
    const blocked =
      !allowBlocked && (wallCells.has(key(x, y)) || trunkCells.has(key(x, y)));
    ctx.strokeStyle = blocked ? "#ff4040" : active ? "#fff" : "#183026";
    ctx.lineWidth = blocked || active ? 2 : 1;
    ctx.stroke();
    ctx.fillStyle = "#14211d";
    ctx.font = `bold ${Math.max(9, size * 0.65)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, px, py);
  };
  data.spawns.forEach((point, index) => {
    if (point)
      marker(
        point.x,
        point.y,
        String(index + 1),
        "#80c9ff",
        selected?.type === "spawn" && selected.index === index,
      );
  });
  for (const chest of data.chests)
    marker(
      chest.x,
      chest.y,
      "C",
      "#f6c763",
      selected?.type === "chests" && selected.id === chest.id,
    );
  for (const enemy of data.enemies)
    marker(
      enemy.x,
      enemy.y,
      "E",
      "#f58f85",
      selected?.type === "enemies" && selected.id === enemy.id,
    );
  for (const object of data.interactables)
    marker(
      object.x,
      object.y,
      object.kind === "plant" ? "P" : object.kind === "reviver" ? "R" : "I",
      object.kind === "reviver" ? "#a9d8ff" : "#9ee081",
      selected?.type === "interactables" && selected.id === object.id,
      true,
    );
  if (preview) {
    const actorFoot = oy + (preview.y + 0.85) * size;
    const trees = [...data.trees].sort((a, b) => a.footY - b.footY);
    for (const tree of trees) {
      const layer = treeImages.get(tree.id);
      if (layer?.complete && tree.footY <= actorFoot) {
        const left = Math.min(...tree.outline.map(([x]) => x));
        const top = Math.min(...tree.outline.map(([, y]) => y));
        ctx.drawImage(layer, left, top);
      }
    }
    ctx.fillStyle = "#1c42ee";
    ctx.beginPath();
    ctx.arc(
      ox + (preview.x + 0.5) * size,
      actorFoot - size * 0.5,
      size * 0.45,
      0,
      2 * Math.PI,
    );
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.stroke();
    for (const tree of trees) {
      const layer = treeImages.get(tree.id);
      if (layer?.complete && tree.footY > actorFoot) {
        const left = Math.min(...tree.outline.map(([x]) => x));
        const top = Math.min(...tree.outline.map(([, y]) => y));
        ctx.drawImage(layer, left, top);
      }
    }
  }
  const blockedPlacements = [
    ...data.spawns.filter(Boolean),
    ...data.chests,
    ...data.enemies,
  ].filter(({ x, y }) => wallCells.has(key(x, y)) || trunkCells.has(key(x, y)));
  const treesWithoutTrunk = data.trees.filter(
    ({ id }) => ![...trunkCells.values()].includes(id),
  );
  const treesWithoutOutline = data.trees.filter(
    ({ outline }) => outline.length < 3,
  );
  $("status").textContent =
    `${wallCells.size} muros · ${trunkCells.size} troncos · ${data.trees.length} árboles · ${data.spawns.filter(Boolean).length}/4 apariciones · ${data.chests.length} cofres · ${data.interactables.length} interactuables · ${data.enemies.length} enemigos.` +
    (blockedPlacements.length
      ? ` ${blockedPlacements.length} puntos sobre obstáculos (borde rojo).`
      : "") +
    (treesWithoutTrunk.length
      ? ` Sin tronco: ${treesWithoutTrunk.map(({ id }) => id).join(", ")}.`
      : "") +
    (treesWithoutOutline.length
      ? ` Sin silueta: ${treesWithoutOutline.map(({ id }) => id).join(", ")}.`
      : "");
  const occupied = [
    ...data.spawns.filter(Boolean),
    ...data.chests,
    ...data.interactables,
    ...data.enemies,
  ];
  const conflicts = data.enemies.filter((enemy) =>
    occupied.some(
      (entry) => entry !== enemy && entry.x === enemy.x && entry.y === enemy.y,
    ),
  );
  if (conflicts.length)
    $("status").textContent +=
      ` Enemigos superpuestos con otros puntos: ${conflicts.map(({ id }) => id).join(", ")}.`;
  $("enemy-list").replaceChildren(
    new Option("Seleccionar…", ""),
    ...data.enemies.map(
      (enemy) =>
        new Option(
          `${enemy.id} · ${enemyRecipes[enemy.archetypeId].name} (${enemy.x}, ${enemy.y})`,
          enemy.id,
        ),
    ),
  );
  $("enemy-list").value = selected?.type === "enemies" ? selected.id : "";
}
function point(event) {
  const rect = canvas.getBoundingClientRect(),
    zoom = Number($("zoom").value),
    { x: ox, y: oy, size } = grid();
  const px = (event.clientX - rect.left) / zoom,
    py = (event.clientY - rect.top) / zoom;
  return {
    px: Math.round(px),
    py: Math.round(py),
    x: Math.floor((px - ox) / size),
    y: Math.floor((py - oy) / size),
  };
}
function edit(event) {
  const { px, py, x, y } = point(event),
    tool = $("tool").value,
    cell = key(x, y);
  if (tool === "preview") preview = { x, y };
  else if (tool === "move") {
    const entry = placement();
    if (entry) {
      entry.x = x;
      entry.y = y;
      showSelection();
    }
  } else if (tool === "enemy") {
    const existing = data.enemies.find(
      (entry) => entry.x === x && entry.y === y,
    );
    if (existing) select("enemies", existing);
    else {
      const archetypeId = $("enemy-type").value;
      const entry = { id: nextId(archetypeId), archetypeId, x, y };
      data.enemies.push(entry);
      select("enemies", entry);
    }
  } else if (tool === "spawn") {
    const index = Number($("spawn-slot").value);
    data.spawns[index] = { x, y };
    select("spawn", data.spawns[index], index);
  } else if (
    tool === "chest" ||
    tool === "interactable" ||
    tool === "reviver"
  ) {
    const type = tool === "chest" ? "chests" : "interactables";
    const existing = data[type].find((entry) => entry.x === x && entry.y === y);
    if (existing) select(type, existing);
    else {
      const entry =
        tool === "chest"
          ? {
              id: nextId("chest"),
              x,
              y,
              itemDefinition: $("entity-item").value || "potion",
            }
          : {
              id: nextId(tool === "reviver" ? "reviver" : "object"),
              kind:
                tool === "reviver"
                  ? "reviver"
                  : $("entity-kind").value || "plant",
              name:
                tool === "reviver"
                  ? "Altar de regreso"
                  : $("entity-name").value || "Planta",
              x,
              y,
              itemDefinition:
                tool === "reviver" ? "" : $("entity-item").value || "potion",
            };
      data[type].push(entry);
      select(type, entry);
    }
  } else if (tool === "outline") {
    if (event.type === "pointerdown") selectedTree()?.outline.push([px, py]);
  } else if (tool === "wall") {
    wallCells.add(cell);
    trunkCells.delete(cell);
  } else if (tool === "trunk" && selectedTree()) {
    wallCells.delete(cell);
    trunkCells.set(cell, selectedTree().id);
  } else {
    wallCells.delete(cell);
    trunkCells.delete(cell);
  }
  render();
}
canvas.addEventListener("pointerdown", (event) => {
  painting = true;
  canvas.setPointerCapture(event.pointerId);
  edit(event);
});
canvas.addEventListener("pointermove", (event) => {
  if (painting && $("tool").value === "enemy" && selected?.type === "enemies") {
    const { x, y } = point(event);
    Object.assign(placement(), { x, y });
    showSelection();
    render();
    return;
  }
  if (
    painting &&
    ["wall", "trunk", "erase", "preview", "move"].includes($("tool").value)
  )
    edit(event);
});
canvas.addEventListener("pointerup", () => {
  painting = false;
});
canvas.addEventListener("pointercancel", () => {
  painting = false;
});
$("enemy-list").onchange = () => {
  const enemy = data.enemies.find(({ id }) => id === $("enemy-list").value);
  if (!enemy) return;
  $("tool").value = "enemy";
  select("enemies", enemy);
  const zoom = Number($("zoom").value),
    { x, y, size } = grid();
  $("viewport").scrollLeft =
    (x + (enemy.x + 0.5) * size) * zoom - $("viewport").clientWidth / 2;
  $("viewport").scrollTop =
    (y + (enemy.y + 0.5) * size) * zoom - $("viewport").clientHeight / 2;
};
$("entity-archetype").onchange = () => {
  if (selected?.type !== "enemies") return;
  placement().archetypeId = $("entity-archetype").value;
  showSelection();
  render();
};
for (const axis of ["x", "y"])
  $("entity-" + axis).onchange = () => {
    const entry = placement(),
      value = Number($("entity-" + axis).value);
    if (entry && Number.isSafeInteger(value)) entry[axis] = value;
    showSelection();
    render();
  };
for (const id of ["zoom", "origin-x", "origin-y", "tile"])
  $(id).addEventListener("input", render);
$("tree").addEventListener("input", () => {
  $("foot-y").value = selectedTree()?.footY ?? 0;
  render();
});
$("foot-y").addEventListener("input", () => {
  const tree = selectedTree();
  if (tree) tree.footY = Number($("foot-y").value);
  render();
});
$("new-map").onclick = () =>
  importData({
    version: 1,
    image: data.image,
    imageWidth: image.naturalWidth,
    imageHeight: image.naturalHeight,
    tileSize: grid().size,
    origin: { x: grid().x, y: grid().y },
    walls: [],
    trees: [],
    spawns: [],
    chests: [],
    interactables: [],
    enemies: [],
  });
for (const [field, property] of [
  ["entity-id", "id"],
  ["entity-kind", "kind"],
  ["entity-name", "name"],
  ["entity-item", "itemDefinition"],
])
  $(field).addEventListener("change", () => {
    const entry = placement();
    if (!entry || selected.type === "spawn") return;
    const value = $(field).value.trim();
    if (
      property === "id" &&
      (!/^[a-z0-9-]+$/.test(value) ||
        [...data.chests, ...data.interactables, ...data.enemies].some(
          (item) => item !== entry && item.id === value,
        ))
    ) {
      alert("ID inválido o repetido");
      showSelection();
      return;
    }
    entry[property] = value;
    if (property === "id") selected.id = value;
    if (property === "kind") {
      entry.itemDefinition =
        value === "reviver" ? "" : entry.itemDefinition || "potion";
      showSelection();
    }
    render();
  });
$("delete-placement").onclick = () => {
  const entry = placement();
  if (!entry) return;
  if (selected.type === "spawn") data.spawns[selected.index] = null;
  else
    data[selected.type] = data[selected.type].filter((item) => item !== entry);
  selected = null;
  showSelection();
  render();
};
$("new-tree").onclick = () => {
  const id = prompt("Identificador del árbol");
  if (
    !id ||
    !/^[a-z0-9-]+$/.test(id) ||
    data.trees.some((tree) => tree.id === id)
  )
    return;
  data.trees.push({ id, footY: 0, outline: [], trunk: [] });
  updateTrees();
  $("tree").value = id;
  $("foot-y").value = 0;
  render();
};
$("reset-outline").onclick = () => {
  const tree = selectedTree();
  if (!tree) return;
  tree.outline = [];
  treeImages.delete(tree.id);
  render();
};
$("finish").onclick = () => {
  const tree = selectedTree();
  if (!tree || tree.outline.length < 3) return;
  const owned = [...trunkCells]
    .filter(([, id]) => id === tree.id)
    .map(([cell]) => coordinates(cell));
  if (owned.length)
    tree.footY =
      grid().y + (Math.max(...owned.map(([, y]) => y)) + 1) * grid().size;
  $("foot-y").value = tree.footY;
  render();
};
$("export").onclick = () => {
  try {
    readMapEnemies(data.enemies, enemyRecipes, legacyEnemies);
  } catch (error) {
    alert(error.message);
    return;
  }
  const source = {
    ...data,
    imageWidth: image.naturalWidth,
    imageHeight: image.naturalHeight,
    origin: { x: grid().x, y: grid().y },
    tileSize: grid().size,
    walls: [...wallCells].map((cell) => {
      const [x, y] = coordinates(cell);
      return { x, y };
    }),
    trees: data.trees.map((tree) => ({
      ...tree,
      trunk: [...trunkCells]
        .filter(([, id]) => id === tree.id)
        .map(([cell]) => coordinates(cell)),
    })),
    spawns: data.spawns,
    chests: data.chests,
    interactables: data.interactables,
    enemies: data.enemies,
  };
  delete source.wallRects;
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(source, null, 2) + "\n"], {
      type: "application/json",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "collision.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$("png").onchange = (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const url = URL.createObjectURL(file),
    next = new Image();
  next.onload = () => {
    image = next;
    data.image = file.name;
    render();
    URL.revokeObjectURL(url);
  };
  next.src = url;
};
$("json").onchange = async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    importData(JSON.parse(await file.text()));
  } catch (error) {
    alert(error.message);
  }
};
async function start() {
  $("items").replaceChildren(
    ...Object.entries(itemDefinitions).map(
      ([id, item]) =>
        new Option(`${item.name} · ${item.allowedClasses.join(", ")}`, id),
    ),
  );
  for (const id of ["enemy-type", "entity-archetype"])
    $(id).replaceChildren(
      ...Object.entries(enemyRecipes).map(
        ([key, recipe]) => new Option(`${recipe.name} (${key})`, key),
      ),
    );
  const source = await (await fetch("/assets/mapas/collision.json")).json();
  image.onload = () => {
    render();
    const viewport = $("viewport");
    viewport.scrollLeft =
      source.origin.x * Number($("zoom").value) - viewport.clientWidth / 2;
    viewport.scrollTop =
      source.origin.y * Number($("zoom").value) - viewport.clientHeight / 2;
  };
  image.src = "/assets/mapas/Scene_Overview.png";
  const layers = await (await fetch("/assets/mapas/generated/trees.json"))
    .json()
    .catch(() => []);
  for (const layer of layers) {
    const picture = new Image();
    picture.onload = render;
    picture.src = `/assets/${layer.image}`;
    treeImages.set(layer.id, picture);
  }
  importData(source);
}
start().catch((error) => {
  $("status").textContent = error.message;
});
