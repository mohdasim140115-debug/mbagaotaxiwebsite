/*
 * Seeds a fresh database with roles, settings and the content migrated from the live site.
 * Usage:  npx tsx scripts/seed/index.mts            (refuses if content already exists)
 *         npx tsx scripts/seed/index.mts --force    (wipes content tables first — dev/test only)
 */
import { config } from "dotenv";
config({ path: process.env.ENV_FILE ?? ".env.local" });

import { createHash, randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";
import sharp from "sharp";
import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";
import * as schema from "../../src/server/db/schema";
import { ROLES, PERMISSIONS } from "../../src/lib/permissions";
import { DEFAULT_SETTINGS, PRIVATE_SETTING_KEYS } from "../../src/lib/cms/settings-def";
import { sectionSchema, type SectionType } from "../../src/lib/cms/sections";
import { slugify } from "../../src/lib/utils";
import * as C from "./content";

const ROOT = process.cwd();
const UPLOADS = path.join(ROOT, "docs/source-snapshot/uploads");
const CACHE = path.join(ROOT, ".local/seed-cache");
const STORAGE = path.resolve(ROOT, process.env.STORAGE_DIR ?? "./storage/uploads");

const conn = await mysql.createConnection({ uri: process.env.DATABASE_URL!, multipleStatements: true });
const db = drizzle(conn, { schema, mode: "default" });

const CONTENT_TABLES = [
  "migration_map", "content_revisions", "seo_metadata", "media_usages", "page_sections", "pages", "navigation_items",
  "package_images", "packages", "services", "vehicle_fares", "vehicle_images", "vehicles", "hotel_images", "hotels",
  "destinations", "testimonials", "faqs", "redirects", "site_settings", "analytics_configuration", "media",
];

async function guard() {
  const [rows] = (await conn.query("SELECT (SELECT COUNT(*) FROM pages) + (SELECT COUNT(*) FROM media) AS n")) as unknown as [{ n: number }[]];
  if (rows[0]!.n > 0) {
    if (!process.argv.includes("--force")) {
      console.error("Content already exists. Re-run with --force to wipe and reseed (never on production).");
      process.exit(1);
    }
    await conn.query("SET FOREIGN_KEY_CHECKS = 0");
    for (const t of CONTENT_TABLES) await conn.query(`TRUNCATE TABLE \`${t}\``);
    await conn.query("SET FOREIGN_KEY_CHECKS = 1");
  }
}

/* ------------------------------------------------------------------ access control */

async function seedAccess() {
  for (const [key, description] of Object.entries(PERMISSIONS)) {
    await db.insert(schema.permissions).values({ key, description }).onDuplicateKeyUpdate({ set: { description } });
  }
  for (const [key, role] of Object.entries(ROLES)) {
    await db.insert(schema.roles).values({ key, name: role.name, description: role.description }).onDuplicateKeyUpdate({ set: { name: role.name, description: role.description } });
    await db.delete(schema.rolePermissions).where(sql`role_key = ${key}`);
    for (const p of role.permissions) await db.insert(schema.rolePermissions).values({ roleKey: key, permissionKey: p });
  }
}

/* ------------------------------------------------------------------ media */

const mediaIds: Record<string, number> = {};

async function loadSource(img: { file?: string; asset?: string; url?: string }): Promise<Buffer> {
  if (img.file) return readFile(path.join(UPLOADS, img.file));
  if (img.asset) return readFile(path.join(ROOT, "scripts/seed/assets", img.asset));
  await mkdir(CACHE, { recursive: true });
  const cached = path.join(CACHE, createHash("sha1").update(img.url!).digest("hex"));
  if (existsSync(cached)) return readFile(cached);
  let res: Response | null = null;
  for (let attempt = 1; attempt <= 6; attempt++) {
    res = await fetch(img.url!, { headers: { "User-Agent": "MBA-Travels-site-rebuild/1.0 (content migration)" } });
    if (res.status !== 429 && res.status < 500) break;
    const wait = Number(res.headers.get("retry-after")) * 1000 || attempt * 8000;
    console.log(`\n  ${res.status} from image host, retrying in ${Math.round(wait / 1000)}s…`);
    await new Promise((r) => setTimeout(r, wait));
  }
  if (!res || !res.ok) throw new Error(`Download failed ${res?.status} ${img.url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(cached, buf);
  await new Promise((r) => setTimeout(r, 400)); // be polite to image hosts
  return buf;
}

async function importImage(opts: { key: string; buffer: Buffer; name: string; alt: string; licence: "owner" | "licensed" | "pending"; credit: string; sourceUrl: string; note?: string; sourcePage: string }) {
  const { data, info } = await sharp(opts.buffer)
    .rotate()
    .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });
  const base = slugify(opts.name).slice(0, 80) || "image";
  const storageKey = `${base}-${randomBytes(4).toString("hex")}.webp`;
  await mkdir(STORAGE, { recursive: true });
  await writeFile(path.join(STORAGE, storageKey), data);
  const [res] = await db.insert(schema.media).values({
    filename: `${base}.webp`,
    storageKey,
    mime: "image/webp",
    bytes: data.byteLength,
    width: info.width,
    height: info.height,
    altText: opts.alt,
    credit: opts.credit,
    licenceStatus: opts.licence,
    sourceUrl: opts.sourceUrl,
    sha256: createHash("sha256").update(data).digest("hex"),
  });
  mediaIds[opts.key] = res.insertId;
  await mapItem(opts.sourcePage, `image ${opts.sourceUrl}`, "media", res.insertId, opts.note ?? null, opts.licence !== "owner" && opts.licence !== "licensed");
  return res.insertId;
}

async function seedMedia() {
  const imagePages: Record<string, string> = { logo: C.SRC.home, "contact-og": C.SRC.contact };
  for (const img of C.IMAGES) {
    const buffer = await loadSource(img);
    await importImage({ key: img.key, buffer, name: img.alt, alt: img.alt, licence: img.licence, credit: img.credit, sourceUrl: img.sourceUrl, note: img.note, sourcePage: imagePages[img.key] ?? C.SRC.home });
    process.stdout.write(".");
  }
  for (const [hotel, parts] of Object.entries(C.HOTEL_IMAGES)) {
    for (const [i, part] of parts.entries()) {
      const file = C.hotelFile(part);
      const buffer = await readFile(path.join(UPLOADS, file));
      await importImage({
        key: `hotel:${hotel}:${i}`,
        buffer,
        name: `${hotel} ${i + 1}`,
        alt: hotel,
        licence: "pending",
        credit: "",
        sourceUrl: `https://mbatravelsgoa.com/wp-content/uploads/2026/08/${file}`,
        note: "Hotel photo uploaded by the business (phone screenshot); confirm permission from the hotel (Q13).",
        sourcePage: C.SRC.hotels,
      });
      process.stdout.write(".");
    }
  }
  console.log(` ${Object.keys(mediaIds).length} images`);
}

