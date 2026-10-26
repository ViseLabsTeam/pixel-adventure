import { expect, test } from "@playwright/test";

test("la mesa muestra cuatro personajes sobre un mapa de ventana completa", async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(90_000);
  const host = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  const phones = await Promise.all(
    Array.from({ length: 4 }, () =>
      browser.newPage({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      }),
    ),
  );
  try {
    await host.goto(baseURL!);
    await host.getByRole("button", { name: "Crear una partida" }).click();
    const code = await host.getByTestId("room-code").innerText();
    for (const [index, phone] of phones.entries()) {
      await phone.goto(`${baseURL}/#/join/${code}`);
      await phone.getByRole("radio").nth(index).click();
      await phone.getByLabel("Nombre del viajero").fill(`Viajero ${index + 1}`);
      await phone.getByRole("button", { name: "Sentarme a la mesa" }).click();
    }
    await expect(host.getByText("4 / 4 viajeros")).toBeVisible();
    await expect(
      host.getByRole("heading", { name: "Viajero 4" }),
    ).toBeVisible();
    await host.getByRole("button", { name: "Comenzar la aventura" }).click();
    const board = host.locator(".game-canvas");
    await expect(board).toHaveAttribute("data-board-status", "ready", {
      timeout: 45_000,
    });
    const cards = host.locator(".table-hud .party-bar article");
    await expect(cards).toHaveCount(4);

    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 720, height: 300 },
    ]) {
      await host.setViewportSize(viewport);
      const bounds = await board.boundingBox();
      expect(bounds?.x).toBe(0);
      expect(bounds?.y).toBe(0);
      expect(bounds?.width).toBe(viewport.width);
      expect(bounds?.height).toBe(viewport.height);
      const layout = await host
        .locator(".table-hud .party-bar")
        .evaluate((bar) => ({
          scrollWidth: bar.scrollWidth,
          clientWidth: bar.clientWidth,
          rows: [...bar.children].map(
            (card) => card.getBoundingClientRect().top,
          ),
        }));
      expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
      expect(new Set(layout.rows).size).toBe(1);
    }
  } finally {
    await Promise.all([...phones, host].map((page) => page.close()));
  }
});
