import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("pronostics", () => {
  test("pronostiquer un match avec score exact et joker, puis le modifier", async ({ page }) => {
    await signIn(page, "theo.srfc@pronofoot.local");
    await expect(page).toHaveURL(/\/accueil/);
    await page.goto("/matchs");
    // Premier match à pronostiquer : la carte s'ouvre en modale.
    const card = page.locator('a[href^="/matchs/"]', { hasText: "À pronostiquer" }).first();
    await card.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Mon prono" })).toBeVisible();

    await dialog
      .getByRole("button", { name: /un but de plus/ })
      .first()
      .click();
    await dialog.getByRole("button", { name: /Poser le joker/ }).click();
    await dialog.getByRole("button", { name: "Valider mon prono" }).click();
    await expect(page.getByText("Pronostic enregistré.")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Enregistré" })).toBeDisabled();

    // Le 1N2 suit le score : passer au nul ajuste le score.
    await dialog.getByRole("radio", { name: /Match nul/ }).click();
    await expect(dialog.getByRole("radio", { name: /Match nul/ })).toHaveAttribute("aria-checked", "true");
    await dialog.getByRole("button", { name: "Modifier" }).click();
    await expect(page.getByText("Pronostic enregistré.").first()).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/\/matchs$/);
  });

  test("un match terminé n'est plus pronostiquable et affiche la communauté", async ({ page }) => {
    await signIn(page, "julie.fcn@pronofoot.local".replace("julie.fcn", "juliefcn"));
    await page.goto("/matchs?onglet=termines");
    await page.locator('a[href^="/matchs/"]').first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: /Valider mon prono/ })).toHaveCount(0);
    await expect(dialog.getByText(/La communauté a voté|Personne n'a pronostiqué/)).toBeVisible();
  });
});
