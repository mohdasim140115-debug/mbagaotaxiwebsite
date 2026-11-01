import "server-only";
import { sql } from "drizzle-orm";
import { db, schema } from "./db/client";
import { sha256 } from "./crypto";

/**
 * Fixed-window counter stored in MySQL so limits hold across restarts and multiple processes.
 * Returns true when the request is allowed.
 */
export async function rateLimit(bucket: string, key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const hashedKey = sha256(key);
  // Atomically reset the window if it expired, otherwise increment.
  await db.execute(sql`
    INSERT INTO ${schema.rateLimits} (bucket, \`key\`, count, window_start)
    VALUES (${bucket}, ${hashedKey}, 1, UTC_TIMESTAMP())
    ON DUPLICATE KEY UPDATE
      count = IF(window_start < UTC_TIMESTAMP() - INTERVAL ${windowSeconds} SECOND, 1, count + 1),
      window_start = IF(window_start < UTC_TIMESTAMP() - INTERVAL ${windowSeconds} SECOND, UTC_TIMESTAMP(), window_start)
  `);
  const [rows] = (await db.execute(
    sql`SELECT count FROM ${schema.rateLimits} WHERE bucket = ${bucket} AND \`key\` = ${hashedKey}`,
  )) as unknown as [{ count: number }[]];
  return (rows[0]?.count ?? 0) <= limit;
}
