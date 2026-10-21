import { test, expect } from "@playwright/test";
test("pantalla compartida, tres clases únicas, inventario y recarga", async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(120_000);
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
  const master = host.locator(".master-illustration");
  await host.locator("h1").hover();
  await expect(master).toHaveAttribute("src", "/assets/maestro/maestro2.PNG");
  await host.getByRole("button", { name: "Crear una partida" }).hover();
  await expect(master).toHaveAttribute("src", "/assets/maestro/maestro.PNG");
  await host.getByRole("button", { name: "Unirse a una partida" }).focus();
  await expect(master).toHaveAttribute("src", "/assets/maestro/maestro.PNG");
  await host.locator("h1").click();
  await host.locator("h1").hover();
  await expect(master).toHaveAttribute("src", "/assets/maestro/maestro2.PNG");
  await host.screenshot({ path: "artifacts/home-desktop.png", fullPage: true });
  await host.getByRole("button", { name: "Crear una partida" }).click();
  await expect(
    host.getByRole("heading", { name: "La mesa está servida." }),
  ).toBeVisible();
  const code = await host.getByTestId("room-code").innerText();
  const controls = [];
  for (const [index, name] of ["Ada", "Bruno", "Cira"].entries()) {
    const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      }),
      page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    controls.push({ context, page });
    await page.goto(baseURL + "/#/join/" + code);
    await expect(page.getByRole("radio")).toHaveCount(4);
    if (index > 0) await expect(page.getByRole("radio").nth(0)).toBeDisabled();
    await page.getByLabel("Nombre del viajero").fill(name);
    await page.getByRole("radio").nth(index).click();
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
  await host.evaluate(() => {
    const samples: { kind: string; text: string; sources: string[] }[] = [];
    Object.assign(window, { tableDiceSamples: samples });
    new MutationObserver(() => {
      const card = document.querySelector('[data-testid="table-dice"]');
      if (!card) return;
      const sample = {
        kind: card.getAttribute("data-event-kind") ?? "",
        text: card.textContent ?? "",
        sources: [...card.querySelectorAll("img")].map(
          (image) => image.getAttribute("src") ?? "",
        ),
      };
      if (
        !samples.some(
          (previous) =>
            previous.kind === sample.kind &&
            previous.text === sample.text &&
            previous.sources.join() === sample.sources.join(),
        )
      )
        samples.push(sample);
    }).observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
    });
  });
  const tableDiceSamples = () =>
    host.evaluate(
      () =>
        (
          window as typeof window & {
            tableDiceSamples: {
              kind: string;
              text: string;
              sources: string[];
            }[];
          }
        ).tableDiceSamples,
    );
  await one.getByRole("button", { name: /Tirar movimiento/ }).click();
  await expect(
    one.getByRole("button", { name: "Mover arriba" }),
  ).toBeDisabled();
  await expect(one.locator(".dice-presentation img")).toHaveCount(1);
  await expect(one.locator(".dice-presentation")).toBeInViewport();
  await expect(one.locator(".dice-presentation img")).toHaveAttribute(
    "src",
    /D6\.gif/,
  );
  await expect
    .poll(() =>
      one
        .locator(".dice-presentation img")
        .evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await one.screenshot({
    path: "artifacts/dice-roll-mobile.png",
    fullPage: true,
  });
  await expect(one.locator(".dice-presentation strong")).toContainText(/d6:/);
  await expect
    .poll(async () =>
      (await tableDiceSamples()).some(
        (sample) =>
          sample.kind === "DICE" &&
          sample.text.includes("Ada lanza los dados") &&
          sample.sources.some((source) => source.includes("D6.gif")),
      ),
    )
    .toBe(true);
  await expect
    .poll(async () =>
      (await tableDiceSamples()).some(
        (sample) => sample.kind === "DICE" && /d6:/.test(sample.text),
      ),
    )
    .toBe(true);
  const rolled = await one.locator(".die-button-label").innerText();
  await one.getByRole("button", { name: "Mover arriba" }).click();
  await expect(
    host.getByRole("img", { name: /Ada: casilla 2,7/ }),
  ).toBeVisible();
  await one.reload();
  await expect(one.locator(".die-button-label")).toHaveText(rolled);
  await expect(one.locator(".error-banner")).toHaveCount(0);
  await one.screenshot({
    path: "artifacts/controller-mobile.png",
    fullPage: true,
  });
  await host.screenshot({
    path: "artifacts/board-desktop.png",
    fullPage: true,
  });
  await one.getByRole("tab", { name: /Inventario/ }).click();
  await one.getByRole("button", { name: /Botas de viaje/ }).click();
  await one
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmar equipar", exact: true })
    .click();
  await expect(
    one.locator(".equipment-slot").filter({ hasText: "Botas de viaje" }),
  ).toHaveCount(1);
  await one.getByRole("tab", { name: "Personaje" }).click();
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
  const targetLife = two.locator(
    '.target-list button[aria-pressed="true"] small',
  );
  const lifeBeforeAttack = await targetLife.innerText();
  await two.evaluate((previousLife) => {
    const order = {
      resultAt: null as number | null,
      healthAt: null as number | null,
    };
    Object.assign(window, { combatOrder: order });
    const observe = () => {
      const result =
        document.querySelector(".dice-presentation strong")?.textContent ?? "";
      if (
        order.resultAt === null &&
        (/d20:/.test(result) || result === "Fallo")
      )
        order.resultAt = performance.now();
      const life = document.querySelector(
        '.target-list button[aria-pressed="true"] small',
      )?.textContent;
      if (order.healthAt === null && life && life !== previousLife)
        order.healthAt = performance.now();
    };
    new MutationObserver(observe).observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
    });
  }, lifeBeforeAttack);
  const started = Date.now();
  await two.getByRole("button", { name: /Corte furioso/ }).click();
  await expect
    .poll(async () =>
      (await tableDiceSamples()).some(
        (sample) =>
          ["ATTACK", "MISS"].includes(sample.kind) &&
          sample.text.includes("Bruno lanza los dados") &&
          sample.sources.some((source) => source.includes("D20.gif")) &&
          sample.sources.some((source) => source.includes("D6.gif")),
      ),
    )
    .toBe(true);
  await expect(two.locator(".dice-presentation img")).toHaveCount(2);
  await expect(targetLife).toHaveText(lifeBeforeAttack);
  await expect(
    two.getByRole("progressbar", { name: "Furia", exact: true }),
  ).toHaveAttribute("aria-valuenow", "0");
  await expect(
    host
      .locator("[data-player-id]")
      .nth(1)
      .getByRole("progressbar", { name: "Furia", exact: true }),
  ).toHaveAttribute("aria-valuenow", "0");
  await expect(
    two.getByRole("button", { name: "Finalizar turno" }),
  ).toBeDisabled();
  await host.screenshot({ path: "artifacts/attack-desktop.png" });
  await expect(two.locator(".dice-presentation strong")).toContainText(
    /d20:|Fallo/,
    { timeout: 15000 },
  );
  await expect
    .poll(
      async () =>
        (await tableDiceSamples()).some(
          (sample) =>
            ["ATTACK", "MISS"].includes(sample.kind) &&
            /d20:|Fallo/.test(sample.text),
        ),
      { timeout: 15000 },
    )
    .toBe(true);
  const result = await two.locator(".dice-presentation strong").innerText();
  await expect(
    two.getByRole("button", { name: "Finalizar turno" }),
  ).toBeEnabled({ timeout: 15000 });
  if (result === "Fallo") await expect(targetLife).toHaveText(lifeBeforeAttack);
  else await expect(targetLife).not.toHaveText(lifeBeforeAttack);
  const playerOrder = await two.evaluate(
    () =>
      (
        window as typeof window & {
          combatOrder: { resultAt: number | null; healthAt: number | null };
        }
      ).combatOrder,
  );
  expect(playerOrder.resultAt).not.toBeNull();
  if (result !== "Fallo")
    expect(
      playerOrder.healthAt! - playerOrder.resultAt!,
    ).toBeGreaterThanOrEqual(500);
  else expect(playerOrder.healthAt).toBeNull();
  expect(Date.now() - started).toBeGreaterThanOrEqual(8000);
  await expect(one.locator("body")).toHaveJSProperty("scrollWidth", 390);
  expect(errors).toEqual([]);
  for (const c of controls) await c.context.close();
  await hostContext.close();
});