const M = (key: string) => {
  const id = mediaIds[key];
  if (!id) throw new Error(`Unknown image key ${key}`);
  return id;
};

/* ------------------------------------------------------------------ helpers */

async function mapItem(sourceUrl: string, ref: string, entityType: string, entityId: number | null, discrepancy: string | null = null, approval = false) {
  await db.insert(schema.migrationMap).values({
    sourceUrl,
    sourceRef: ref.slice(0, 300),
    entityType,
    entityId,
    status: discrepancy ? "migrated_flagged" : "migrated",
    discrepancy,
    approvalRequired: approval || !!discrepancy,
  });
}

async function revision(entityType: string, entityId: number, snapshot: unknown, summary: string) {
  await db.insert(schema.contentRevisions).values({ entityType, entityId, version: 1, snapshot, changeSummary: summary });
}

/* ------------------------------------------------------------------ catalogue */

const packageIds: Record<string, number> = {};

async function seedCatalogue() {
  for (const [i, s] of C.SERVICES.entries()) {
    const row = { title: s.title, slug: slugify(s.title), category: s.category, summary: s.summary, features: s.features, icon: s.icon, ctaLabel: "Book Now", position: i, status: "published" as const, sourceUrl: C.SRC.home };
    const [r] = await db.insert(schema.services).values(row);
    await revision("services", r.insertId, row, "Migrated from live site");
    await mapItem(C.SRC.home, `services card “${s.title}”`, "services", r.insertId);
  }

  for (const [i, p] of C.PACKAGES.entries()) {
    const row = {
      name: p.name, slug: slugify(p.name), summary: p.summary, description: "", destination: "", durationLabel: p.durationLabel, stopsLabel: p.stopsLabel,
      pricePrefix: p.pricePrefix, priceAmount: p.priceAmount, priceSuffix: p.priceSuffix, priceText: p.priceText, badge: p.badge,
      highlights: [], itinerary: [], inclusions: [], exclusions: [], ctaLabel: p.ctaLabel, whatsappMessage: p.whatsappMessage,
      hasDetailPage: false, isFeatured: p.badge === "Popular", position: i, status: "published" as const, notes: p.discrepancy ?? null, sourceUrl: p.source,
    };
    const [r] = await db.insert(schema.packages).values(row);
    packageIds[p.key] = r.insertId;
    await db.insert(schema.packageImages).values({ packageId: r.insertId, mediaId: M(p.image), position: 0 });
    // Snapshots use the editor's shape (images included) so "Restore" on v1 round-trips cleanly.
    await revision("packages", r.insertId, { ...row, images: [M(p.image)] }, "Migrated from live site");
    await mapItem(p.source, `package card “${p.name}”`, "packages", r.insertId, p.discrepancy ?? null);
  }

  for (const [i, v] of C.VEHICLES.entries()) {
    const row = {
      name: v.name, slug: slugify(v.name), fullName: v.fullName, vehicleClass: v.vehicleClass, seatsLabel: v.seatsLabel, seats: v.seats, airportLabel: v.airportLabel,
      luggage: "", badge: "BOARDING PASS", features: [], airportFeatures: v.airportFeatures, hasDetailPage: true, whatsappMessage: v.whatsappMessage, position: i, status: "published" as const, sourceUrl: C.SRC.taxi,
    };
    const [r] = await db.insert(schema.vehicles).values(row);
    const [airport, pkg, hour, km] = v.fares;
    await db.insert(schema.vehicleFares).values([
      { vehicleId: r.insertId, fareType: "airport_transfer", label: "Airport Pickup", amount: airport!, unitLabel: "", position: 0 },
      { vehicleId: r.insertId, fareType: "package_8h_80km", label: "8 Hrs / 80 Km", amount: pkg!, unitLabel: "", position: 1 },
      { vehicleId: r.insertId, fareType: "extra_hour", label: "", amount: hour!, unitLabel: "/ Hour", position: 2 },
      { vehicleId: r.insertId, fareType: "extra_km", label: "", amount: km!, unitLabel: "/ Km", position: 3 },
    ]);
    await db.insert(schema.vehicleImages).values({ vehicleId: r.insertId, mediaId: M(v.image), position: 0 });
    const fareRows = [
      { fareType: "airport_transfer", label: "Airport Pickup", amount: airport!, unitLabel: "", notes: "" },
      { fareType: "package_8h_80km", label: "8 Hrs / 80 Km", amount: pkg!, unitLabel: "", notes: "" },
      { fareType: "extra_hour", label: "", amount: hour!, unitLabel: "/ Hour", notes: "" },
      { fareType: "extra_km", label: "", amount: km!, unitLabel: "/ Km", notes: "" },
    ];
    await revision("vehicles", r.insertId, { ...row, fares: fareRows, images: [M(v.image)] }, "Migrated from live site");
    await mapItem(C.SRC.taxi, `fleet card “${v.name}” + airport card “${v.fullName}”`, "vehicles", r.insertId);
  }

  for (const [i, h] of C.HOTELS.entries()) {
    const row = {
      name: h.name, slug: slugify(h.name), location: "", category: "", description: h.description, pricePrefix: h.pricePrefix, priceAmount: h.priceAmount,
      priceUnit: "", amenities: h.amenities, whatsappMessage: "", position: i, status: "published" as const, sourceUrl: C.SRC.hotels,
    };
    const [r] = await db.insert(schema.hotels).values(row);
    const imgs = C.HOTEL_IMAGES[h.name] ?? [];
    for (let j = 0; j < imgs.length; j++) await db.insert(schema.hotelImages).values({ hotelId: r.insertId, mediaId: M(`hotel:${h.name}:${j}`), position: j });
    await revision("hotels", r.insertId, { ...row, images: imgs.map((_, j) => M(`hotel:${h.name}:${j}`)) }, "Migrated from live site");
    await mapItem(C.SRC.hotels, `hotel card “${h.name}”`, "hotels", r.insertId, "Price unit (per night/room/package) not stated on the live site (Q6).");
  }

  for (const [i, d] of C.DESTINATIONS.entries()) {
    const row = { title: d.title, slug: slugify(d.title), summary: d.summary, imageId: M(d.image), position: i, status: "published" as const, sourceUrl: C.SRC.home };
    const [r] = await db.insert(schema.destinations).values(row);
    await revision("destinations", r.insertId, row, "Migrated from live site");
    await mapItem(C.SRC.home, `experience tile “${d.title}”`, "destinations", r.insertId);
  }

  for (const [i, t] of C.TESTIMONIALS.entries()) {
    // Published as on the live site, but NOT verified: no stars, no review markup until the owner confirms.
    const row = { ...t, rating: 5, source: "Original website", isVerified: false, position: i, status: "published" as const, sourceUrl: C.SRC.home };
    const [r] = await db.insert(schema.testimonials).values(row);
    await revision("testimonials", r.insertId, row, "Migrated from live site");
    await mapItem(C.SRC.home, `testimonial “${t.authorName}”`, "testimonials", r.insertId, "Authenticity unverified; stock avatar (pravatar.cc) not migrated; 5-star display suppressed until verified (Q8).");
  }

  for (const [i, f] of C.FAQS.entries()) {
    const row = { ...f, category: "general", position: i, status: "published" as const, sourceUrl: C.SRC.home };
    const [r] = await db.insert(schema.faqs).values(row);
    await revision("faqs", r.insertId, row, "Migrated from live site");
    await mapItem(C.SRC.home, `FAQ “${f.question}”`, "faqs", r.insertId);
  }
}

