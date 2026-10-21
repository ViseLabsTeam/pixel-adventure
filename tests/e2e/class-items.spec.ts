import { expect, test } from "@playwright/test";

test("cada clase muestra únicamente su equipo en la bolsa", async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(120_000);
  const host = await browser.newPage();
  await host.goto(baseURL!);
  await host.getByRole("button", { name: "Crear una partida" }).click();
  const code = await host.getByTestId("room-code").innerText();
  const phones = [];
  const weapons = [
    "Escudo de paladín",
    "Espada de guerrero",
    "Bastón de mago",
    "Arco de arquera",
  ];
  for (const [index, name] of [
    "Paladín",
    "Guerrero",
    "Mago",
    "Arquera",
  ].entries()) {
    const phone = await browser.newPage({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    phones.push(phone);
    await phone.goto(`${baseURL}/#/join/${code}`);
    await phone.getByRole("radio").nth(index).click();
    await phone.getByLabel("Nombre del viajero").fill(name);
    await phone.getByRole("button", { name: "Sentarme a la mesa" }).click();
  }
  await expect(host.getByText("Listo", { exact: true })).toHaveCount(4);
  await host.getByRole("button", { name: "Comenzar la aventura" }).click();
  for (const [index, phone] of phones.entries()) {
    await phone.getByRole("tab", { name: /Inventario/ }).click();
    await expect(phone.locator(".bag-slot.filled:visible")).toHaveCount(3);
    await expect(phone.locator(".equipment-slot-weapon")).toContainText(
      index === 0 ? "Escudo" : "Arma",
    );
    await expect(phone.locator(".bag-grid")).toContainText(weapons[index]);
    for (const foreign of weapons.filter((_, other) => other !== index))
      await expect(phone.locator(".bag-grid")).not.toContainText(foreign);
    await phone.screenshot({ path: `artifacts/class-items-${index}.png` });
  }
  await Promise.all(phones.map((phone) => phone.close()));
  await host.close();
});
