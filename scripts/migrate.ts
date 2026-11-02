// Creates the MongoDB collections and indexes (idempotent). Usage: ENV_FILE=.env.production npx tsx scripts/migrate.ts
import { config } from "dotenv";
config({ path: process.env.ENV_FILE ?? ".env.local" });

import "../src/server/db/schema";
import { closeDb, ensureSchema } from "../src/server/db/orm/engine";

ensureSchema()
  .then(async () => {
    await closeDb();
    console.log("Collections and indexes ready.");
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