/* ------------------------------------------------------------------ pages */

type SeedSection = { type: SectionType; data: Record<string, unknown>; isEnabled?: boolean; note?: string };

const airportData = () => {
  const { image, ...rest } = C.AIRPORT_SECTION;
  return { ...rest, mediaId: M(image) };
};

function pageDefs(): { path: string; title: string; template: string; source: string; seo: { metaTitle?: string; metaDescription: string; robotsIndex?: boolean; ogImage?: string }; sections: SeedSection[] }[] {
  const booking = (label: string, message = "") => ({ label, kind: "booking", href: "", message });
  return [
    {
      path: "/",
      title: "Home",
      template: "home",
      source: C.SRC.home,
      seo: { metaTitle: "Goa Taxi Service & Tours | MBA Travels Goa", metaDescription: "Book reliable Goa taxi service, airport transfers, sightseeing tours and travel services with MBA Travels Goa. Safe, comfortable and affordable Goa travel." },
      sections: [
        { type: "hero", data: { eyebrow: "WELCOME TO MBA TRAVELS", title: "Discover The Soul Of Goa", description: "Get Best Taxi Services in Goa ,Private airport transfers, personalised sightseeing tours, and unforgettable journeys across Goa with professional local drivers.", slides: ["hero-card-1", "hero-card-2", "hero-card-3", "hero-card-4"].map((k) => ({ mediaId: M(k) })), primaryCta: { label: "Explore Tours", kind: "link", href: "/packages/", message: "" }, secondaryCta: booking("Book Your Ride"), showScrollCue: false,
          cards: [
            { mediaId: M("hero-card-1"), link: { label: "Our Fleet", kind: "link", href: "/taxi-services/", message: "" } },
            { mediaId: M("hero-card-2"), link: { label: "Sightseeing Tours", kind: "link", href: "/packages/", message: "" } },
            { mediaId: M("hero-card-3"), link: { label: "Local Taxi", kind: "link", href: "/taxi-services/", message: "" } },
            { mediaId: M("hero-card-4"), link: { label: "Goa Beaches", kind: "link", href: "/packages/", message: "" } },
          ],
          stats: [{ value: "10", label: "Premium Vehicles", icon: "car" }, { value: "5000", label: "Happy Travellers", icon: "users" }, { value: "8+", label: "Years Of Experience", icon: "clock" }, { value: "6", label: "Tour Packages", icon: "route" }],
          promoEyebrow: "Airport Transfers", promoTitle: "Luxury Airport Pickup & Drop Service", promoText: "Enjoy hassle-free airport transfers from Dabolim and Mopa Airport.", promoMediaId: M("vehicle-crysta"), promoCta: { label: "Airport Transfers", kind: "link", href: "/taxi-services/", message: "" } }, note: "Hero CTAs pointed to “#” on the live site; now /packages/ and the booking link (Q19)." },
        { type: "rich_text", isEnabled: false, data: { title: C.HOME_HIDDEN_COPY.title, headingLevel: "h2", body: C.HOME_HIDDEN_COPY.body, width: "prose", background: "paper" }, note: "Hidden behind the hero slider on the live site and cut off mid-sentence. Migrated verbatim but disabled — enable after review (Q15)." },
        { type: "services", data: { eyebrow: "COMPLETE TRAVEL SOLUTIONS", title: "Everything You Need For Your Goa Trip", headingLevel: "h2", description: "From flights to hotels, taxi services in Goa ,to holiday packages, MBA Travels provides complete travel solutions under one roof." } },
        { type: "packages", data: { eyebrow: "GOA TOUR PACKAGES", title: "Discover The Best Of Goa", headingLevel: "h2", description: "Explore Goa with carefully planned sightseeing packages designed for couples, families and groups.", items: C.HOME_PACKAGE_ITEMS.map((it) => ({ packageId: packageIds[it.key], priceOverride: it.priceOverride ?? "", unitOverride: it.unitOverride ?? "", hidePrice: it.hidePrice ?? false })), showCallButton: true } },
        { type: "feature_split", data: { eyebrow: "WHY CHOOSE US", title: "Discover Goa With Trusted Local Experts", headingLevel: "h2", description: "From seamless airport pickups to personalised sightseeing experiences, MBA Travels ensures every journey across Goa is comfortable, reliable and unforgettable.", mediaId: M("hero-3"), features: [{ title: "Professional Drivers", text: "Friendly local experts who know Goa inside out." }, { title: "Transparent Pricing", text: "No hidden charges. Honest fares every time." }, { title: "24×7 Availability", text: "Book your ride anytime, day or night." }, { title: "Comfortable Vehicles", text: "Clean, air-conditioned and regularly maintained." }], cta: { label: "Learn More", kind: "link", href: "/about-us/", message: "" } }, note: "Original image hotlinked from images.openai.com; replaced with the site’s own Unsplash image. “Learn More” pointed to “#”." },
        { type: "fleet", data: { eyebrow: "OUR FLEET", title: "Choose Your Perfect Ride", headingLevel: "h2", description: "Best taxi Services in Goa get Clean, comfortable and well-maintained vehicles for airport transfers,sightseeing and customised Goa tours.", showCallButton: true } },
        { type: "airport", data: airportData() },
        { type: "feature_cards", data: { eyebrow: "HOW TO BOOK", title: "How to Book a Goa Taxi", headingLevel: "h2", description: "Our team discusses availability, pricing and booking arrangements with you before you confirm your journey.", items: [{ title: "Share Your Trip Details", text: "Tell us your pickup location, destination, travel date and preferred time.", icon: "map-pinned" }, { title: "Confirm Your Fare", text: "We confirm availability and the fare with you before the ride.", icon: "wallet" }, { title: "Get Picked Up", text: "Your driver meets you at the agreed point, including pickups at Dabolim and Mopa Airport.", icon: "car-taxi-front" }, { title: "Pay Your Way", text: "We accept cash, UPI, Google Pay, PhonePe and bank transfers.", icon: "badge-check" }] }, note: "New section added for the taxi-first layout; wording derived from the live Contact page and FAQ. Editable in the CMS." },
        { type: "destinations", data: { eyebrow: "EXPLORE GOA", title: "Every Corner Has A Story To Tell", headingLevel: "h2", description: "Discover Goa through breathtaking beaches, rich heritage, thrilling adventures, peaceful nature, and unforgettable nightlife." } },
        { type: "testimonials", data: { eyebrow: "CUSTOMER REVIEWS", title: "Loved By Travellers Across Goa", headingLevel: "h2", description: "We are proud to provide safe, comfortable and reliable taxi services for airport transfers, sightseeing and customised Goa tours." } },
        { type: "faq", data: { eyebrow: "FREQUENTLY ASKED QUESTIONS", title: "Everything You Need To Know", headingLevel: "h2", description: "Find answers to the most common questions about our airport transfers, taxi services, sightseeing tours and bookings in Goa.", category: "general", asideTitle: "Have More Questions?", asideText: "Our team is available 24×7 to help you with airport transfers, sightseeing tours and taxi bookings across Goa.", asideCta: { label: "Ask On WhatsApp", kind: "whatsapp", href: "", message: "" } }, note: "“Ask On WhatsApp” linked to whatsform.com/kkpjba. (404); now opens WhatsApp." },
        { type: "rich_text", data: { title: "", headingLevel: "h2", body: "Our airport transfer and taxi services are available round the clock, including early morning and late-night pickups. We strive to provide our clients with seamless transportation solutions tailored to their needs. For your convenience, we offer a variety of payment options, including cash, UPI, Google Pay, PhonePe, and bank transfers, ensuring a quick and efficient transaction process. Our commitment to reliability and customer satisfaction sets us apart in the transportation industry.", width: "prose", background: "sand" } },
        { type: "rich_text", isEnabled: false, data: { title: "", headingLevel: "h2", body: "Yes\n\nYes\n\nCash And UPI", width: "prose", background: "paper" }, note: "Stray one-word paragraphs below the FAQ on the live site; kept but disabled (Q16)." },
      ],
    },
    {
      path: "/about-us/",
      title: "About Us",
      template: "about",
      source: C.SRC.about,
      seo: { metaDescription: "MBA Travels is committed to making every journey across Goa comfortable, reliable and memorable — airport transfers, taxi rentals, sightseeing tours and hotel bookings." },
      sections: [
        { type: "about_intro", data: { eyebrow: "ABOUT MBA TRAVELS", title: "Your Trusted Travel Partner In Goa", headingLevel: "h1", images: [M("about-1"), M("hero-3")], badgeValue: "8+", badgeLabel: "Years Of Experience", body: "MBA Travels is committed to making every journey across Goa comfortable, reliable and memorable. From airport transfers and taxi rentals to customised sightseeing tours and hotel bookings, we provide complete travel solutions with professional service and transparent pricing.\n\nWhether you’re travelling with family, friends or for business, our experienced team ensures a smooth travel experience from the moment you arrive until your trip concludes.", highlights: ["Professional Drivers", "Transparent Pricing", "Clean & Comfortable Vehicles", "24×7 Customer Support", "Airport Pickup & Drop", "Customized Goa Tour Packages"], cta: { label: "Plan Your Trip", kind: "whatsapp", href: "", message: "Hi, I would like to plan my Goa trip." } }, note: "WhatsApp CTA used 919322072068 (differs from main number); now uses the site WhatsApp setting (Q1)." },
        { type: "feature_cards", data: { eyebrow: "WHY CHOOSE US", title: "Why Thousands Of Travellers Choose MBA Travels", headingLevel: "h2", description: "We combine reliable transportation, professional service, transparent pricing and local expertise to make every journey across Goa comfortable and memorable.", items: [{ title: "Local Experts", text: "Our experienced local drivers know every beach, attraction and hidden destination across Goa, ensuring a smooth and enjoyable journey.", icon: "map-pinned" }, { title: "Transparent Pricing", text: "Enjoy affordable rates with absolutely no hidden charges. What you see is exactly what you pay.", icon: "wallet" }, { title: "Safe & Comfortable", text: "Our clean, well-maintained vehicles and professional drivers ensure a secure and comfortable travel experience every time.", icon: "shield-check" }, { title: "24×7 Customer Support", text: "Whether it’s an airport pickup, taxi booking or sightseeing tour, our team is always ready to assist you whenever you need us.", icon: "headset" }] } },
        { type: "stats", data: { eyebrow: "OUR JOURNEY", title: "Every Journey Begins With Trust", headingLevel: "h2", body: "MBA Travels was founded with one simple mission — to make travelling across Goa comfortable, reliable and completely stress-free. From airport transfers and local sightseeing to customised holiday packages, we have proudly served thousands of travellers with professionalism and care.\n\nEvery booking is handled with attention to detail because we believe every customer deserves a memorable travel experience.", items: [{ value: "5000", label: "Happy Travellers" }, { value: "10", label: "Premium Vehicles" }, { value: "8", label: "Years Experience" }, { value: "4.9★", label: "Customer Rating" }] }, note: "Counters displayed “0” on the live site (no script); values taken from the source data-target attributes. Claims unverified (Q9)." },
        { type: "cta_band", data: { title: "Ready To Explore Goa?", text: "Book your taxi, airport transfer or holiday package today and let MBA Travels make your trip comfortable and memorable.", primaryCta: { label: "WhatsApp Booking", kind: "whatsapp", href: "", message: "Hi, I want to plan my Goa trip." }, secondaryCta: { label: "Call Now", kind: "call", href: "", message: "" } } },
      ],
    },
    {
      path: "/packages/",
      title: "Packages",
      template: "listing",
      source: C.SRC.packages,
      seo: { metaDescription: "Explore Goa with carefully planned sightseeing packages designed for couples, families and groups — North Goa, South Goa, Dudhsagar, cruises and custom tours." },
      sections: [
        { type: "packages", data: { eyebrow: "GOA TOUR PACKAGES", title: "Discover The Best Of Goa", headingLevel: "h1", description: "Explore Goa with carefully planned sightseeing packages designed for couples, families and groups.", items: ["north", "south", "dudhsagar", "sunset", "custom", "airport-sightseeing"].map((k) => ({ packageId: packageIds[k], priceOverride: "", unitOverride: "", hidePrice: false })), showCallButton: false }, note: "Booking buttons used placeholder WhatsApp number 919000000000; now use the site booking setting (Q1)." },
      ],
    },
    {
      path: "/taxi-services/",
      title: "Taxi Services",
      template: "listing",
      source: C.SRC.taxi,
      seo: { metaDescription: "Clean, comfortable and well-maintained vehicles for airport transfers, sightseeing and customised Goa tours — Dzire, Ertiga, Innova and Innova Crysta fares." },
      sections: [
        { type: "fleet", data: { eyebrow: "OUR FLEET", title: "Choose Your Perfect Ride", headingLevel: "h1", description: "Clean, comfortable and well-maintained vehicles for airport transfers, sightseeing and customised Goa tours.", showCallButton: false }, note: "Fleet WhatsApp buttons used placeholder 919000000000 (Q1)." },
        { type: "airport", data: airportData(), note: "Airport buttons used 919002070068 with unencoded spaces (Q1)." },
      ],
    },
    {
      path: "/hotels/",
      title: "Hotels",
      template: "listing",
      source: C.SRC.hotels,
      seo: { metaDescription: "Discover comfortable stays across Goa with the best prices, personalized assistance and instant booking support — handpicked hotels and resorts.", ogImage: "hotel:Royal Nirvana Resort:0" },
      sections: [{ type: "hotels", data: { eyebrow: "GOA HOTELS", title: "Handpicked Hotels & Resorts", headingLevel: "h1", description: "Discover comfortable stays across Goa with the best prices, personalized assistance and instant booking support." } }],
    },
    {
      path: "/gallery/",
      title: "Gallery",
      template: "gallery",
      source: C.SRC.gallery,
      seo: { metaDescription: "Photo gallery — MBA Travels Goa.", robotsIndex: false },
      sections: [{ type: "gallery", data: { title: "Gallery", headingLevel: "h1", images: [] }, note: "Page was empty on the live site; set to noindex until photos are added (Q17)." }],
    },
    {
      path: "/goa-taxi-service-contact/",
      title: "Contact Us",
      template: "contact",
      source: C.SRC.contact,
      seo: { metaTitle: "Goa Taxi Service | Contact MBA Travels Goa", metaDescription: "Looking for a Goa taxi service? Contact MBA Travels Goa for airport transfers, private taxi bookings, sightseeing tours and reliable taxi services across Goa. Get in touch today!", ogImage: "contact-og" },
      sections: [
        { type: "page_header", data: { eyebrow: "MBA TRAVELS GOA", title: "Contact Us", headingLevel: "h1", description: "Looking for a reliable Goa Taxi Service? Contact MBA Travels Goa for comfortable taxi rides, airport transfers and sightseeing tours across Goa." } },
        { type: "contact", data: { title: "Get in Touch with MBA Travels Goa", text: "Planning your Goa holiday? Contact us to discuss your travel plans, pickup location, destination and taxi requirements. We help you plan convenient journeys around Goa.", servicesTitle: "Our Taxi Services", servicesList: ["Goa airport transfers", "Private taxi service across Goa", "Goa sightseeing tours", "Hotel pickups and drop-offs"], bookTitle: "Book Your Ride", bookText: "Contact our team to enquire about availability and your travel requirements.", bookCta: { label: "Contact Us on WhatsApp", kind: "whatsapp", href: "", message: "" }, bookNote: "Please use our verified business WhatsApp number to complete your booking.", showForm: true, formTitle: "Send an enquiry" }, note: "Broken inline style on the WhatsApp link fixed. Enquiry form is new (stores leads in the CMS)." },
        { type: "rich_text", data: { title: "", headingLevel: "h2", body: C.CONTACT_BODY, width: "prose", background: "sand" } },
      ],
    },
    {
      path: "/blog/",
      title: "Blog",
      template: "listing",
      source: C.SRC.home,
      seo: { metaDescription: "Taxi and travel articles for your Goa trip from MBA Travels Goa.", robotsIndex: false },
      sections: [
        { type: "page_header", data: { eyebrow: "MBA TRAVELS GOA", title: "Blog", headingLevel: "h1", description: "Taxi and travel articles for your Goa trip." }, note: "New page. Set to noindex until the first article is published; enable indexing in the page's SEO panel then." },
        { type: "blog_posts", data: { eyebrow: "", title: "", headingLevel: "h2", description: "", limit: 12 } },
      ],
    },
  ];
}

