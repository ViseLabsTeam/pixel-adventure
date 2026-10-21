import { expect, test } from "@playwright/test";

test("el tablero carga los personajes y las capas del mapa", async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(150_000);
  const host = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  const failedAssets: string[] = [];
  host.on("response", (response) => {
    if (response.status() >= 400 && response.url().includes("/assets/"))
      failedAssets.push(`${response.status()} ${response.url()}`);
  });
  await host.goto(baseURL!);
  await host.getByRole("button", { name: "Crear una partida" }).click();
  const code = await host.getByTestId("room-code").innerText();
  const phones = [];
  for (const [index, name] of ["Ada", "Bruno"].entries()) {
    const phone = await browser.newPage();
    phones.push(phone);
    await phone.goto(`${baseURL}/#/join/${code}`);
    await phone.getByRole("radio").nth(index).click();
    await phone.getByLabel("Nombre del viajero").fill(name);
    await phone.getByRole("button", { name: "Sentarme a la mesa" }).click();
  }
  await host.getByRole("button", { name: "Comenzar la aventura" }).click();
  const board = host.locator(".game-canvas");
  await expect(board).toHaveAttribute("data-board-status", "ready", {
    timeout: 45_000,
  });
  await expect(board.locator("canvas")).toBeVisible();
  await expect(board).toHaveAttribute("aria-label", /Ada: casilla 9,-18/);
  expect(failedAssets).toEqual([]);
  await host.screenshot({ path: "artifacts/board-graphics.png" });
  await Promise.all(phones.map((phone) => phone.close()));
  await host.close();
});
