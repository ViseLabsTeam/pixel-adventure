import { expect, test } from "@playwright/test";

test("una sesión local corrupta no bloquea el inicio", async ({
  page,
  baseURL,
}) => {
  await page.goto(baseURL!);
  await page.evaluate(() => {
    sessionStorage.setItem("umbral.session", '{"role":"PLAYER"}');
    localStorage.setItem("umbral.lastSession", "not-json");
  });
  await page.goto(`${baseURL}/#/session`);
  await expect(
    page.getByRole("button", { name: "Crear una partida" }),
  ).toBeVisible();
  await expect(page.getByText("Conectando con tu mesa…")).toHaveCount(0);
});