async function seedPages() {
  for (const def of pageDefs()) {
    if (def.path === "/") {
      // Taxi-first homepage: fleet and airport transfers directly after the hero.
      const rank: Record<string, number> = { hero: 0, fleet: 1, airport: 2, feature_cards: 3, services: 4, packages: 5, feature_split: 6, destinations: 7, testimonials: 8, faq: 9, rich_text: 10 };
      def.sections = [...def.sections].sort((a, b) => (rank[a.type] ?? 99) - (rank[b.type] ?? 99));
    }
    const sections = def.sections.map((s) => ({ type: s.type, isEnabled: s.isEnabled ?? true, data: sectionSchema(s.type).parse(s.data) as Record<string, unknown> }));
    const snapshot = { title: def.title, sections };
    const [r] = await db.insert(schema.pages).values({
      path: def.path, title: def.title, template: def.template, status: "published", isSystem: true, publishedAt: new Date(), publishedData: snapshot, sourceUrl: def.source,
    });
    for (const [i, s] of sections.entries()) await db.insert(schema.pageSections).values({ pageId: r.insertId, type: s.type, position: i, isEnabled: s.isEnabled, data: s.data });
    await db.insert(schema.seoMetadata).values({
      entityType: "page", entityId: r.insertId, metaTitle: def.seo.metaTitle ?? "", metaDescription: def.seo.metaDescription,
      robotsIndex: def.seo.robotsIndex ?? true, ogImageId: def.seo.ogImage ? M(def.seo.ogImage) : null,
    });
    await revision("pages", r.insertId, snapshot, "Migrated from live site");
    await mapItem(def.source, `page ${def.path}`, "pages", r.insertId);
    for (const [i, s] of def.sections.entries()) {
      await mapItem(def.source, `section ${i + 1} (${s.type})${s.isEnabled === false ? " [disabled]" : ""}`, "page_sections", r.insertId, s.note ?? null);
    }
  }
}

