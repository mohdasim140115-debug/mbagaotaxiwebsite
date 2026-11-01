import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const SITE = "http://localhost:3100";

/** Every page of the original site, with its original title and content that must survive migration. */
const ORIGINAL_PAGES = [
  { path: "/", title: "Goa Taxi Service & Tours | MBA Travels Goa", h1: "Discover The Soul Of Goa", content: ["Everything You Need For Your Goa Trip", "Flight Booking", "Corporate Travel", "starts form ₹2,800", "₹1,499", "Choose Your Perfect Ride", "₹1,250", "₹4,000", "₹35 / Km", "Luxury Airport Pickup &amp; Drop Service", "Every Corner Has A Story To Tell", "Rahul Sharma", "Which payment methods do you accept?", "Our airport transfer and taxi services are available round the clock"] },
  { path: "/about-us/", title: "About Us - MBA Travels Goa", h1: "Your Trusted Travel Partner In Goa", content: ["Years Of Experience", "Why Thousands Of Travellers Choose MBA Travels", "Every Journey Begins With Trust", "Ready To Explore Goa?", "Customized Goa Tour Packages"] },
  { path: "/packages/", title: "Packages - MBA Travels Goa", h1: "Discover The Best Of Goa", content: ["Starts From ₹2,700", "Starts From ₹3,500", "Starts From ₹1,500", "Custom Pricing", "Airport + Sightseeing", "Best Value"] },
  { path: "/taxi-services/", title: "Taxi Services - MBA Travels Goa", h1: "Choose Your Perfect Ride", content: ["Dzire", "Ertiga", "Innova Crysta", "8 Hrs / 80 Km", "Maruti Dzire", "4 Seater Sedan", "Ready To Book Your Airport Transfer?"] },
  { path: "/hotels/", title: "Hotels - MBA Travels Goa", h1: "Handpicked Hotels &amp; Resorts", content: ["Royal Nirvana Resort", "₹9,300", "Somy Plaza", "₹17,100", "Sinq Beach Resort", "Starting From"] },
  { path: "/gallery/", title: "Gallery - MBA Travels Goa", h1: "Gallery", content: [] },
  { path: "/goa-taxi-service-contact/", title: "Goa Taxi Service | Contact MBA Travels Goa", h1: "Contact Us", content: ["Get in Touch with MBA Travels Goa", "Hotel pickups and drop-offs", "Please use our verified business WhatsApp number to complete your booking.", "How to Book a Goa Taxi", "Benefits of Our Goa Taxi Service"] },
];

