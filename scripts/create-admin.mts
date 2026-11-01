/*
 * Creates (or resets) an admin account from the command line. There is no public registration.
 * Usage: npx tsx scripts/create-admin.mts --email you@example.com --name "Your Name" [--role super_admin]
 * The password is read from ADMIN_PASSWORD, or a strong one is generated and printed once.
 * The user must change a generated password at first login.
 */
import { config } from "dotenv";
config({ path: process.env.ENV_FILE ?? ".env.local" });

import { randomBytes } from "node:crypto";
import mysql from "mysql2/promise";
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

const conn = await mysql.createConnection({ uri: process.env.DATABASE_URL! });
const passwordHash = await hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1, outputLen: 32 });
await conn.query(
  `INSERT INTO admin_users (email, name, password_hash, role_key, is_active, must_change_password, password_changed_at)
   VALUES (?, ?, ?, ?, 1, ?, UTC_TIMESTAMP())
   ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = VALUES(password_hash), role_key = VALUES(role_key),
     is_active = 1, failed_logins = 0, locked_until = NULL, must_change_password = VALUES(must_change_password), password_changed_at = UTC_TIMESTAMP()`,
  [email, name, passwordHash, role, generated ? 1 : 0],
);
await conn.query("INSERT INTO audit_logs (action, entity_type, entity_id, summary) VALUES ('user.cli_create', 'admin_users', ?, ?)", [email, `CLI create/reset (${role})`]);
await conn.end();
console.log(`Admin ready: ${email} (${role})`);
if (generated) console.log(`Temporary password (shown once, must be changed at first login): ${password}`);