/* ------------------------------------------------------------------ navigation, settings, redirects */

async function seedNavigation() {
  const items: [string, string][] = [
    ["Home", "/"], ["Taxi Services", "/taxi-services/"], ["Packages", "/packages/"], ["About Us", "/about-us/"],
    ["Hotels", "/hotels/"], ["Gallery", "/gallery/"], ["Blog", "/blog/"], ["Contact Us", "/goa-taxi-service-contact/"],
  ];
  for (const [i, [label, href]] of items.entries()) {
    const [r] = await db.insert(schema.navigationItems).values({ menu: "header", label, href, position: i });
    await mapItem(C.SRC.home, `header menu “${label}”`, "navigation_items", r.insertId);
  }
  await db.insert(schema.navigationItems).values({ menu: "legal", label: "Image credits", href: "/image-credits/", position: 0 });
}

async function seedSettings() {
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await db.insert(schema.siteSettings).values({ key, value, isPublic: !(PRIVATE_SETTING_KEYS as readonly string[]).includes(key) });
  }
  await db.update(schema.siteSettings).set({ value: M("logo") }).where(sql`\`key\` = 'logoMediaId'`);
  await db.update(schema.siteSettings).set({ value: M("hero-1") }).where(sql`\`key\` = 'defaultOgImageId'`);
  await mapItem(C.SRC.home, "contact details (schema.org LocalBusiness + tel: links)", "site_settings", null, "Four different phone/WhatsApp numbers on the live site; +91 93220 73068 used everywhere (Q1).");
  for (const provider of schema.ANALYTICS_PROVIDERS) {
    await db.insert(schema.analyticsConfiguration).values({ provider, isEnabled: false, requiresConsent: provider !== "gsc_verification" });
  }
}

