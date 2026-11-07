import { expect, test, type Locator } from "@playwright/test";

async function cameraState(board: Locator) {
  return board.evaluate((element) => {
    const attribute = (name: string) => Number(element.getAttribute(name));
    const canvas = element.querySelector("canvas");
    if (!canvas) throw new Error("El tablero no tiene canvas");
    const bounds = canvas.getBoundingClientRect();
    return {
      zoom: attribute("data-camera-zoom"),
      left: attribute("data-camera-left"),
      top: attribute("data-camera-top"),
      worldWidth: attribute("data-camera-world-width"),
      worldHeight: attribute("data-camera-world-height"),
      canvasWidth: bounds.width,
      canvasHeight: bounds.height,
    };
  });
}

test("la mesa centra el respawn, amplía la vista y sigue la exploración", async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(180_000);
  const host = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  const phone = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const secondPhone = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  try {
    await host.goto(baseURL!);
    await host.getByRole("button", { name: "Crear una partida" }).click();
    const code = await host.getByTestId("room-code").innerText();
    for (const [page, index, name] of [
      [phone, 0, "Ada"],
      [secondPhone, 1, "Bruno"],
    ] as const) {
      await page.goto(`${baseURL}/#/join/${code}`);
      await page.getByRole("radio").nth(index).click();
      await page.getByLabel("Nombre del viajero").fill(name);
      await page.getByRole("button", { name: "Sentarme a la mesa" }).click();
    }
    await host.getByRole("button", { name: "Comenzar la aventura" }).click();
    const board = host.locator(".game-canvas");
    await expect(board).toHaveAttribute("data-board-status", "ready", {
      timeout: 45_000,
    });
    await expect(board).toHaveAttribute("data-camera-zoom", /0\./);
    const canvasBounds = await board.boundingBox();
    expect(canvasBounds).not.toBeNull();
    expect(canvasBounds!.x).toBe(0);
    expect(canvasBounds!.y).toBe(0);
    expect(canvasBounds!.width).toBe(1440);
    expect(canvasBounds!.height).toBe(900);
    await expect(host.locator(".table-sidebar")).toHaveCount(0);
    const playerCards = host.locator(".table-hud .party-bar article");
    await expect(playerCards).toHaveCount(2);
    const firstCard = await playerCards.first().boundingBox();
    const secondCard = await playerCards.last().boundingBox();
    expect(firstCard?.y).toBe(secondCard?.y);
    await host.getByRole("button", { name: "Opciones de la mesa" }).click();
    await expect(
      host.getByRole("button", { name: "Copiar invitación" }),
    ).toBeVisible();
    await expect(host.getByText("Recuperar un control perdido")).toBeVisible();
    await host.keyboard.press("Escape");
    await expect(
      host.getByRole("button", { name: "Opciones de la mesa" }),
    ).toBeVisible();

    const timer = host.getByRole("timer", {
      name: "Tiempo restante del turno",
    });
    await expect(timer).toBeVisible();
    await expect(timer).toHaveText(/^(?:00:\d{2}|PAUSA)$/);
    await expect(
      phone.getByRole("timer", { name: "Tiempo restante del turno" }),
    ).toHaveCount(0);
    await expect(
      secondPhone.getByRole("timer", { name: "Tiempo restante del turno" }),
    ).toHaveCount(0);

    const initial = await cameraState(board);
    expect(initial.worldWidth - initial.canvasWidth).toBeGreaterThanOrEqual(
      419,
    );
    expect(initial.worldHeight - initial.canvasHeight).toBeGreaterThanOrEqual(
      419,
    );
    expect(initial.worldWidth * initial.zoom).toBeCloseTo(
      initial.canvasWidth,
      0,
    );
    expect(initial.worldHeight * initial.zoom).toBeCloseTo(
      initial.canvasHeight,
      0,
    );
    // Dos apariciones: (9,-18) y (12,-18); el centro es (10,5,-18).
    expect(initial.left + initial.worldWidth / 2).toBeCloseTo(800, 0);
    expect(initial.top + initial.worldHeight / 2).toBeCloseTo(-1195, 0);
    await host.screenshot({ path: "artifacts/turn-camera.png" });

    await host.setViewportSize({ width: 720, height: 300 });
    await expect
      .poll(async () => (await cameraState(board)).canvasHeight)
      .toBe(300);
    const adaActive = await playerCards
      .first()
      .evaluate((card) => card.classList.contains("active"));
    const controller = adaActive ? phone : secondPhone;
    const actorName = adaActive ? "Ada" : "Bruno";
    const actorX = adaActive ? 9 : 12;
    const beforeMove = await cameraState(board);
    await expect(
      controller.getByRole("heading", { name: "Exploración" }),
    ).toBeVisible();
    await expect(
      controller.getByRole("button", { name: "Tirar movimiento D6" }),
    ).toBeDisabled();
    await expect(controller.locator(".movement-panel")).toContainText(
      "6 CASILLAS",
    );
    for (const y of [-17, -16]) {
      await controller.getByRole("button", { name: "Mover abajo" }).click();
      await expect(board).toHaveAttribute(
        "aria-label",
        new RegExp(`${actorName}: casilla ${actorX},${y}`),
      );
    }
    await expect
      .poll(async () => (await cameraState(board)).top, { timeout: 15_000 })
      .toBeGreaterThan(beforeMove.top + 5);
    const explored = await cameraState(board);
    expect(explored.worldWidth - explored.canvasWidth).toBeGreaterThanOrEqual(
      419,
    );
    expect(explored.worldHeight - explored.canvasHeight).toBeGreaterThanOrEqual(
      419,
    );
    await host.setViewportSize({ width: 1440, height: 900 });
    await host.screenshot({ path: "artifacts/table-chronicle.png" });
  } finally {
    await Promise.all([phone.close(), secondPhone.close(), host.close()]);
  }
});
