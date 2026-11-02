// Prepares the isolated test database, builds, and starts a production server for Playwright.
// Usage: node scripts/e2e-server.mjs   (env comes from .env.test; never points at production)
import { execSync, spawn } from "node:child_process";
import { readFileSync, rmSync, cpSync } from "node:fs";
import { parse } from "dotenv";

const env = { ...process.env, ...parse(readFileSync(".env.test")), ENV_FILE: ".env.test" };
if (!/_test\b/.test(env.DATABASE_URL)) throw new Error("Refusing to run: DATABASE_URL must point at a *_test database");

const run = (cmd, extra = {}) => execSync(cmd, { stdio: "inherit", env: { ...env, ...extra } });
const { MongoClient } = await import("mongodb");
const client = await new MongoClient(env.DATABASE_URL).connect();
await client.db().dropDatabase();
await client.close();
rmSync(env.STORAGE_DIR, { recursive: true, force: true });

run("npx tsx scripts/migrate.ts");
run("npx tsx scripts/seed/index.mts");
const users = [
  ["admin@test.local", "Test Admin", "super_admin"],
  ["editor@test.local", "Test Editor", "content_editor"],
  ["leads@test.local", "Test Leads", "enquiry_manager"],
];
for (const [email, name, role] of users) run(`npx tsx scripts/create-admin.mts --email ${email} --name "${name}" --role ${role}`, { ADMIN_PASSWORD: "E2E-Test-Password-123" });

if (!process.env.E2E_SKIP_BUILD) run("npx next build");
cpSync(".next/static", ".next/standalone/.next/static", { recursive: true });
cpSync("public", ".next/standalone/public", { recursive: true });
const server = spawn("node", [".next/standalone/server.js"], { stdio: "inherit", env: { ...env, PORT: "3100", HOSTNAME: "localhost" } });
process.on("SIGTERM", () => server.kill());
process.on("SIGINT", () => server.kill());
