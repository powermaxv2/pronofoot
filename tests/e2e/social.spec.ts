import { expect, test } from "@playwright/test";
import { signIn, unique } from "./helpers";

test("créer une ligue puis la rejoindre avec le lien d'invitation", async ({ browser }) => {
  const owner = await browser.newContext();
  const page = await owner.newPage();
  await signIn(page, "nico.rcl@pronofoot.local");
  await page.goto("/ligues");
  await page.getByRole("button", { name: "Créer une ligue" }).click();
  const leagueName = `Ligue ${unique("e2e")}`.slice(0, 40);
  await page.getByLabel("Nom").fill(leagueName);
  await page.getByRole("radio", { name: "🔥" }).click();
  await page.getByRole("button", { name: "Créer la ligue" }).click();
  await expect(page).toHaveURL(/\/ligues\/ligue-/);
  await expect(page.getByRole("heading", { name: leagueName })).toBeVisible();
  const code = (await page.getByLabel(/^Code /).getAttribute("aria-label"))!.replace("Code ", "");
  expect(code).toMatch(/^[A-Z2-9]{8}$/);

  const guest = await browser.newContext();
  const guestPage = await guest.newPage();
  await signIn(guestPage, "chloe.ogcn@pronofoot.local");
  await guestPage.goto(`/rejoindre/${code}`);
  await expect(guestPage.getByRole("heading", { name: leagueName })).toBeVisible();
  await guestPage.getByRole("button", { name: "Rejoindre la ligue" }).click();
  await expect(guestPage).toHaveURL(/\/ligues\/ligue-/);
  await expect(guestPage.getByText("chloe_ogcn").first()).toBeVisible();
  await owner.close();
  await guest.close();
});

test("classements par saison, mois et journée", async ({ page }) => {
  await signIn(page, "tom.kop@pronofoot.local");
  await page.goto("/classements");
  await expect(page.getByRole("link", { name: /tom_kop · vous/ })).toBeVisible();
  await page.getByRole("tab", { name: "Mois" }).click();
  await expect(page.getByRole("button", { name: "Mois précédent" })).toBeVisible();
  await page.getByRole("tab", { name: "Journée" }).click();
  await expect(page.getByRole("button", { name: "Journée précédente" })).toBeVisible();
  await expect(page).toHaveURL(/periode=journee/);
});

test("profil public avec statistiques et badges", async ({ page }) => {
  await signIn(page, "lea.ol@pronofoot.local");
  await page.goto("/profil/karim10");
  await expect(page.getByRole("heading", { name: "@karim10" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Badges" })).toBeVisible();
  await expect(page.getByRole("img", { name: /Points cumulés/ })).toBeVisible();
});
