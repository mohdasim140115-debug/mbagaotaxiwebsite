# Deployment Guide (short)

The site is a **Next.js 16 server app + MySQL 8**. It needs a host that can run `next start` (a long-running Node.js process). PHP-only shared hosting cannot run it. The old WordPress site is not touched by anything below.

## Requirements
- Node.js **20.9+** (developed on 24), MySQL **8.0+** (`utf8mb4`), ~1 GB RAM, a **persistent folder** for uploaded images (`STORAGE_DIR`).
- Best fit: a **VPS** (Hostinger VPS or any Linux VPS), or a Node.js host with a persistent disk and MySQL. Run it behind nginx/Caddy with HTTPS.

## Environment variables (copy `.env.example`, never commit real values)
| Variable | Meaning |
|---|---|
| `DATABASE_URL` | `mysql://user:pass@host:3306/db` — use a user with only the rights it needs |
| `SITE_URL` | `https://mbatravelsgoa.com` (no trailing slash) |
| `APP_SECRET` | 32+ random characters |
| `STORAGE_DIR` | persistent upload folder |
| `STAGING` | `true` on test servers (blocks Google indexing) |
| `CRON_SECRET` | 16+ characters, for scheduled publishing |
| `SMTP_*` | optional, for new-enquiry e-mails |

## First deploy (order matters)
```bash
npm ci
npm run db:migrate      # create tables
npm run db:seed         # ONLY on an empty DB; imports the site content (needs docs/source-snapshot and internet once)
npm run admin:create -- --email you@example.com --name "Your Name"   # prints a one-time password
npm run build           # needs the DB, pages are built from it
npm start               # port 3000 (set PORT to change)
```
nginx must pass `Host` and `X-Forwarded-For` and allow uploads up to 12 MB.

Scheduled publishing (optional), every 5 minutes:
`curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://mbatravelsgoa.com/api/cron/publish-scheduled/`

## Go-live checklist (do NOT replace the live site before this passes)
1. Deploy to a **staging** subdomain with `STAGING=true`; check every page, the admin and the enquiry form.
2. Answer the items in `docs/open-questions.md` (prices, phone number, photos, reviews, privacy policy).
3. Take a full backup of the old WordPress site (files + database) and keep it 90 days.
4. Point the domain at the new server. Keep the old host untouched until traffic looks healthy.
5. Submit `https://mbatravelsgoa.com/sitemap.xml` in Google Search Console and watch the Redirects/Coverage reports.
6. Rollback = point the domain back to the old host.

Old URLs (`/?page_id=84`, `/sitemap_index.xml`, `/hello-world/`, etc.) are already set up as redirects (Admin → Redirects). `/About-Us/` style upper-case URLs and `www` redirect automatically.

## Backups
Back up **both** the database and the uploads folder, nightly: `scripts/backup.sh` does both (needs `mysqldump`). To restore: create the database, `gunzip -c db-*.sql.gz | mysql <db>`, extract the uploads archive into `STORAGE_DIR`, run `npm run db:migrate`, restart. A restore drill has not been done yet; do one on staging.

## Privacy
IP addresses are stored only as a keyed hash. Enquiries are kept 24 months by default (Admin → Site settings); Admin → Enquiries can delete a person's data on request. **A privacy policy page does not exist yet and is needed before collecting leads.**

## Tests (before every release)
`npm run typecheck`, `npm test`, `npm run test:e2e` (uses a separate `*_test` database, never production).