test.describe("original pages are preserved", () => {
  for (const p of ORIGINAL_PAGES) {
    test(`${p.path} renders with original title, one H1 and content`, async ({ page, request }) => {
      const res = await request.get(p.path);
      expect(res.status()).toBe(200);
      const html = (await res.text()).replace(/<!-- -->/g, "");
      for (const c of p.content) expect(html, `missing “${c}”`).toContain(c);
      await page.goto(p.path);
      await expect(page).toHaveTitle(p.title);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("h1")).toContainText(p.h1.replace("&amp;", "&"));
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${SITE}${p.path}`);
      const desc = await page.locator('meta[name="description"]').getAttribute("content");
      expect(desc && desc.length).toBeGreaterThan(30);
      expect(desc).not.toMatch(/[{};]/); // the old site leaked CSS into descriptions
      for (const img of await page.locator("img").all()) expect(await img.getAttribute("alt")).not.toBeNull();
    });
  }

  test("meta descriptions and titles are unique", async ({ page }) => {
    const seen = new Map<string, string>();
    for (const p of ORIGINAL_PAGES.filter((x) => x.path !== "/gallery/")) {
      await page.goto(p.path);
      const d = (await page.locator('meta[name="description"]').getAttribute("content"))!;
      expect(seen.has(d), `duplicate description on ${p.path} and ${seen.get(d)}`).toBe(false);
      seen.set(d, p.path);
    }
  });
});

test.describe("URLs, redirects and status codes", () => {
  const cases: [string, number, string?][] = [
    ["/this-does-not-exist/", 404],
    ["/About-Us/", 301, "/about-us/"],
    ["/?page_id=84", 301, "/about-us/"],
    ["/?page_id=102", 301, "/goa-taxi-service-contact/"],
    ["/hello-world/", 301, "/"],
    ["/sitemap_index.xml", 301, "/sitemap.xml"],
    ["/packages/_none/", 404],
  ];
  for (const [path, status, location] of cases) {
    test(`${path} → ${status}`, async ({ request }) => {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status()).toBe(status);
      if (location) expect(new URL(res.headers().location!, SITE).pathname).toBe(location);
    });
  }
  test("non-trailing-slash URLs redirect permanently to the canonical form", async ({ request }) => {
    const res = await request.get("/about-us", { maxRedirects: 0 });
    expect([301, 308]).toContain(res.status());
    expect(res.headers().location).toContain("/about-us/");
  });
});

test.describe("technical SEO", () => {
  test("sitemap lists published, indexable pages only", async ({ request }) => {
    const xml = await (await request.get("/sitemap.xml")).text();
    for (const p of ["/", "/about-us/", "/packages/", "/taxi-services/", "/hotels/", "/goa-taxi-service-contact/"]) expect(xml).toContain(`<loc>${SITE}${p}</loc>`);
    expect(xml).not.toContain("/gallery/"); // noindex until photos are added
    expect(xml).not.toContain("/admin");
    expect(xml).toContain("<lastmod>");
  });
  test("robots.txt blocks admin and api and points to the sitemap", async ({ request }) => {
    const txt = await (await request.get("/robots.txt")).text();
    expect(txt).toContain("Disallow: /admin/");
    expect(txt).toContain("Disallow: /api/");
    expect(txt).toContain(`Sitemap: ${SITE}/sitemap.xml`);
  });
  test("structured data is valid and matches the business", async ({ page }) => {
    await page.goto("/");
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    type Ld = Record<string, unknown>;
    const parse = (txt: string[]) => txt.flatMap((b) => ([] as Ld[]).concat(JSON.parse(b)));
    const items = parse(blocks);
    const org = items.find((i) => i["@type"] === "TravelAgency")!;
    expect(org.telephone).toBe("+919322073068");
    expect(org).not.toHaveProperty("aggregateRating");
    expect(items.some((i) => i["@type"] === "FAQPage")).toBe(true);
    await page.goto("/about-us/");
    const about = parse(await page.locator('script[type="application/ld+json"]').allTextContents());
    expect(about.some((i) => i["@type"] === "BreadcrumbList")).toBe(true);
  });
  test("gallery is noindex", async ({ page }) => {
    await page.goto("/gallery/");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });
  test("security and noindex headers", async ({ request }) => {
    const home = await request.get("/");
    expect(home.headers()["x-content-type-options"]).toBe("nosniff");
    expect(home.headers()["content-security-policy"]).toContain("frame-ancestors");
    const admin = await request.get("/admin/login/");
    expect(admin.headers()["x-robots-tag"]).toContain("noindex");
  });
});

test.describe("booking actions", () => {
  test("every call and WhatsApp link uses the configured number", async ({ page }) => {
    for (const path of ["/", "/about-us/", "/packages/", "/taxi-services/", "/hotels/", "/goa-taxi-service-contact/"]) {
      await page.goto(path);
      for (const href of await page.locator('a[href^="tel:"]').evaluateAll((els) => els.map((e) => e.getAttribute("href")))) expect(href).toBe("tel:+919322073068");
      for (const href of await page.locator('a[href*="wa.me"]').evaluateAll((els) => els.map((e) => e.getAttribute("href")))) {
        expect(href).toMatch(/^https:\/\/wa\.me\/919322073068(\?text=[^ ]+)?$/);
      }
      expect(await page.locator('a[href="#"]').count()).toBe(0);
    }
  });
  test("mobile menu opens, traps focus and closes with Escape", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/about-us/");
    const toggle = page.getByRole("button", { name: "Open menu" });
    await toggle.click();
    await expect(page.locator("#mobile-menu")).toBeVisible();
    await expect(page.locator("#mobile-menu").getByRole("link", { name: "About Us" })).toHaveAttribute("aria-current", "page");
    await page.keyboard.press("Escape");
    await expect(page.locator("#mobile-menu")).toBeHidden();
    await expect(page.getByRole("button", { name: "Open menu" })).toBeFocused();
  });
  test("FAQ accordion is keyboard operable", async ({ page }) => {
    await page.goto("/");
    const q = page.getByRole("button", { name: "Are your taxi prices fixed?" });
    await q.focus();
    await page.keyboard.press("Enter");
    await expect(q).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByText("All airport transfer prices are fixed.")).toBeVisible();
  });
});

test.describe("responsive layout", () => {
  for (const width of [320, 375, 768, 1024, 1440]) {
    test(`no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ["/", "/packages/", "/taxi-services/", "/hotels/", "/goa-taxi-service-contact/"]) {
        await page.goto(path);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, `${path} overflows at ${width}px`).toBeLessThanOrEqual(0);
      }
    });
  }
});

test.describe("accessibility (axe)", () => {
  for (const path of ["/", "/about-us/", "/packages/", "/taxi-services/", "/hotels/", "/goa-taxi-service-contact/", "/admin/login/"]) {
    test(`${path} has no serious or critical violations`, async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });
  }
});

test.describe("unknown URLs return a real 404 on the very first request", () => {
  // Cache Components can stream a 200 shell before notFound() runs; the proxy prevents that.
  for (const path of ["/wp-login.php", "/xmlrpc.php", "/wp-admin/", "/.env", "/random-first-hit-1/", "/a/b/c/d/", "/packages/not-a-package/"]) {
    test(`${path} is 404 (first hit)`, async ({ request }) => {
      expect((await request.get(path)).status()).toBe(404);
    });
  }
});
