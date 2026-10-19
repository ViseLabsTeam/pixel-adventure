import { test, expect } from "@playwright/test";

test("el mago reproduce W al subir y S al bajar tras el D6", async ({
  browser,
  baseURL,
}) => {
  const hostContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const mageContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const allyContext = await browser.newContext();
  const host = await hostContext.newPage();
  const mage = await mageContext.newPage();
  const ally = await allyContext.newPage();
  const errors: string[] = [];
  for (const page of [host, mage, ally])
    page.on("pageerror", (error) => errors.push(error.message));
  try {
    await host.goto(baseURL!);
    await host.getByRole("button", { name: "Crear una partida" }).click();
    const code = await host.getByTestId("room-code").innerText();
    for (const [page, name, classIndex] of [
      [mage, "Mago Uno", 2],
      [ally, "Aliado Dos", 0],
    ] as const) {
      await page.goto(`${baseURL}/#/join/${code}`);
      await page.getByLabel("Nombre del viajero").fill(name);
      await page.getByRole("radio").nth(classIndex).click();
      await page.getByRole("button", { name: "Sentarme a la mesa" }).click();
      await expect(
        page.getByText(`${name}, tu lugar está reservado.`),
      ).toBeVisible();
    }
    await host.getByRole("button", { name: "Comenzar la aventura" }).click();
    await expect(
      host.locator('.game-canvas[data-board-status="ready"]'),
    ).toBeVisible();
    await mage.getByRole("button", { name: "Tirar movimiento" }).click();
    await expect(
      mage.locator('.dice-presentation img[src*="D6.gif"]'),
    ).toBeVisible();
    await mage.screenshot({
      path: "artifacts/dice-roll-mobile.png",
      fullPage: true,
    });
    await expect(
      mage.getByRole("button", { name: "Mover arriba" }),
    ).toBeDisabled();
    await expect(
      mage.getByRole("button", { name: "Mover arriba" }),
    ).toBeEnabled();

    await mage.getByRole("button", { name: "Mover arriba" }).click();
    await expect(
      host.getByRole("img", { name: /Mago Uno: casilla 2,7/ }),
    ).toBeVisible();
    await expect(
      mage.getByRole("button", { name: "Mover abajo" }),
    ).toBeDisabled();
    await host
      .locator(".game-canvas")
      .screenshot({ path: "artifacts/mage-walk-up.png" });
    await expect(
      mage.getByRole("button", { name: "Mover abajo" }),
    ).toBeEnabled();

    await mage.getByRole("button", { name: "Mover abajo" }).click();
    await expect(
      host.getByRole("img", { name: /Mago Uno: casilla 2,8/ }),
    ).toBeVisible();
    await host
      .locator(".game-canvas")
      .screenshot({ path: "artifacts/mage-walk-down.png" });
    await expect(
      mage.getByRole("button", { name: "Terminar movimiento" }),
    ).toBeEnabled();
    expect(errors).toEqual([]);
  } finally {
    await hostContext.close();
    await mageContext.close();
    await allyContext.close();
  }
});
