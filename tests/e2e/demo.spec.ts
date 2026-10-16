import { test, expect } from "@playwright/test";
test("pantalla compartida, cuatro controles, inventario y recarga", async ({
  browser,
  baseURL,
}) => {
  const hostContext = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    host = await hostContext.newPage();
  const errors: string[] = [];
  host.on("pageerror", (e) => errors.push(e.message));
  await host.goto(baseURL!);
  await expect(
    host.getByRole("heading", { name: /Toda aventura/ }),
  ).toBeVisible();
  await host
    .getByRole("button", { name: "Configuración", exact: true })
    .click();
  await host.getByLabel("Reducir movimiento", { exact: true }).check();
  await host.getByRole("button", { name: "Guardar y volver" }).click();
  await host.reload();
  await host
    .getByRole("button", { name: "Configuración", exact: true })
    .click();
  await expect(
    host.getByLabel("Reducir movimiento", { exact: true }),
  ).toBeChecked();
  await host.getByLabel("Reducir movimiento", { exact: true }).uncheck();
  await host.getByRole("button", { name: "Guardar y volver" }).click();
  await host.screenshot({ path: "artifacts/home-desktop.png", fullPage: true });
  await host.getByRole("button", { name: "Crear una partida" }).click();
  await expect(
    host.getByRole("heading", { name: "La mesa está servida." }),
  ).toBeVisible();
  const code = await host.getByTestId("room-code").innerText();
  const controls = [];
  for (const [index, name] of ["Ada", "Bruno", "Cira", "Dante"].entries()) {
    const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      }),
      page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    controls.push({ context, page });
    await page.goto(baseURL + "/#/join/" + code);
    await expect(page.getByRole("radio")).toHaveCount(3);
    await page.getByLabel("Nombre del viajero").fill(name);
    await page
      .getByRole("radio")
      .nth(index % 3)
      .click();
    await page.getByRole("button", { name: "Sentarme a la mesa" }).click();
    await expect(
      page.getByText(name + ", tu lugar está reservado."),
    ).toBeVisible();
  }
  await expect(
    host.getByRole("button", { name: "Comenzar la aventura" }),
  ).toBeEnabled();
  await host.screenshot({
    path: "artifacts/lobby-desktop.png",
    fullPage: true,
  });
  await host.getByRole("button", { name: "Comenzar la aventura" }).click();
  await expect(
    host.getByRole("img", { name: /Tablero por casillas/ }),
  ).toBeVisible();
  await expect(host.locator("canvas")).toHaveCount(1);
  await host.setViewportSize({ width: 1366, height: 768 });
  const compactBounds = await host.locator(".board-panel").boundingBox();
  expect(compactBounds!.y).toBe(0);
  expect(compactBounds!.height).toBeGreaterThanOrEqual(767);
  expect(compactBounds!.x).toBeGreaterThan(250);
  expect(compactBounds!.y + compactBounds!.height).toBeLessThanOrEqual(768);
  await host.setViewportSize({ width: 1440, height: 1000 });
  const boardBounds = await host.locator(".board-panel").boundingBox();
  expect(boardBounds!.y + boardBounds!.height).toBeLessThanOrEqual(1000);
  const one = controls[0].page,
    two = controls[1].page;
  await expect(
    one.getByRole("button", { name: /Tirar movimiento/ }),
  ).toBeEnabled();
  await expect(
    two.getByRole("button", { name: /Tirar movimiento/ }),
  ).toBeDisabled();
  await expect(
    one.getByRole("progressbar", { name: "Fe", exact: true }),
  ).toHaveAttribute("aria-valuenow", "100");
  await expect(
    one.getByRole("button", { name: /Ulti · consume/ }),
  ).toBeDisabled();
  await expect(one.locator("canvas")).toHaveCount(0);
  await expect(one.locator(".bag-slot")).toHaveCount(4);
  await expect(one.locator(".equipment-slot")).toHaveCount(4);
  await one.getByRole("button", { name: /Tirar movimiento/ }).click();
  await expect(one.getByRole("button", { name: /d6 ·/ })).toBeDisabled();
  const rolled = await one.locator(".dice-button b").innerText();
  await one.getByRole("button", { name: "Mover arriba" }).click();
  await expect(
    host.getByRole("img", { name: /Ada: casilla 2,7/ }),
  ).toBeVisible();
  await one.reload();
  await expect(one.locator(".dice-button b")).toHaveText(rolled);
  await expect(one.locator(".error-banner")).toHaveCount(0);
  await one.screenshot({
    path: "artifacts/controller-mobile.png",
    fullPage: true,
  });
  await host.screenshot({
    path: "artifacts/board-desktop.png",
    fullPage: true,
  });
  await one.getByRole("button", { name: /Pantalones de viaje/ }).click();
  await expect(
    one.locator(".equipment-slot").filter({ hasText: "Pantalones de viaje" }),
  ).toHaveCount(1);
  await expect(
    one.getByRole("button", { name: "Mover arriba" }),
  ).toBeDisabled();
  await one.getByRole("button", { name: "Finalizar turno" }).click();
  await expect(
    two.getByRole("button", { name: /Tirar movimiento/ }),
  ).toBeEnabled();
  await two.getByRole("button", { name: /Tirar movimiento/ }).click();
  await two.getByRole("button", { name: "Mover arriba" }).click();
  await expect(
    host.getByRole("img", { name: /Bruno: casilla 3,7/ }),
  ).toBeVisible();
  await two.getByRole("button", { name: "Mover arriba" }).click();
  await expect(
    host.getByRole("img", { name: /Bruno: casilla 3,6/ }),
  ).toBeVisible();
  await two.getByRole("button", { name: /Corte furioso/ }).click();
  await expect(
    two.getByRole("progressbar", { name: "Furia", exact: true }),
  ).toHaveAttribute("aria-valuenow", "0");
  await expect(
    host
      .locator("[data-player-id]")
      .nth(1)
      .getByRole("progressbar", { name: "Furia", exact: true }),
  ).toHaveAttribute("aria-valuenow", "0");
  await host.screenshot({ path: "artifacts/attack-desktop.png" });
  await expect(one.locator("body")).toHaveJSProperty("scrollWidth", 390);
  expect(errors).toEqual([]);
  for (const c of controls) await c.context.close();
  await hostContext.close();
});
