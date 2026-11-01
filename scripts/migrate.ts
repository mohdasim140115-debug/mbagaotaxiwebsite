// Applies pending SQL migrations from ./drizzle. Usage: ENV_FILE=.env.production npx tsx scripts/migrate.ts
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";

config({ path: process.env.ENV_FILE ?? ".env.local" });

async function main() {
  const connection = await mysql.createConnection({ uri: process.env.DATABASE_URL!, multipleStatements: true });
  await migrate(drizzle(connection), { migrationsFolder: "./drizzle" });
  await connection.end();
  console.log("Migrations applied.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
