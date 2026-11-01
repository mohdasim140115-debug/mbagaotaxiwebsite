// One-off: fills the cloud MySQL (DATABASE_URL in .env.local) and writes the seeded images into
// ./public/uploads so they ship with the Vercel deploy. Commit & push public/uploads afterwards.
// Usage: node scripts/setup-vercel-db.mjs
import { execSync } from "node:child_process";

const env = { ...process.env, STORAGE_DIR: "./public/uploads" };
for (const cmd of ["npx tsx scripts/migrate.ts", "npx tsx scripts/seed/index.mts"]) execSync(cmd, { stdio: "inherit", env });
console.log("\nDone. Now: create the admin user (see docs/deployment.md), then `git add public/uploads && git commit && git push`.");
