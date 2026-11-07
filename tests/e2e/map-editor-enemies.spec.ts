import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

async function cellPosition(page: Page, x: number, y: number) {
  return page.evaluate(
    ({ x, y }) => {
      const input = (id: string) =>
        Number((document.getElementById(id) as HTMLInputElement).value);
      const zoom = input("zoom"),
        size = input("tile");
      const px = (input("origin-x") + (x + 0.5) * size) * zoom;
      const py = (input("origin-y") + (y + 0.5) * size) * zoom;
      const viewport = document.getElementById("viewport")!;
      viewport.scrollLeft = px - viewport.clientWidth / 2;
      viewport.scrollTop = py - viewport.clientHeight / 2;
      const rect = document.getElementById("map")!.getBoundingClientRect();
      return { x: rect.x + px, y: rect.y + py, step: size * zoom };
    },
    { x, y },
  );
}

test("agrega goblin archer y conserva su tipo al exportar e importar", async ({
  page,
}) => {
  test.skip(!process.env.MAP_EDITOR_URL, "Requiere el editor local con Vite.");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(process.env.MAP_EDITOR_URL!);
  const initial = JSON.parse(
    await readFile("assets/mapas/collision.json", "utf8"),
  );
  await expect(page.locator("#status")).toContainText(
    `${initial.enemies.length} enemigos`,
  );
  await page.locator("#json").setInputFiles({
    name: "archer-map.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ ...initial, enemies: [] })),
  });
  await expect(page.locator("#status")).toContainText("0 enemigos");
  await page.locator("#tool").selectOption("enemy");
  await page.locator("#enemy-type").selectOption("goblin-archer");
  const position = await cellPosition(page, -3, -3);
  await page.mouse.click(position.x, position.y);
  await expect(page.locator("#entity-id")).toHaveValue("goblin-archer-1");
  await expect(page.locator("#entity-archetype")).toHaveValue("goblin-archer");
  const download = page.waitForEvent("download");
  await page.locator("#export").click();
  const exported = JSON.parse(
    await readFile((await (await download).path())!, "utf8"),
  );
  expect(exported.enemies).toEqual([
    { id: "goblin-archer-1", archetypeId: "goblin-archer", x: -3, y: -3 },
  ]);
  await page.locator("#json").setInputFiles({
    name: "archer-roundtrip.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(exported)),
  });
  await page.locator("#enemy-list").selectOption("goblin-archer-1");
  await expect(page.locator("#entity-archetype")).toHaveValue("goblin-archer");
  await expect(page.locator("#entity-x")).toHaveValue("-3");
  await page.screenshot({ path: "artifacts/map-editor-goblin-archer.png" });
  expect(errors).toEqual([]);
});

test("edita enemigos, arrastra y conserva el JSON", async ({ page }) => {
  test.skip(!process.env.MAP_EDITOR_URL, "Requiere el editor local con Vite.");
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(process.env.MAP_EDITOR_URL!);
  const initial = JSON.parse(
    await readFile("assets/mapas/collision.json", "utf8"),
  );
  await expect(page.locator("#status")).toContainText(
    `${initial.enemies.length} enemigos`,
  );
  const importMap = async (data: unknown) =>
    page.locator("#json").setInputFiles({
      name: "test-map.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(data)),
    });
  const exportMap = async () => {
    const download = page.waitForEvent("download");
    await page.locator("#export").click();
    return JSON.parse(await readFile((await (await download).path())!, "utf8"));
  };
  await importMap({ ...initial, enemies: [] });
  await expect(page.locator("#status")).toContainText("0 enemigos");
  await page.locator("#tool").selectOption("enemy");
  await page.locator("#enemy-type").selectOption("goblin");
  const first = await cellPosition(page, -3, -3);
  await page.mouse.click(first.x, first.y);
  await expect(page.locator("#entity-id")).toHaveValue("goblin-1");
  await page.mouse.move(first.x, first.y);
  await page.mouse.down();
  await page.mouse.move(first.x + first.step * 2, first.y + first.step, {
    steps: 5,
  });
  await page.mouse.up();
  await expect(page.locator("#entity-x")).toHaveValue("-1");
  await expect(page.locator("#entity-y")).toHaveValue("-2");
  const second = await cellPosition(page, -5, -3);
  await page.mouse.click(second.x, second.y);
  await expect(page.locator("#entity-id")).toHaveValue("goblin-2");
  await page.locator("#enemy-list").selectOption("goblin-1");
  await page.locator("#entity-archetype").selectOption("wisp");
  await page.locator("#entity-x").fill("-2");
  await page.locator("#entity-x").press("Tab");
  const exported = await exportMap();
  expect(exported.enemies).toEqual([
    { id: "goblin-1", archetypeId: "wisp", x: -2, y: -2 },
    { id: "goblin-2", archetypeId: "goblin", x: -5, y: -3 },
  ]);
  await importMap(exported);
  await page.locator("#enemy-list").selectOption("goblin-2");
  await expect(page.locator("#entity-x")).toHaveValue("-5");
  await expect(page.locator("#entity-archetype")).toHaveValue("goblin");
  await page.locator("#delete-placement").click();
  await expect(page.locator("#status")).toContainText("1 enemigos");
  await page.screenshot({ path: "artifacts/map-editor-enemies.png" });
  const legacy = { ...initial };
  delete legacy.enemies;
  await importMap(legacy);
  await expect(page.locator("#status")).toContainText("3 enemigos");
  expect((await exportMap()).enemies).toEqual(
    JSON.parse(await readFile("assets/mapas/legacy-enemies.json", "utf8")),
  );
  expect(errors).toEqual([]);
});
