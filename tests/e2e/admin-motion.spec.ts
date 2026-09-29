import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("l'administrateur lance une synchronisation manuelle", async ({ page }) => {
  await signIn(page, "admin@pronofoot.local");
  await page.goto("/admin/synchronisation");
  await page.getByRole("button", { name: "Lancer" }).nth(1).click();
  await expect(page.getByText(/Calcul des points : (ignoré|terminé)/)).toBeVisible();
  await page.goto("/admin/journal");
  await expect(page.locator("tbody tr").first()).toContainText("score");
});

test("un joueur non admin n'accède pas à l'administration", async ({ page }) => {
  await signIn(page, "sarah.losc@pronofoot.local");
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/accueil/);
});

test.describe("mouvement réduit", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test("aucune transformation animée : simples fondus", async ({ page }) => {
    await signIn(page, "jade.inter@pronofoot.local");
    await page.goto("/matchs");
    await page.waitForTimeout(800);
    // Les cartes en cascade n'utilisent ni translation ni mise à l'échelle.
    const transforms = await page
      .locator('a[href^="/matchs/"]')
      .evaluateAll((els) => els.slice(0, 6).map((el) => getComputedStyle(el.parentElement!).transform));
    for (const t of transforms) expect(["none", "matrix(1, 0, 0, 1, 0, 0)"]).toContain(t);
    // Les animations CSS en boucle (LIVE, shimmer) sont coupées.
    const loops = await page.evaluate(
      () =>
        document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations === Infinity).length,
    );
    expect(loops).toBe(0);
  });
});
