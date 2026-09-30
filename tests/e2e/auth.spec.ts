import { expect, test } from "@playwright/test";
import { signIn, unique } from "./helpers";

test("inscription par lien magique puis onboarding en 3 étapes", async ({ page }) => {
  const name = unique("nouveau");
  await signIn(page, `${name}@e2e.local`);
  await expect(page).toHaveURL(/\/bienvenue/);

  const username = name.slice(0, 20);
  await page.locator("#username").fill(username);
  await expect(page.getByText("3 à 20 caractères")).toBeVisible();
  await page.getByRole("button", { name: "Continuer" }).click();

  await page.getByRole("radio", { name: "Maillot 4" }).click();
  await page.getByRole("button", { name: "Continuer" }).click();

  await page.getByPlaceholder("Rechercher un club").fill("nantes");
  await page
    .getByRole("radio", { name: /Nantes/ })
    .first()
    .click();
  await page.getByRole("button", { name: /C'est parti/ }).click();

  await expect(page).toHaveURL(/\/accueil/);
  await expect(page.getByRole("heading", { name: new RegExp(`Salut ${username}`, "i") })).toBeVisible();
});

test("les pages de l'application exigent une connexion", async ({ page }) => {
  await page.goto("/matchs");
  await expect(page).toHaveURL(/\/connexion/);
  const res = await page.goto("/cette-page-n-existe-pas");
  expect(res?.status()).toBe(404);
});

test("refuse une adresse e-mail invalide", async ({ page }) => {
  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill("pas-un-mail");
  await page.getByRole("button", { name: "Recevoir mon lien" }).click();
  await expect(page.locator("#email-error")).toHaveText("Adresse e-mail invalide.");
});
