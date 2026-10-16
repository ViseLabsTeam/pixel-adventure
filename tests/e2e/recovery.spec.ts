import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
const compose = (...args: string[]) =>
  execFileSync("docker", ["compose", ...args], {
    cwd: process.cwd(),
    windowsHide: true,
    timeout: 60000,
    stdio: "pipe",
  });
test("reinicio durable, fallo de base, conciliación y reemplazo de control", async ({
  browser,
  baseURL,
}) => {
  test.skip(
    process.env.RUN_RECOVERY_TESTS !== "1",
    "Activa RUN_RECOVERY_TESTS=1: reinicia los servicios locales de la demo.",
  );
  test.setTimeout(180000);
  const contexts = [];
  let databaseStopped = false;
  try {
    const hostContext = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    contexts.push(hostContext);
    const host = await hostContext.newPage();
    await host.goto(baseURL!);
    await host.getByRole("button", { name: "Crear una partida" }).click();
    const code = await host.getByTestId("room-code").innerText();
    const phones = [];
    for (const name of ["Ema", "Fede"]) {
      const c = await browser.newContext({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      });
      contexts.push(c);
      const p = await c.newPage();
      phones.push(p);
      await p.goto(baseURL + "/#/join/" + code);
      await p.getByLabel("Nombre del viajero").fill(name);
      await p.getByRole("button", { name: "Sentarme a la mesa" }).click();
      await expect(
        p.getByText(name + ", tu lugar está reservado."),
      ).toBeVisible();
    }
    await host.getByRole("button", { name: "Comenzar la aventura" }).click();
    const one = phones[0];
    await one.getByRole("button", { name: /Tirar movimiento/ }).click();
    await expect(one.locator(".dice-button b")).toHaveText(/d6 · [1-6]/);
    await expect(
      one.getByRole("button", { name: "Mover arriba" }),
    ).toBeEnabled();
    const dice = await one.locator(".dice-button b").innerText();
    const items = await one.locator(".bag-slot").allTextContents();
    const position = await host
      .getByRole("img", { name: /Tablero por casillas/ })
      .getAttribute("aria-label");
    const roomIds = await host.evaluate(async () => {
      const session = JSON.parse(sessionStorage.getItem("umbral.session")!);
      return Promise.all(
        Array.from({ length: 4 }, async () => {
          const r = await fetch("/api/connect", {
            method: "POST",
            headers: {
              Authorization: "Bearer " + session.token,
              "Content-Type": "application/json",
            },
            body: "{}",
          });
          return (await r.json()).roomId;
        }),
      );
    });
    expect(new Set(roomIds).size).toBe(1);
    compose("restart", "server");
    await expect(one.getByRole("button", { name: "Mover arriba" })).toBeEnabled(
      { timeout: 45000 },
    );
    await expect(
      host.getByRole("img", { name: /Tablero por casillas/ }),
    ).toHaveAttribute("aria-label", position!);
    await expect(one.locator(".dice-button b")).toHaveText(dice);
    expect(await one.locator(".bag-slot").allTextContents()).toEqual(items);
    compose("stop", "db");
    databaseStopped = true;
    await one.getByRole("button", { name: "Mover arriba" }).click();
    await expect(one.getByRole("alert")).toBeVisible();
    await expect(
      host.getByRole("img", { name: /Tablero por casillas/ }),
    ).toHaveAttribute("aria-label", position!);
    expect(
      await one.evaluate(() =>
        Object.keys(sessionStorage).some(
          (k) =>
            k.startsWith("umbral.pending.") &&
            sessionStorage.getItem(k) !== "null",
        ),
      ),
    ).toBe(true);
    compose("start", "db");
    databaseStopped = false;
    await expect
      .poll(
        async () => {
          try {
            return (await host.request.get(baseURL + "/health/ready")).status();
          } catch {
            return 0;
          }
        },
        { timeout: 30000 },
      )
      .toBe(200);
    await one.getByRole("button", { name: "Reintentar", exact: true }).click();
    await expect(
      host.getByRole("img", { name: /Ema: casilla 2,7/ }),
    ).toBeVisible();
    await expect(one.locator(".error-banner")).toHaveCount(0);
    await expect(one.locator(".dice-button b")).toHaveText(dice);
    await host
      .getByText("Recuperar un control perdido", { exact: true })
      .click();
    await host
      .locator(".recovery-panel")
      .getByRole("button", { name: "Ema", exact: true })
      .click();
    const claim = await host.locator(".recovery-panel code").innerText();
    const c = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    contexts.push(c);
    const recovered = await c.newPage();
    await recovered.goto(baseURL!);
    await recovered
      .getByRole("button", { name: "Continuar una aventura guardada" })
      .click();
    await recovered
      .getByLabel("Código de control", { exact: true })
      .fill(claim);
    await recovered
      .getByRole("button", { name: "Recuperar personaje", exact: true })
      .click();
    await expect(recovered.locator(".dice-button b")).toHaveText(dice);
    expect(await recovered.locator(".bag-slot").allTextContents()).toEqual(
      items,
    );
    await expect(one.getByRole("alert")).toContainText("reemplazado");
    await expect(
      recovered.getByRole("button", { name: "Mover arriba" }),
    ).toBeEnabled();
    await expect(
      host.getByRole("img", { name: /Ema: casilla 2,7/ }),
    ).toBeVisible();
  } finally {
    if (databaseStopped) compose("start", "db");
    for (const c of contexts) await c.close();
  }
});
