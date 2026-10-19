import { test, expect } from "@playwright/test";

test("cuatro clases únicas y tablero que llena su contenedor", async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(120_000);
  const host = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  await host.goto(baseURL!);
  await host.getByRole("button", { name: "Crear una partida" }).click();
  const code = await host.getByTestId("room-code").innerText();
  const players = [];
  for (const [index, name] of ["Ada", "Bruno", "Cira", "Dara"].entries()) {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    players.push(page);
    await page.goto(`${baseURL}/#/join/${code}`);
    await page.getByRole("radio").nth(index).click();
    await page.getByLabel("Nombre del viajero").fill(name);
    await page.getByRole("button", { name: "Sentarme a la mesa" }).click();
    await expect(
      page.getByText(`${name}, tu lugar está reservado.`),
    ).toBeVisible();
  }
  await expect(host.getByRole("heading", { name: "Dara" })).toBeVisible();
  await host.getByRole("button", { name: "Comenzar la aventura" }).click();
  await expect(host.locator('[data-board-status="ready"]')).toBeVisible();
  await expect(players[3].getByText("Arquera · NIVEL 1")).toBeVisible();
  await expect(players[3].getByText("Enfoque")).toBeVisible();
  const fillsPanel = await host.locator(".board-panel").evaluate((panel) => {
    const canvas = panel.querySelector("canvas");
    if (!canvas) return false;
    const bounds = panel.getBoundingClientRect();
    const image = canvas.getBoundingClientRect();
    return (
      Math.abs(bounds.width - image.width) <= 1 &&
      Math.abs(bounds.height - image.height) <= 1
    );
  });
  expect(fillsPanel).toBe(true);
  for (const page of players) await page.close();
  await host.close();
});