async function seedRedirects() {
  const legacy: [string, string, string][] = [
    ["/?page_id=11", "/", "WordPress shortlink (page 11)"],
    ["/?page_id=84", "/about-us/", "WordPress shortlink (page 84)"],
    ["/?page_id=92", "/packages/", "WordPress shortlink (page 92)"],
    ["/?page_id=96", "/taxi-services/", "WordPress shortlink (page 96)"],
    ["/?page_id=100", "/gallery/", "WordPress shortlink (page 100)"],
    ["/?page_id=102", "/goa-taxi-service-contact/", "WordPress shortlink (page 102)"],
    ["/?page_id=127", "/hotels/", "WordPress shortlink (page 127)"],
    ["/sitemap_index.xml", "/sitemap.xml", "Rank Math sitemap index"],
    ["/page-sitemap.xml", "/sitemap.xml", "Rank Math page sitemap"],
    ["/post-sitemap.xml", "/sitemap.xml", "Rank Math post sitemap"],
    ["/category-sitemap.xml", "/sitemap.xml", "Rank Math category sitemap"],
    ["/hello-world/", "/", "WordPress sample post — REQUIRES APPROVAL (Q18): 301 to home or 410"],
    ["/?p=1", "/", "Sample post shortlink — REQUIRES APPROVAL (Q18)"],
    ["/category/blog/", "/blog/", "Old WordPress blog category now points to the new blog"],
    ["/feed/", "/", "RSS of sample post — REQUIRES APPROVAL (Q18)"],
  ];
  for (const [sourcePath, destination, note] of legacy) {
    const [r] = await db.insert(schema.redirects).values({ sourcePath, destination, statusCode: 301, note });
    await mapItem(`https://mbatravelsgoa.com${sourcePath}`, `URL ${sourcePath}`, "redirects", r.insertId, note.includes("APPROVAL") ? note : null);
  }
}

