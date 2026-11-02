/*
 * Creates (or resets) an admin account from the command line. There is no public registration.
 * Usage: npx tsx scripts/create-admin.mts --email you@example.com --name "Your Name" [--role super_admin]
 * The password is read from ADMIN_PASSWORD, or a strong one is generated and printed once.
 * The user must change a generated password at first login.
 */
import { config } from "dotenv";
config({ path: process.env.ENV_FILE ?? ".env.local" });

import { randomBytes } from "node:crypto";
import { eq } from "../src/server/db/orm/kit";
import { Database, closeDb, ensureSchema } from "../src/server/db/orm/engine";
import * as schema from "../src/server/db/schema";
import { hash } from "@node-rs/argon2";
import { ROLES } from "../src/lib/permissions";

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

const email = arg("email")?.trim().toLowerCase();
const name = arg("name")?.trim() || "Administrator";
const role = arg("role") ?? "super_admin";
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error("Provide --email");
  process.exit(1);
}
if (!ROLES[role]) {
  console.error(`Unknown role. Use one of: ${Object.keys(ROLES).join(", ")}`);
  process.exit(1);
}

const generated = !process.env.ADMIN_PASSWORD;
const password = process.env.ADMIN_PASSWORD ?? randomBytes(12).toString("base64url");
if (password.length < 12) {
  console.error("ADMIN_PASSWORD must be at least 12 characters");
  process.exit(1);
}

await ensureSchema();
const db = new Database();
const passwordHash = await hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1, outputLen: 32 });
const now = new Date();
const [existing] = await db.select().from(schema.adminUsers).where(eq(schema.adminUsers.email, email));
const fields = { name, passwordHash, roleKey: role, isActive: true, failedLogins: 0, lockedUntil: null, mustChangePassword: generated, passwordChangedAt: now };
if (existing) await db.update(schema.adminUsers).set(fields).where(eq(schema.adminUsers.id, existing.id));
else await db.insert(schema.adminUsers).values({ email, ...fields });
await db.insert(schema.auditLogs).values({ action: "user.cli_create", entityType: "admin_users", entityId: email, summary: `CLI create/reset (${role})` });
await closeDb();
console.log(`Admin ready: ${email} (${role})`);
if (generated) console.log(`Temporary password (shown once, must be changed at first login): ${password}`);
