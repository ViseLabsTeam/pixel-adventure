import { test, expect } from "@playwright/test";

test("el ataque enemigo muestra el resultado antes de cambiar la vida", async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(90_000);
  const host = await browser.newPage();
  const paladin = await browser.newPage();
  const warrior = await browser.newPage();
  const errors: string[] = [];
  for (const page of [host, paladin, warrior])
    page.on("pageerror", (error) => errors.push(error.message));
  await host.goto(baseURL!);
  await host.getByRole("button", { name: "Crear una partida" }).click();
  const code = await host.getByTestId("room-code").innerText();
  for (const [page, name, classIndex] of [
    [paladin, "Ada", 0],
    [warrior, "Bruno", 1],
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
  await paladin.getByRole("button", { name: "Finalizar turno" }).click();
  await expect(
    warrior.getByRole("button", { name: "Finalizar turno" }),
  ).toBeEnabled();
  await warrior.getByRole("button", { name: "Finalizar turno" }).click();
  await expect(
    paladin.getByRole("button", { name: "Finalizar turno" }),
  ).toBeEnabled({ timeout: 15000 });
  await paladin.getByRole("button", { name: "Finalizar turno" }).click();
  await expect(
    warrior.getByRole("button", { name: "Finalizar turno" }),
  ).toBeEnabled();

  const warriorLife = host
    .locator("[data-player-id]")
    .nth(1)
    .locator("small")
    .first();
  const lifeBefore = await warriorLife.innerText();
  await host.evaluate((previousLife) => {
    const order = {
      resultAt: null as number | null,
      healthAt: null as number | null,
      diceActors: [] as string[],
    };
    Object.assign(window, { enemyCombatOrder: order });
    const observe = () => {
      const log = document.querySelector(".event-log")?.textContent ?? "";
      const roll = document.querySelector('[data-testid="table-dice"]');
      const actor = roll?.querySelector(
        ".table-dice-content > strong",
      )?.textContent;
      if (
        actor &&
        roll?.getAttribute("data-event-kind") !== "DICE" &&
        !order.diceActors.includes(actor)
      )
        order.diceActors.push(actor);
      if (
        order.resultAt === null &&
        /Centinela del umbral.*(?:inflige|falla su ataque)/.test(log)
      )
        order.resultAt = performance.now();
      const life = document
        .querySelectorAll("[data-player-id]")[1]
        ?.querySelector("small")?.textContent;
      if (order.healthAt === null && life && life !== previousLife)
        order.healthAt = performance.now();
    };
    new MutationObserver(observe).observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
    });
  }, lifeBefore);
  await warrior.getByRole("button", { name: "Finalizar turno" }).click();
  await expect(
    paladin.getByRole("button", { name: "Finalizar turno" }),
  ).toBeEnabled({ timeout: 30000 });
  const order = await host.evaluate(
    () =>
      (
        window as typeof window & {
          enemyCombatOrder: {
            resultAt: number | null;
            healthAt: number | null;
            diceActors: string[];
          };
        }
      ).enemyCombatOrder,
  );
  expect(order.resultAt).not.toBeNull();
  expect(order.diceActors).toContain("Centinela del umbral lanza los dados");
  if ((await warriorLife.innerText()) !== lifeBefore)
    expect(order.healthAt! - order.resultAt!).toBeGreaterThanOrEqual(500);
  else expect(order.healthAt).toBeNull();
  expect(errors).toEqual([]);
  await host.close();
  await paladin.close();
  await warrior.close();
});
