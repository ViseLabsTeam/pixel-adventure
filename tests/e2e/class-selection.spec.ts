import { test, expect } from "@playwright/test";

test("una clase elegida se bloquea en otro celular y se libera al volver", async ({
  browser,
  baseURL,
}) => {
  const host = await browser.newPage();
  await host.goto(baseURL!);
  await host.getByRole("button", { name: "Crear una partida" }).click();
  const code = await host.getByTestId("room-code").innerText();
  const first = await browser.newPage();
  const second = await browser.newPage();
  await Promise.all([
    first.goto(`${baseURL}/#/join/${code}`),
    second.goto(`${baseURL}/#/join/${code}`),
  ]);
  await first.getByRole("radio").first().click();
  await expect(first.getByRole("radio").first()).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(second.getByRole("radio").first()).toBeDisabled();
  await expect(second.getByRole("radio").first()).toContainText("Reservado");
  await first.getByRole("button", { name: "Volver" }).click();
  await expect(second.getByRole("radio").first()).toBeEnabled();
  await second.getByRole("radio").first().click();
  await second.getByLabel("Nombre del viajero").fill("Bea");
  await second.getByRole("button", { name: "Sentarme a la mesa" }).click();
  await expect(second.getByText("Bea, tu lugar está reservado.")).toBeVisible();
  await first.close();
  await second.close();
  await host.close();
});
