# MBA Travels Goa — website and admin CMS

Next.js 16 (App Router, TypeScript, Tailwind CSS v4) + MySQL 8. A rebuild of https://mbatravelsgoa.com/ that preserves its content and URLs, adds a secure admin CMS, native enquiry capture and technical SEO.

* **Public site** — server-rendered, cached with Cache Components; every page is built from CMS sections.
* **Admin** — `/admin/` (pages & section builder, packages, services, fleet & fares, hotels, destinations, FAQs, testimonials, media library, navigation, redirects, SEO overview, site settings & analytics, users & roles, enquiries with CSV export, audit log, migration report).

## Local development

Requirements: Node.js ≥ 20.9, MySQL 8.

```bash
npm install
cp .env.example .env.local          # fill in DATABASE_URL, SITE_URL, APP_SECRET
npm run db:migrate
npm run db:seed                     # imports the migrated site content (needs internet once, for licensed images)
npm run admin:create -- --email you@example.com --name "You"
npm run dev                         # http://localhost:3000  ·  admin at /admin/
```

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Standard Next.js |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | Playwright suite against an isolated `*_test` database (builds, reseeds, starts on :3100) |
| `npm run db:generate` | Generate a SQL migration after editing `src/server/db/schema.ts` |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Seed an empty database (`-- --force` wipes content: dev/test only) |
| `npm run admin:create` | Create/reset an admin user from the CLI (there is no public registration) |

## Layout

```
src/app/(site)        public routes (catch-all CMS page, package detail, image credits)
src/app/admin         protected CMS
src/app/api           enquiries (public), media upload, CSV export, scheduled publish
src/components        ui primitives · site chrome · sections (one per CMS section type) · admin editors
src/lib               permissions, field/section/entity definitions, validation, redirects, CTA resolution
src/server            db (Drizzle schema + client), auth (Argon2id, DB sessions), cms stores, seo, media, enquiries
src/proxy.ts          canonical host, lowercase redirect, CMS redirects, real 404 status for unknown URLs
drizzle/              SQL migrations
scripts/              migrate, seed (content from the audit), create-admin, backup
tests/                unit (Vitest) and e2e (Playwright + axe)
```

## Security notes

Argon2id passwords; opaque server-side sessions (12 h absolute / 2 h idle, revocable, `HttpOnly`, `SameSite=Lax`, `__Host-` prefix and `Secure` in production); every admin action re-checks permissions on the server; login throttling and lockout; DB-backed rate limits on public enquiries; honeypot and minimum-fill-time checks; uploads are decoded and re-encoded (no executable content can be stored); IP addresses are stored only as keyed hashes; CSV export neutralises spreadsheet formulas; security headers and a CSP are set in `next.config.ts`.
