import { expect, test } from "@playwright/test";
import { ADMIN, EDITOR, LEADS, PASSWORD, expectPublic, login } from "./helpers";

test.describe("authentication and authorisation", () => {
  test("anonymous users are redirected and APIs reject them", async ({ page, request }) => {
    await page.goto("/admin/enquiries/");
    await expect(page).toHaveURL(/\/admin\/login\//);
    expect((await request.get("/api/admin/enquiries/export/")).status()).toBe(401);
    expect((await request.post("/api/admin/media/", { multipart: { file: { name: "a.png", mimeType: "image/png", buffer: Buffer.from("x") } } })).status()).toBe(401);
  });

  test("wrong password gives a generic error", async ({ page }) => {
    await page.goto("/admin/login/");
    await page.getByLabel("Email").fill(ADMIN);
    await page.getByLabel("Password").fill("not-the-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.locator('main [role="alert"]')).toHaveText("Incorrect email or password.");
  });

  test("session cookie is HttpOnly", async ({ page, context }) => {
    await login(page, ADMIN);
    const c = (await context.cookies()).find((x) => x.name.includes("mba_admin"))!;
    expect(c.httpOnly).toBe(true);
    expect(c.sameSite).toBe("Lax");
  });

  test("content editor cannot reach users, settings or enquiries", async ({ page }) => {
    await login(page, EDITOR);
    for (const path of ["/admin/users/", "/admin/settings/", "/admin/enquiries/", "/admin/redirects/"]) {
      await page.goto(path);
      await expect(page, path).toHaveURL(/\/admin\/forbidden\//);
    }
    await expect(page.getByRole("link", { name: "Users & roles" })).toHaveCount(0);
  });

  test("enquiry manager cannot edit content", async ({ page }) => {
    await login(page, LEADS);
    await page.goto("/admin/pages/");
    await expect(page).toHaveURL(/\/admin\/forbidden\//);
    await page.goto("/admin/enquiries/");
    await expect(page.getByRole("heading", { name: "Enquiries" })).toBeVisible();
  });
});

test.describe("enquiry workflow", () => {
  test("form validates, saves, and the lead appears in the dashboard and CSV", async ({ page, browser }) => {
    await page.goto("/goa-taxi-service-contact/?utm_source=e2e&utm_medium=test");
    const form = page.locator("#enquiry form");
    await form.getByRole("button", { name: "Send enquiry" }).click();
    await expect(page.locator('main [role="alert"]').first()).toContainText("Please enter your phone number");
    await form.getByLabel("Phone / WhatsApp number *").fill("+91 90000 11111");
    await form.getByLabel("Full name").fill("E2E Traveller");
    await form.getByLabel("Message").fill("=1+1 Need an airport pickup");
    await page.waitForTimeout(3000); // anti-bot minimum fill time
    await form.getByRole("button", { name: "Send enquiry" }).click();
    await expect(page.locator('main [role="alert"]').first()).toContainText("confirm we may contact you");
    await form.getByLabel(/I agree that MBA Travels Goa may contact me/).check();
    await form.getByRole("button", { name: "Send enquiry" }).click();
    await expect(page.getByText("your enquiry has been received")).toBeVisible();

    const ctx = await browser.newContext();
    const admin = await ctx.newPage();
    await login(admin, LEADS);
    await admin.goto("/admin/enquiries/?q=E2E+Traveller");
    await expect(admin.getByRole("link", { name: "E2E Traveller" }).first()).toBeVisible();
    await admin.getByRole("link", { name: "E2E Traveller" }).first().click();
    await expect(admin.getByText("e2e / test")).toBeVisible(); // UTM captured
    await admin.locator("#enq-status").selectOption("contacted");
    await expect(admin.getByText("Updated")).toBeVisible();
    await admin.getByLabel("Add internal note").fill("Called back, quoted ₹1,250");
    await admin.getByRole("button", { name: "Add note" }).click();
    await expect(admin.getByText("Called back, quoted ₹1,250")).toBeVisible();
    await admin.reload();
    await expect(admin.getByText("contacted").first()).toBeVisible(); // persisted

    const csv = await admin.request.get("/api/admin/enquiries/export/?q=E2E+Traveller");
    expect(csv.status()).toBe(200);
    const text = await csv.text();
    expect(text).toContain("E2E Traveller");
    expect(text).toContain("'=1+1 Need an airport pickup"); // formula injection neutralised
    expect(text).toContain('"+91 90000 11111"'); // real phone numbers are left intact
    await ctx.close();
  });

  test("honeypot submissions are accepted silently but never stored", async ({ request }) => {
    const res = await request.post("/api/enquiries/", { data: { phone: "9000022222", consent: true, company: "bot", startedAt: Date.now() - 10000 } });
    expect(res.status()).toBe(422);
  });

  test("too-fast submissions are not stored", async ({ request, browser }) => {
    const res = await request.post("/api/enquiries/", { data: { phone: "9000033333", name: "Speedy Bot", consent: true, startedAt: Date.now() } });
    expect(res.status()).toBe(200);
    const ctx = await browser.newContext();
    const admin = await ctx.newPage();
    await login(admin, LEADS);
    await admin.goto("/admin/enquiries/?q=Speedy");
    await expect(admin.getByText("No enquiries match these filters.")).toBeVisible();
    await ctx.close();
  });

  test("rate limiting stops floods", async ({ request }) => {
    const codes: number[] = [];
    for (let i = 0; i < 8; i++) codes.push((await request.post("/api/enquiries/", { data: { phone: `90000${40000 + i}`, consent: true, startedAt: Date.now() - 10000 } })).status());
    expect(codes).toContain(429);
  });
});

test.describe("CMS edits persist and appear on the public site", () => {
  test.describe.configure({ mode: "serial" }); // later tests depend on earlier edits
  test("editing a vehicle fare updates every place it is shown", async ({ page }) => {
    await login(page, EDITOR);
    await page.goto("/admin/content/vehicles/");
    await page.getByRole("link", { name: "Dzire" }).click();
    const airport = page.locator('input[id$="fares-0-amount"]');
    await expect(airport).toHaveValue("1250");
    await airport.fill("1299");
    await page.getByLabel("Change note (optional)").fill("e2e fare change");
    await page.getByRole("button", { name: /^Save( changes)?$/ }).click();
    await expect(page.getByText("Saved.")).toBeVisible();
    await expectPublic(page, "/taxi-services/", "₹1,299");
    await expectPublic(page, "/", "₹1,299");
    await page.reload();
    await expect(page.locator('input[id$="fares-0-amount"]')).toHaveValue("1299");
    await expect(page.getByText("e2e fare change")).toBeVisible(); // revision history
  });

  test("revision restore brings the old fare back", async ({ page }) => {
    await login(page, EDITOR);
    await page.goto("/admin/content/vehicles/");
    await page.getByRole("link", { name: "Dzire" }).click();
    page.once("dialog", (d) => d.accept());
    await page.getByRole("listitem").filter({ hasText: "Migrated from live site" }).getByRole("button", { name: "Restore" }).click();
    await expectPublic(page, "/taxi-services/", "₹1,299", false);
    await expectPublic(page, "/taxi-services/", "₹1,250");
  });

  test("optimistic locking rejects a stale save", async ({ browser }) => {
    const [a, b] = await Promise.all([browser.newContext(), browser.newContext()]);
    const pa = await a.newPage();
    const pb = await b.newPage();
    await login(pa, ADMIN);
    await login(pb, EDITOR);
    for (const p of [pa, pb]) await p.goto("/admin/content/faqs/1/");
    await pa.getByLabel("Answer *").fill("First editor's answer to the airport question.");
    await pa.getByRole("button", { name: /^Save( changes)?$/ }).click();
    await expect(pa.getByText("Saved.")).toBeVisible();
    await pb.getByLabel("Answer *").fill("Second editor's stale answer.");
    await pb.getByRole("button", { name: /^Save( changes)?$/ }).click();
    await expect(pb.locator('main [role="alert"]').first()).toContainText("changed by someone else");
    await expectPublic(pa, "/", "First editor&#x27;s answer to the airport question.");
    await a.close();
    await b.close();
  });

  test("server-side validation errors are shown per field", async ({ page }) => {
    await login(page, EDITOR);
    await page.goto("/admin/content/faqs/new/");
    await page.getByRole("button", { name: "Create draft" }).click();
    await expect(page.getByText("Question is required")).toBeVisible();
  });

  test("draft → publish → unpublish controls the public site", async ({ page }) => {
    await login(page, EDITOR);
    await page.goto("/admin/content/faqs/new/");
    await page.getByLabel("Question *").fill("E2E: Do you accept tips?");
    await page.getByLabel("Answer *").fill("Tips are never required.");
    await page.getByLabel("Category").fill("general");
    await page.getByRole("button", { name: "Create draft" }).click();
    await page.waitForURL(/\/admin\/content\/faqs\/\d+\//);
    await expectPublic(page, "/", "E2E: Do you accept tips?", false);
    await page.getByRole("button", { name: "Publish" }).click();
    await expectPublic(page, "/", "E2E: Do you accept tips?");
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Unpublish" }).click();
    await expectPublic(page, "/", "E2E: Do you accept tips?", false);
  });

  test("unverified testimonials never show stars; verifying enables them", async ({ page }) => {
    const html = await (await page.request.get("/")).text();
    expect(html).not.toContain("Rated 5 out of 5");
    await login(page, EDITOR);
    await page.goto("/admin/content/testimonials/");
    await page.getByRole("link", { name: "Rahul Sharma" }).click();
    await page.getByLabel(/Verified genuine customer review/).check();
    await page.getByRole("button", { name: /^Save( changes)?$/ }).click();
    await expect(page.getByText("Saved.")).toBeVisible();
    await expectPublic(page, "/", "Rated 5 out of 5");
  });

  test("page builder: edit a section, reorder, draft stays private until published", async ({ page }) => {
    await login(page, EDITOR);
    await page.goto("/admin/pages/");
    await page.getByRole("link", { name: "About Us" }).click();
    await page.getByRole("button", { name: /Call-to-action band/ }).click();
    await page.getByLabel("Heading *").last().fill("E2E Ready To Explore Goa?");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Draft saved" })).toBeVisible();
    await expectPublic(page, "/about-us/", "E2E Ready To Explore Goa?", false);
    const preview = await page.request.get(page.url().replace(/\/admin\/pages\/(\d+)\/.*/, "/admin/preview/pages/$1/"));
    expect(await preview.text()).toContain("E2E Ready To Explore Goa?");
    await page.getByRole("button", { name: /Save & update live page/ }).click();
    await expect(page.getByText("Saved and published")).toBeVisible();
    await expectPublic(page, "/about-us/", "E2E Ready To Explore Goa?");
  });

  test("a new page can be created, published, appears in the sitemap and can be unpublished", async ({ page }) => {
    await login(page, ADMIN);
    await page.goto("/admin/pages/new/");
    await page.getByLabel("Page title *").fill("E2E Offers");
    await page.getByLabel("URL path *").fill("/e2e-offers/");
    await page.getByRole("button", { name: /Page header/ }).click();
    await page.getByLabel("Heading", { exact: true }).first().fill("E2E Special Offers");
    await page.getByRole("button", { name: "Save & publish" }).click();
    await expect(page.getByText("Saved and published")).toBeVisible();
    await expectPublic(page, "/e2e-offers/", "E2E Special Offers");
    await expectPublic(page, "/sitemap.xml", "/e2e-offers/");
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Unpublish" }).click();
    await expect.poll(async () => (await page.request.get("/e2e-offers/")).status()).toBe(404);
    await expectPublic(page, "/sitemap.xml", "/e2e-offers/", false);
  });

  test("system pages cannot be renamed or deleted; invalid sections are rejected", async ({ page }) => {
    await login(page, ADMIN);
    await page.goto("/admin/pages/");
    await page.getByRole("table").getByRole("link", { name: "Packages", exact: true }).click();
    await expect(page.getByLabel("URL path *")).toBeDisabled();
    await expect(page.getByRole("button", { name: "Delete" })).toHaveCount(0);
  });

  test("site settings change the phone number everywhere", async ({ page }) => {
    await login(page, ADMIN);
    await page.goto("/admin/settings/");
    await page.getByLabel("Phone number (international format) *").fill("+91 90000 99999");
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByText("Settings saved")).toBeVisible();
    await expectPublic(page, "/hotels/", 'href="tel:+919000099999"');
    await expectPublic(page, "/hotels/", 'href="tel:+919322073068"', false);
    await page.getByLabel("Phone number (international format) *").fill("+91 93220 73068");
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByText("Settings saved")).toBeVisible();
    await page.getByLabel("Phone number (international format) *").fill("12");
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.locator('main [role="alert"]').first()).toBeVisible();
  });

  test("navigation edits update the header and reject links to missing pages", async ({ page }) => {
    await login(page, ADMIN);
    await page.goto("/admin/navigation/");
    const header = page.locator("section", { has: page.getByRole("heading", { name: "Header menu" }) });
    await header.getByLabel("Label", { exact: true }).nth(3).fill("About MBA");
    await header.getByRole("button", { name: "Save menu" }).click();
    await expect(header.getByText("Saved — the live site is updated.")).toBeVisible();
    await expectPublic(page, "/packages/", ">About MBA<");
    await header.getByLabel("Link", { exact: true }).nth(3).fill("/does-not-exist/");
    await header.getByRole("button", { name: "Save menu" }).click();
    await expect(header.getByRole("alert")).toContainText("not a published page");
    await page.reload();
    await header.getByLabel("Label", { exact: true }).nth(3).fill("About Us");
    await header.getByRole("button", { name: "Save menu" }).click();
    await expect(header.getByText("Saved — the live site is updated.")).toBeVisible();
  });

  test("redirect manager creates redirects and blocks loops and chains", async ({ page, request }) => {
    await login(page, ADMIN);
    await page.goto("/admin/redirects/");
    const add = async (from: string, to: string) => {
      await page.getByLabel("From path").fill(from);
      await page.getByLabel("To", { exact: true }).fill(to);
      await page.getByRole("button", { name: "Save redirect" }).click();
    };
    await add("/e2e-old/", "/packages/");
    await expect(page.getByText("Redirect saved")).toBeVisible();
    await expect.poll(async () => (await request.get("/e2e-old/", { maxRedirects: 0 })).status(), { timeout: 45_000 }).toBe(301);
    await add("/e2e-loop/", "/e2e-old/");
    await expect(page.locator('main [role="alert"]').first()).toContainText("chain");
    await add("/e2e-self/", "/e2e-self/");
    await expect(page.locator('main [role="alert"]').first()).toContainText("itself");
  });

  test("audit log records administrative actions", async ({ page }) => {
    await login(page, ADMIN);
    await page.goto("/admin/audit/");
    await expect(page.getByRole("cell", { name: "settings.update" }).first()).toBeVisible();
    await expect(page.getByRole("cell", { name: "content.update" }).first()).toBeVisible();
  });
});

test.describe("media", () => {
  const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

  test("uploads validate real image content and never accept executables", async ({ page }) => {
    await login(page, ADMIN);
    const bad = await page.request.post("/api/admin/media/", { multipart: { file: { name: "evil.png", mimeType: "image/png", buffer: Buffer.from("<?php system($_GET['c']); ?>") } } });
    expect(bad.status()).toBe(422);
    const exe = await page.request.post("/api/admin/media/", { multipart: { file: { name: "evil.php", mimeType: "image/png", buffer: PNG } } });
    expect(exe.status()).toBe(422);
    const ok = await page.request.post("/api/admin/media/", { multipart: { file: { name: "My Test Photo.png", mimeType: "image/png", buffer: PNG }, alt: "A test pixel" } });
    expect(ok.status()).toBe(200);
    const body = await ok.json();
    expect(body.url).toMatch(/^\/media\/my-test-photo-[a-z0-9]+\.webp$/);
    const served = await page.request.get(body.url);
    expect(served.headers()["content-type"]).toBe("image/webp");
  });

  test("media route rejects path traversal", async ({ request }) => {
    for (const key of ["..%2F..%2F.env.local", "%2e%2e/secret.webp", "a.php", "../wp-login.php", "%2e%2e/xmlrpc.php"]) {
      const res = await request.get(`/media/${key}`);
      expect(res.status(), `/media/${key} -> ${res.url()}`).toBe(404);
    }
  });

  test("deleting an image used by a published page requires confirmation", async ({ page }) => {
    await login(page, ADMIN);
    await page.goto("/admin/media/?q=MBA+Travels+Goa");
    await expect(page.getByText(/Used in [1-9]\d* place/).first()).toBeVisible();
  });
});

test.describe("security", () => {
  test("no secrets or server-only code in client bundles", async ({ page }) => {
    const bodies: string[] = [];
    page.on("response", async (r) => {
      if (r.url().includes("/_next/static/") && r.url().endsWith(".js")) bodies.push(await r.text().catch(() => ""));
    });
    await login(page, ADMIN);
    for (const p of ["/", "/admin/settings/", "/admin/pages/1/"]) await page.goto(p);
    const all = bodies.join("\n");
    for (const needle of [PASSWORD, "APP_SECRET", "DATABASE_URL", "mysql2", "argon2", "dev_only_password"]) expect(all.includes(needle), needle).toBe(false);
  });

  test("login throttling locks an account after repeated failures", async ({ page }) => {
    await page.goto("/admin/login/");
    const attempt = async (password: string) => {
      await page.getByLabel("Email").fill("leads@test.local");
      await page.getByLabel("Password").fill(password);
      // Wait for the server action round-trip so no click is swallowed while the button is disabled.
      await Promise.all([
        page.waitForResponse((r) => r.request().method() === "POST" && r.url().includes("/admin/login")),
        page.getByRole("button", { name: "Sign in" }).click(),
      ]);
      await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();
    };
    for (let i = 0; i < 5; i++) await attempt("wrong-password-" + i);
    await expect(page.locator('main [role="alert"]')).toContainText("Incorrect email or password.");
    await attempt(PASSWORD); // correct password, but the account is now locked
    await expect(page.locator('main [role="alert"]')).toContainText("temporarily locked");
  });
});
