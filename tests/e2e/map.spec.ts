import { test, expect } from "@playwright/test";
test("recupera el mapa aunque fallen metadatos de animación", async ({
  browser,
  baseURL,
}) => {
  const contexts = [];
  const hostContext = await browser.newContext();
  contexts.push(hostContext);
  const host = await hostContext.newPage();
  const errors: string[] = [];
  host.on("pageerror", (e) => errors.push(e.message));
  let failMap = true;
  await host.route("**/assets/mapas/generated/courtyard.webp", (route) =>
    failMap ? route.abort() : route.continue(),
  );
  await host.route("**/assets/paladin/generated/animations.json", (route) =>
    route.fulfill({ status: 503, body: "unavailable" }),
  );
  try {
    await host.goto(baseURL!);
    await host.getByRole("button", { name: "Crear una partida" }).click();
    const code = await host.getByTestId("room-code").innerText();
    for (const name of ["Mapa Uno", "Mapa Dos"]) {
      const context = await browser.newContext();
      contexts.push(context);
      const page = await context.newPage();
      await page.goto(baseURL + "/#/join/" + code);
      await page.getByLabel("Nombre del viajero").fill(name);
      await page.getByRole("radio").first().click();
      await page.getByRole("button", { name: "Sentarme a la mesa" }).click();
      await expect(
        page.getByText(name + ", tu lugar está reservado."),
      ).toBeVisible();
    }
    await host.getByRole("button", { name: "Comenzar la aventura" }).click();
    await expect(
      host.getByRole("button", { name: "Reintentar gráficos" }),
    ).toBeVisible();
    failMap = false;
    const response = host.waitForResponse(
      (r) => r.url().endsWith("/courtyard.webp") && r.status() === 200,
    );
    await host.getByRole("button", { name: "Reintentar gráficos" }).click();
    await response;
    await expect(host.locator(".game-canvas")).toHaveAttribute(
      "data-board-status",
      "ready",
    );
    await expect(host.locator("canvas")).toHaveCount(1);
    expect(errors).toEqual([]);
    await host.screenshot({ path: "artifacts/map-recovered.png" });
  } finally {
    for (const context of contexts) await context.close();
  }
});
