import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { ADMIN, EDITOR, expectPublic, login } from "./helpers";

const SITE = "http://localhost:3100";

test.describe("vehicle detail pages", () => {
  test("fleet card links to the vehicle page, which shows fares, canonical and structured data", async ({ page, request }) => {
    await page.goto("/taxi-services/");
    await page.getByRole("link", { name: "View details for Dzire" }).click();
    await expect(page).toHaveURL(/\/taxi-services\/dzire\/$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Maruti Dzire");
    await expect(page).toHaveTitle(/Maruti Dzire Taxi in Goa - MBA Travels Goa/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${SITE}/taxi-services/dzire/`);
    const html = (await (await request.get("/taxi-services/dzire/")).text()).replace(/<!-- -->/g, "");
    for (const s of ["₹1,250", "₹2,500", "₹200", "/ Hour", "₹20", "/ Km", "Airport Pickup Included"]) expect(html, s).toContain(s);
    const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).flatMap((b) => ([] as Record<string, unknown>[]).concat(JSON.parse(b)));
    expect(ld.some((i) => i["@type"] === "Service")).toBe(true);
    expect(ld.some((i) => i["@type"] === "BreadcrumbList")).toBe(true);
    const wa = await page.locator('a[href*="wa.me"], a[href*="whatsform"]').first().getAttribute("href");
    expect(wa).toBeTruthy();
  });

  test("all vehicle pages are in the sitemap, unknown vehicle is a real 404", async ({ request }) => {
    const xml = await (await request.get("/sitemap.xml")).text();
    for (const s of ["dzire", "ertiga", "innova", "innova-crysta"]) expect(xml).toContain(`<loc>${SITE}/taxi-services/${s}/</loc>`);
    expect((await request.get("/taxi-services/not-a-vehicle/")).status()).toBe(404);
  });

  test("vehicle page has no serious accessibility violations", async ({ page }) => {
    await page.goto("/taxi-services/innova-crysta/");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(results.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
  });

  test("editing the vehicle's SEO in the admin changes the public page title and description", async ({ page }) => {
    await login(page, EDITOR);
    await page.goto("/admin/content/vehicles/");
    await page.getByRole("link", { name: "Ertiga", exact: true }).click();
    await page.locator("#seo-title").fill("E2E Ertiga 6 Seater Taxi Goa");
    await page.locator("#seo-desc").fill("E2E description for the Ertiga taxi page with fares and booking details.");
    await page.getByRole("button", { name: "Save SEO" }).click();
    await expect(page.getByText("SEO saved.")).toBeVisible();
    await expectPublic(page, "/taxi-services/ertiga/", "<title>E2E Ertiga 6 Seater Taxi Goa</title>");
    await expectPublic(page, "/taxi-services/ertiga/", "E2E description for the Ertiga taxi page");
  });

  test("turning the detail page off removes the page, the card link and the sitemap entry", async ({ page }) => {
    await login(page, ADMIN);
    await page.goto("/admin/content/vehicles/");
    await page.getByRole("link", { name: "Dzire", exact: true }).click();
    await page.getByLabel(/Show a detail page for this vehicle/).uncheck();
    await page.getByRole("button", { name: /^Save( changes)?$/ }).click();
    await expect(page.getByText("Saved.")).toBeVisible();
    await expect.poll(async () => (await page.request.get("/taxi-services/dzire/")).status(), { timeout: 20_000 }).toBe(404);
    await expectPublic(page, "/taxi-services/", "View details<!-- --><span class=\"sr-only\"> for Dzire", false);
    await expectPublic(page, "/sitemap.xml", "/taxi-services/dzire/", false);
    // restore for later tests
    await page.getByLabel(/Show a detail page for this vehicle/).check();
    await page.getByRole("button", { name: /^Save( changes)?$/ }).click();
    await expect(page.getByText("Saved.")).toBeVisible();
    await expect.poll(async () => (await page.request.get("/taxi-services/dzire/")).status(), { timeout: 20_000 }).toBe(200);
  });
});

test.describe("blog", () => {
  test.describe.configure({ mode: "serial" });

  test("blog page exists, is noindex while empty, and is not in the sitemap", async ({ page, request }) => {
    await page.goto("/blog/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Blog");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.getByText("Articles are coming soon.")).toBeVisible();
    expect(await (await request.get("/sitemap.xml")).text()).not.toContain("/blog/</loc>");
    await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Blog" })).toBeVisible();
  });

  test("write a post in the admin: draft is private, publishing makes it public with SEO and sitemap entry", async ({ page, request }) => {
    await login(page, EDITOR);
    await page.goto("/admin/content/posts/new/");
    await page.getByLabel("Title *").fill("E2E Taxi Tips For Goa Airport");
    await page.getByLabel(/Short summary/).fill("How to plan your airport pickup in Goa.");
    await page.getByLabel("Author name").fill("MBA Travels Team");
    await page.getByLabel("Category").fill("Airport");
    await page.getByLabel("Article *").fill("## Before you travel\n\nShare your flight details and pickup time.\n\n- Confirm the fare\n- Keep the driver's number handy");
    await page.getByRole("button", { name: "Create draft" }).click();
    await page.waitForURL(/\/admin\/content\/posts\/\d+\//);

    // draft is not public
    expect((await request.get("/blog/e2e-taxi-tips-for-goa-airport/")).status()).toBe(404);

    // publish
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await expectPublic(page, "/blog/e2e-taxi-tips-for-goa-airport/", "Share your flight details and pickup time.");
    const art = (await (await request.get("/blog/e2e-taxi-tips-for-goa-airport/")).text()).replace(/<!-- -->/g, "");
    expect(art).toContain("<h2>Before you travel</h2>");
    expect(art).toContain("<li>Confirm the fare</li>");
    expect(art).toContain('"@type":"BlogPosting"');
    expect(art).toContain("By MBA Travels Team");
    await expectPublic(page, "/blog/", "E2E Taxi Tips For Goa Airport");
    await expectPublic(page, "/sitemap.xml", "/blog/e2e-taxi-tips-for-goa-airport/");

    // own SEO settings
    await page.reload();
    await page.locator("#seo-title").fill("E2E Goa Airport Taxi Tips | MBA Travels");
    await page.locator("#seo-desc").fill("E2E meta description for the airport taxi tips article.");
    await page.getByRole("button", { name: "Save SEO" }).click();
    await expect(page.getByText("SEO saved.")).toBeVisible();
    await expectPublic(page, "/blog/e2e-taxi-tips-for-goa-airport/", "<title>E2E Goa Airport Taxi Tips | MBA Travels</title>");
    await expectPublic(page, "/blog/e2e-taxi-tips-for-goa-airport/", "E2E meta description for the airport taxi tips article.");
  });

  test("published post has no serious accessibility violations", async ({ page }) => {
    await page.goto("/blog/e2e-taxi-tips-for-goa-airport/");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(results.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
  });

  test("unpublishing removes the post from the site and sitemap", async ({ page }) => {
    await login(page, EDITOR);
    await page.goto("/admin/content/posts/");
    await page.getByRole("link", { name: "E2E Taxi Tips For Goa Airport" }).click();
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Unpublish" }).click();
    await expect.poll(async () => (await page.request.get("/blog/e2e-taxi-tips-for-goa-airport/")).status(), { timeout: 20_000 }).toBe(404);
    await expectPublic(page, "/sitemap.xml", "/blog/e2e-taxi-tips-for-goa-airport/", false);
    await expectPublic(page, "/blog/", "E2E Taxi Tips For Goa Airport", false);
  });
});
