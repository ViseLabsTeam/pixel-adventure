import { expect, test } from "@playwright/test";

test("la invitación usa la dirección de red y permite unirse", async ({
  browser,
  baseURL,
}) => {
  test.skip(
    !process.env.TEST_LAN_ORIGIN,
    "Requiere TEST_LAN_ORIGIN accesible.",
  );
  const host = await browser.newPage();
  await host.goto(baseURL!);
  await host.getByRole("button", { name: "Crear una partida" }).click();
  const code = await host.getByTestId("room-code").innerText();
  const address = host.getByLabel("Dirección para celulares");
  const lanOrigin = process.env.TEST_LAN_ORIGIN!;
  await expect(address).toHaveValue(lanOrigin);
  await address.fill("http://localhost:8088");
  await expect(host.getByRole("alert")).toContainText("localhost");
  await expect(host.locator(".qr svg")).toHaveCount(0);
  await address.fill(lanOrigin);
  await expect(host.locator(".qr svg")).toBeVisible();
  const invitation = host.locator(".invitation-url");
  await expect(invitation).toHaveAttribute(
    "href",
    `${lanOrigin}/#/join/${code}`,
  );
  const phone = await browser.newPage({
    viewport: { width: 390, height: 844 },
  });
  await phone.goto((await invitation.getAttribute("href"))!);
  await phone.getByRole("radio").first().click();
  await phone.getByLabel("Nombre del viajero").fill("Viajero QR");
  await phone.getByRole("button", { name: "Sentarme a la mesa" }).click();
  await expect(host.getByRole("heading", { name: "Viajero QR" })).toBeVisible();
  await expect(
    host
      .locator(".traveler")
      .filter({ hasText: "Viajero QR" })
      .getByText("Listo", { exact: true }),
  ).toBeVisible();
  await host.screenshot({ path: "artifacts/invitation-lan.png" });
  await phone.close();
  await host.close();
});
