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
    await fitsViewport(phone, ".controller-footer");
    await fitsViewport(phone, ".attack-panel .special-actions");
    await fitsViewport(phone, ".movement-panel .dpad");
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
  await phone.getByRole("button", { name: "Mover arriba" }).click();
  const nearbyChest = phone.getByRole("button", {
    name: "Interactuar: Cofre sellado",
  });
  await expect(nearbyChest).toBeVisible();
  await expect(nearbyChest).toBeEnabled({ timeout: 10_000 });
  await fitsViewport(phone, ".nearby-actions");
  await phone.screenshot({ path: "artifacts/controller-nearby-360.png" });
  for (const page of phones) await page.close();
  await host.close();
});
