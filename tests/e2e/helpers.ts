import { expect, type Page } from "@playwright/test";

export const PASSWORD = "E2E-Test-Password-123";
export const ADMIN = "admin@test.local";
export const EDITOR = "editor@test.local";
export const LEADS = "leads@test.local";

export async function login(page: Page, email: string) {
  await page.goto("/admin/login/");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/admin\/$/);
}

/** Polls a public URL until its HTML contains (or stops containing) text — public pages are cached. */
export async function expectPublic(page: Page, path: string, text: string, present = true) {
  await expect
    .poll(
      async () => {
        const res = await page.request.get(path, { headers: { "Cache-Control": "no-cache" } });
        return (await res.text()).includes(text);
      },
      { timeout: 20_000, intervals: [500, 1000, 2000] },
    )
    .toBe(present);
}
