import { expect, type Page } from "@playwright/test";
import { SMTP } from "../../playwright.config";

type Mail = { to: string[]; text: string };

/** Récupère le dernier lien magique reçu par une adresse. */
export async function magicLink(email: string): Promise<string> {
  let link: string | undefined;
  await expect
    .poll(async () => {
      const res = await fetch(`http://localhost:${SMTP.http}/messages?to=${encodeURIComponent(email)}`);
      const mails = (await res.json()) as Mail[];
      link = mails.at(-1)?.text.match(/https?:\/\/\S+/)?.[0];
      return Boolean(link);
    })
    .toBe(true);
  return link!;
}

/** Connexion complète par lien magique. */
export async function signIn(page: Page, email: string) {
  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByRole("button", { name: "Recevoir mon lien" }).click();
  await expect(page).toHaveURL(/\/connexion\/verification/);
  await page.goto(await magicLink(email));
}

export const unique = (prefix: string) =>
  `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
