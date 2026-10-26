import { expect, test } from "@playwright/test";

test("la mesa online conserva controles separados y el enlace al comenzar", async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(100_000);
  const hostContext = await browser.newContext();
  const firstContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const secondContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  try {
    const host = await hostContext.newPage();
    const first = await firstContext.newPage();
    const second = await secondContext.newPage();
    await host.goto(baseURL!);
    await host.getByRole("button", { name: "Crear partida online" }).click();
    await expect(
      host.getByText("Compartí esta pantalla por videollamada"),
    ).toBeVisible();
    const code = await host.getByTestId("room-code").innerText();
    const publicOrigin = "https://mesa.trycloudflare.com";
    await host
      .getByLabel("Dirección pública para controles")
      .fill(publicOrigin);
    const invitation = `${publicOrigin}/#/join/${code}`;
    await expect(host.locator(".invitation-url")).toHaveAttribute(
      "href",
      invitation,
    );

    for (const [page, index, name] of [
      [first, 0, "Ada"],
      [second, 1, "Bruno"],
    ] as const) {
      await page.goto(`${baseURL}/#/join/${code}`);
      await page.getByRole("radio").nth(index).click();
      await page.getByLabel("Nombre del viajero").fill(name);
      await page.getByRole("button", { name: "Sentarme a la mesa" }).click();
      await expect(
        page.getByText(`${name}, tu lugar está reservado.`),
      ).toBeVisible();
    }
    await host.getByRole("button", { name: "Comenzar la aventura" }).click();
    await expect(host.locator(".game-canvas")).toHaveAttribute(
      "data-board-status",
      "ready",
      { timeout: 45_000 },
    );
    await host.getByRole("button", { name: "Opciones de la mesa" }).click();
    await expect(host.getByText(`MESA ONLINE ${code}`)).toBeVisible();
    await expect(
      host.getByLabel("Dirección pública para controles"),
    ).toHaveValue(publicOrigin);
    await expect(
      host.getByRole("button", { name: "Copiar invitación" }),
    ).toBeVisible();
    await host.keyboard.press("Escape");

    await first.reload();
    await expect(first.getByRole("heading", { name: "Ada" })).toBeVisible();
    await expect(first.locator(".game-canvas")).toHaveCount(0);
    await expect(host.locator(".party-bar article")).toHaveCount(2);
  } finally {
    await Promise.all([
      hostContext.close(),
      firstContext.close(),
      secondContext.close(),
    ]);
  }
});
