import { expect, test, type Page } from "@playwright/test";

async function recordTableSounds(page: Page) {
  await page.addInitScript(() => {
    const state = window as typeof window & { __tableSfxStarts: number[] };
    state.__tableSfxStarts = [];
    const original = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      state.__tableSfxStarts.push(performance.now());
      return original.apply(this, args);
    };
  });
}

async function soundStarts(page: Page) {
  return page.evaluate(
    () =>
      (window as typeof window & { __tableSfxStarts: number[] })
        .__tableSfxStarts.length,
  );
}

test("equipar muestra el efecto y reproduce audio sólo en la mesa", async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(240_000);
  const host = await browser.newPage();
  const one = await browser.newPage();
  const two = await browser.newPage();
  const errors: string[] = [];
  for (const page of [host, one, two]) {
    await recordTableSounds(page);
    page.on("pageerror", (error) => errors.push(error.message));
  }

  await host.goto(baseURL!);
  await host.getByRole("button", { name: "Crear una partida" }).click();
  const code = await host.getByTestId("room-code").innerText();
  for (const [page, name, classIndex] of [
    [one, "Ada", 0],
    [two, "Bea", 1],
  ] as const) {
    await page.goto(`${baseURL}/#/join/${code}`);
    await page.getByLabel("Nombre del viajero").fill(name);
    await page.getByRole("radio").nth(classIndex).click();
    await page.getByRole("button", { name: "Sentarme a la mesa" }).click();
  }

  await host.getByRole("button", { name: "Comenzar la aventura" }).click();
  const readyBoard = host.locator('.game-canvas[data-board-status="ready"]');
  for (let attempt = 0; attempt < 3; attempt++) {
    if (await readyBoard.isVisible()) break;
    const retry = host.getByRole("button", { name: "Reintentar gráficos" });
    await expect
      .poll(async () => (await readyBoard.isVisible()) || (await retry.isVisible()), {
        timeout: 20_000,
      })
      .toBe(true);
    if (await retry.isVisible()) await retry.click();
  }
  await expect(readyBoard).toBeVisible({ timeout: 45_000 });
  await host.getByRole("button", { name: "Opciones de la mesa" }).click();
  const activateAudio = host.getByRole("button", {
    name: "Activar sonido de la mesa",
  });
  if (await activateAudio.isVisible()) await activateAudio.click();
  await expect(activateAudio).toHaveCount(0);
  await host.locator(".table-menu-backdrop").click();

  await one.getByRole("tab", { name: /Inventario/ }).click();
  await two.getByRole("tab", { name: /Inventario/ }).click();
  const activeName = await host.locator(".party-bar article.active h2").innerText();
  const activePhone = activeName === "Ada" ? one : two;
  await activePhone.locator(".bag-slot").filter({ hasText: "Botas de viaje" }).click();
  await activePhone
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmar equipar", exact: true })
    .click();

  await expect(host.locator(".event-log")).toContainText(
    `${activeName} equipa Botas de viaje`,
  );
  await host.screenshot({
    path: "artifacts/table-equip-effect.png",
    fullPage: true,
  });
  await expect(activePhone.locator(".equipment-slot-boots")).toContainText(
    "Botas de viaje",
  );
  await expect.poll(() => soundStarts(host)).toBe(1);
  expect(await soundStarts(one)).toBe(0);
  expect(await soundStarts(two)).toBe(0);
  expect(errors).toEqual([]);

  await host.close();
  await one.close();
  await two.close();
});
