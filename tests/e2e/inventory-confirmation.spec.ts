import { expect, test } from "@playwright/test";
import { createRequire } from "node:module";
import type { GameView } from "../../packages/protocol/src/index";
const { Client } = createRequire(
  new URL("../../apps/web/package.json", import.meta.url),
)(
  "@colyseus/sdk",
) as typeof import("../../apps/web/node_modules/@colyseus/sdk");

test("confirma o cancela equipar, desequipar, usar y descartar", async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(240_000);
  const host = await browser.newPage();
  // This test covers inventory controls; graphics have their own E2E suite.
  await host.route("**/assets/game-board-*.js", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: "export default function GameBoard(){return null}",
    }),
  );
  await host.goto(baseURL!);
  await host.getByRole("button", { name: "Crear una partida" }).click();
  const code = await host.getByTestId("room-code").innerText();
  const phones = [];
  for (const [index, name] of ["Ada", "Bea"].entries()) {
    const phone = await browser.newPage({
      viewport: { width: 360, height: 640 },
      isMobile: true,
      hasTouch: true,
    });
    phones.push(phone);
    await phone.goto(`${baseURL}/#/join/${code}`);
    await phone.getByRole("radio").nth(index).click();
    await phone.getByLabel("Nombre del viajero").fill(name);
    await phone.getByRole("button", { name: "Sentarme a la mesa" }).click();
  }
  const session = await host.evaluate(() =>
    JSON.parse(sessionStorage.getItem("umbral.session")!),
  );
  const connect = await host.request.post(`${baseURL}/api/connect`, {
    headers: { Authorization: `Bearer ${session.token}` },
    data: {},
  });
  const { roomId } = await connect.json();
  const coordinator = await new Client(`${baseURL}/realtime`).joinById(roomId, {
    token: session.token,
  });
  coordinator.onMessage("state", (state: GameView) => {
    if (state.animationPending)
      coordinator.send("animation-complete", state.revision);
  });
  coordinator.onMessage("receipt", () => {});
  await host.getByRole("button", { name: "Comenzar la aventura" }).click();
  const [one, two] = phones;
  await one.getByRole("tab", { name: /Inventario/ }).click();
  const boots = one.locator(".bag-slot").filter({ hasText: "Botas de viaje" });
  const revision = await host.locator(".table-save > span").innerText();
  await boots.click();
  const dialog = one.getByRole("dialog");
  await expect(
    dialog.getByRole("button", { name: "Cancelar", exact: true }),
  ).toBeFocused();
  await expect(one.locator(".equipment-slot-boots")).toContainText(
    "Sin equipar",
  );
  await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(host.locator(".table-save > span")).toHaveText(revision);
  await boots.click();
  await dialog
    .getByRole("button", { name: "Confirmar equipar", exact: true })
    .click();
  await expect(one.locator(".equipment-slot-boots")).toContainText(
    "Botas de viaje",
  );
  await expect(one.locator(".bag-slot.filled")).toHaveCount(2);
  let firstRound = true;
  const nextRound = async () => {
    await one
      .getByRole("button", { name: "Finalizar turno", exact: true })
      .click();
    if (firstRound) {
      firstRound = false;
      await two.locator(".quick-items button").first().click();
      const useDialog = two.getByRole("dialog");
      await useDialog
        .getByRole("button", { name: "Confirmar usar", exact: true })
        .click();
      await expect(two.locator(".quick-items button").first()).toHaveAttribute(
        "title",
        "Espacio 1 sin consumible",
      );
    }
    await two
      .getByRole("button", { name: "Finalizar turno", exact: true })
      .click();
    await expect(
      one.getByRole("button", { name: "Finalizar turno", exact: true }),
    ).toBeEnabled({ timeout: 45_000 });
  };
  await nextRound();
  await one.locator(".equipment-slot-boots").click();
  await expect(dialog).toContainText("primer espacio libre");
  await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(one.locator(".equipment-slot-boots")).toContainText(
    "Botas de viaje",
  );
  await one.locator(".equipment-slot-boots").click();
  await dialog
    .getByRole("button", { name: "Confirmar desequipar", exact: true })
    .click();
  await expect(one.locator(".equipment-slot-boots")).toContainText(
    "Sin equipar",
  );
  await expect(one.locator(".bag-slot.filled")).toHaveCount(3);
  await nextRound();
  await one.getByRole("tab", { name: "Personaje" }).click();
  const potion = one.locator(".quick-items button").first();
  await potion.click();
  await expect(
    dialog.getByRole("button", { name: "Confirmar usar", exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Descartar", exact: true }).click();
  await expect(dialog).toContainText("no podrá recuperarse");
  await one.screenshot({
    path: "artifacts/inventory-discard-confirmation-360.png",
  });
  await one.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(potion).toBeVisible();
  await potion.click();
  await dialog.getByRole("button", { name: "Descartar", exact: true }).click();
  await dialog
    .getByRole("button", { name: "Confirmar descartar", exact: true })
    .click();
  await expect(potion).toHaveAttribute("title", "Espacio 1 sin consumible");
  await one.getByRole("tab", { name: /Inventario/ }).click();
  await expect(one.locator(".bag-slot.filled")).toHaveCount(3);
  await one.reload();
  await one.getByRole("tab", { name: /Inventario/ }).click();
  await expect(one.locator(".bag-slot.filled")).toHaveCount(3);
  await one.getByRole("tab", { name: "Personaje" }).click();
  await expect(one.locator(".quick-items button").first()).toHaveAttribute(
    "title",
    "Espacio 1 sin consumible",
  );
  await Promise.all(phones.map((phone) => phone.close()));
  await host.close();
  await coordinator.leave();
});