/* ------------------------------------------------------------------ usage index */

async function rebuildMediaUsages() {
  await conn.query("DELETE FROM media_usages");
  await conn.query(`INSERT IGNORE INTO media_usages (media_id, entity_type, entity_id, field)
    SELECT media_id, 'packages', package_id, 'images' FROM package_images
    UNION ALL SELECT media_id, 'vehicles', vehicle_id, 'images' FROM vehicle_images
    UNION ALL SELECT media_id, 'hotels', hotel_id, 'images' FROM hotel_images
    UNION ALL SELECT image_id, 'destinations', id, 'imageId' FROM destinations WHERE image_id IS NOT NULL
    UNION ALL SELECT og_image_id, 'seo', entity_id, CONCAT(entity_type, '.ogImage') FROM seo_metadata WHERE og_image_id IS NOT NULL`);
  const [secs] = (await conn.query("SELECT page_id, type, data FROM page_sections")) as unknown as [{ page_id: number; type: string; data: unknown }[]];
  const { sectionMediaIds } = await import("../../src/lib/cms/sections");
  for (const s of secs) {
    const data = typeof s.data === "string" ? JSON.parse(s.data) : s.data;
    for (const id of sectionMediaIds(s.type as SectionType, data)) {
      await conn.query("INSERT IGNORE INTO media_usages (media_id, entity_type, entity_id, field) VALUES (?, 'pages', ?, ?)", [id, s.page_id, `section.${s.type}`]);
    }
  }
  for (const key of ["logoMediaId", "defaultOgImageId"]) {
    await conn.query("INSERT IGNORE INTO media_usages (media_id, entity_type, entity_id, field) SELECT CAST(value AS UNSIGNED), 'settings', 0, ? FROM site_settings WHERE `key` = ? AND value <> CAST('null' AS JSON)", [key, key]);
  }
}

/* ------------------------------------------------------------------ run */

await guard();
console.log("Seeding access control…");
await seedAccess();
console.log("Importing images…");
await seedMedia();
console.log("Settings, catalogue, pages, navigation, redirects…");
await seedSettings();
await seedCatalogue();
await seedPages();
await seedNavigation();
await seedRedirects();
await rebuildMediaUsages();
const [[counts]] = (await conn.query(
  "SELECT (SELECT COUNT(*) FROM pages) pages, (SELECT COUNT(*) FROM page_sections) sections, (SELECT COUNT(*) FROM media) media, (SELECT COUNT(*) FROM packages) packages, (SELECT COUNT(*) FROM vehicles) vehicles, (SELECT COUNT(*) FROM hotels) hotels, (SELECT COUNT(*) FROM migration_map) mapped",
)) as unknown as [[Record<string, number>]];
console.log("Done:", counts);
await conn.end();
