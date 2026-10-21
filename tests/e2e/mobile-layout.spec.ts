import { test, expect, type Page } from "@playwright/test";

async function fitsViewport(page: Page, selector: string) {
  const layout = await page.locator(selector).evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top,
      bottom: rect.bottom,
      containerBottom: element.closest(".panel")?.getBoundingClientRect()
        .bottom,
      viewport: window.innerHeight,
      scrollHeight: document.documentElement.scrollHeight,
      scrollWidth: document.documentElement.scrollWidth,
      width: window.innerWidth,
    };
  });
  expect(layout.top).toBeGreaterThanOrEqual(0);
  expect(layout.bottom).toBeLessThanOrEqual(layout.viewport + 1);
  if (layout.containerBottom !== undefined)
    expect(layout.bottom).toBeLessThanOrEqual(layout.containerBottom + 1);
  expect(layout.scrollHeight).toBeLessThanOrEqual(layout.viewport + 1);
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.width + 1);
}

test("control móvil sin desplazamiento en personaje e inventario", async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(120_000);
  const host = await browser.newPage();
  await host.goto(baseURL!);
  await host.getByRole("button", { name: "Crear una partida" }).click();
  const code = await host.getByTestId("room-code").innerText();
  const phones = [];
  for (const [index, name] of ["Ada", "Bruno"].entries()) {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    phones.push(page);
    await page.goto(`${baseURL}/#/join/${code}`);
    await page.getByRole("radio").nth(index).click();
    await page.getByLabel("Nombre del viajero").fill(name);
    await page.getByRole("button", { name: "Sentarme a la mesa" }).click();
  }
  await host.getByRole("button", { name: "Comenzar la aventura" }).click();
  const phone = phones[0];
  for (const [width, height] of [
    [390, 844],
    [375, 720],
    [360, 640],
  ]) {
    await phone.setViewportSize({ width, height });
    await expect(phone.getByRole("tab", { name: "Personaje" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(phone.getByText("A tu alrededor")).toHaveCount(0);
    await expect(
      phone.getByRole("progressbar", { name: "Vida" }),
    ).toHaveAttribute("aria-valuemax", "60");
    await expect(phone.getByTitle("Daño físico: 4 de 10")).toBeVisible();
    await expect(phone.locator(".quick-items button")).toHaveCount(4);
    const potions = await phone
      .locator(".quick-items button")
      .evaluateAll((buttons) =>
        buttons.map((button) => {
          const rect = button.getBoundingClientRect();
          return { x: rect.x, y: rect.y };
        }),
      );
    expect(potions[0].x).toBeLessThan(potions[1].x);
    expect(potions[0].y).toBe(potions[1].y);
    expect(potions[1].x).toBeLessThan(potions[2].x);
    expect(potions[2].x).toBeLessThan(potions[3].x);
    expect(potions[2].y).toBe(potions[0].y);
    await expect(
      phone.getByRole("button", { name: /Terminar movimiento/ }),
    ).toHaveCount(0);
    await expect(phone.locator(".character-card > img")).toHaveAttribute(
      "src",
      /idle-portrait\.webp/,
    );
    const characterOrder = await phone
      .locator(".character-card, .movement-panel, .attack-panel")
      .evaluateAll((elements) =>
        elements.map((element) => element.getBoundingClientRect().top),
      );
    expect(characterOrder).toEqual([...characterOrder].sort((a, b) => a - b));
    const panels = await phone
      .locator(".control-columns > .panel")
      .evaluateAll((elements) =>
        elements.map((element) => {
          const rect = element.getBoundingClientRect();
          return { x: rect.x, y: rect.y, right: rect.right };
        }),
      );
    expect(Math.abs(panels[0].y - panels[1].y)).toBeLessThan(2);
    expect(panels[0].right).toBeLessThan(panels[1].x);
    const potionTop = await phone
      .locator(".potion-panel")
      .evaluate((element) => element.getBoundingClientRect().top);
    const controlsBottom = await phone
      .locator(".control-columns")
      .evaluate((element) => element.getBoundingClientRect().bottom);
    expect(potionTop).toBeGreaterThan(controlsBottom);
    await expect(phone.locator(".target-list button")).toHaveCount(0);
    await expect(phone.locator(".target-list")).toContainText(
      "No percibís enemigos a 6 casillas",
    );
    await fitsViewport(phone, ".controller-footer");
    await fitsViewport(phone, ".attack-panel .special-actions");
    await expect(
      phone.getByRole("button", { name: /Tirar D20/ }),
    ).toBeDisabled();
    await expect(
      phone.getByRole("button", { name: /Tirar D6 para terminar/ }),
    ).toBeDisabled();
    await fitsViewport(phone, ".attack-dice-pair");
    const diceLayout = await phone
      .locator(".dice-button, .attack-die, .dpad")
      .evaluateAll((elements) =>
        elements.map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            x: rect.x,
            y: rect.y,
            right: rect.right,
            bottom: rect.bottom,
          };
        }),
      );
    expect(diceLayout[0].bottom).toBeLessThanOrEqual(diceLayout[1].y);
    expect(diceLayout[2].right).toBeLessThan(diceLayout[3].x);
    await fitsViewport(phone, ".movement-panel .dpad");
    await fitsViewport(phone, ".potion-panel .quick-items");
    const directionSize = await phone
      .getByRole("button", { name: "Mover arriba" })
      .evaluate((element) => element.getBoundingClientRect().height);
    expect(directionSize).toBeGreaterThanOrEqual(42);
    if (width === 390)
      expect(
        await phone
          .locator(".character-card > img")
          .evaluate((element) => element.getBoundingClientRect().height),
      ).toBeGreaterThan(120);
    await phone.screenshot({
      path: `artifacts/controller-character-${width}.png`,
    });
    await phone.getByRole("tab", { name: /Inventario/ }).click();
    await expect(phone.locator(".bag-slot:visible")).toHaveCount(4);
    await expect(phone.locator(".equipment-slot:visible")).toHaveCount(4);
    const slots = await phone.locator(".equipment-grid").evaluate((grid) =>
      Object.fromEntries(
        ["helmet", "chest", "weapon", "boots"].map((slot) => {
          const rect = grid
            .querySelector(`.equipment-slot-${slot}`)!
            .getBoundingClientRect();
          return [slot, { x: rect.x, y: rect.y }];
        }),
      ),
    );
    expect(slots.helmet.y).toBeLessThan(slots.chest.y);
    expect(slots.weapon.x).toBeGreaterThan(slots.chest.x);
    expect(slots.weapon.y).toBe(slots.chest.y);
    expect(slots.boots.y).toBeGreaterThan(slots.chest.y);
    expect(slots.boots.x).toBe(slots.chest.x);
    const bagBottom = await phone
      .locator(".bag-grid")
      .evaluate((element) => element.getBoundingClientRect().bottom);
    const equipmentTop = await phone
      .locator(".equipment-stage")
      .evaluate((element) => element.getBoundingClientRect().top);
    expect(equipmentTop).toBeGreaterThan(bagBottom);
    await fitsViewport(phone, ".inventory .equipment-grid");
    if (width === 390)
      expect(
        await phone
          .locator(".inventory-portrait img")
          .evaluate((element) => element.getBoundingClientRect().height),
      ).toBeGreaterThan(120);
    await phone.screenshot({
      path: `artifacts/controller-inventory-${width}.png`,
    });
    await phone.getByRole("tab", { name: "Personaje" }).click();
  }
  await phone.getByRole("button", { name: /Tirar movimiento/ }).click();
  const overlay = phone.getByTestId("character-dice-overlay");
  await expect(overlay).toBeVisible();
  const coversCard = await phone.evaluate(() => {
    const overlay = document
      .querySelector(".character-dice-overlay")!
      .getBoundingClientRect();
    const card = document
      .querySelector(".character-card")!
      .getBoundingClientRect();
    return overlay.top <= card.top && overlay.bottom >= card.bottom;
  });
  expect(coversCard).toBe(true);
  await expect(overlay.locator(".dice-presentation strong")).toContainText(
    /d6:/,
    { timeout: 15_000 },
  );
  await expect(overlay).toHaveCount(0, { timeout: 10_000 });
  await Promise.all(phones.map((page) => page.close()));
  await host.close();
});
