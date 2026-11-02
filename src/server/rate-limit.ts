import "server-only";
import { and, eq, sql } from "@/server/db/orm";
import { db, schema } from "./db/client";
import { sha256 } from "./crypto";

/**
 * Fixed-window counter stored in the database so limits hold across restarts and multiple processes.
 * Returns true when the request is allowed.
 */
export async function rateLimit(bucket: string, key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const hashedKey = sha256(key);
  const where = and(eq(schema.rateLimits.bucket, bucket), eq(schema.rateLimits.key, hashedKey));
  const now = new Date();
  const [row] = await db.select().from(schema.rateLimits).where(where).limit(1);
  if (!row) {
    try {
      await db.insert(schema.rateLimits).values({ bucket, key: hashedKey, count: 1, windowStart: now });
    } catch {
      await db.update(schema.rateLimits).set({ count: sql`${schema.rateLimits.count} + 1` }).where(where);
    }
  } else if (row.windowStart.getTime() < now.getTime() - windowSeconds * 1000) {
    await db.update(schema.rateLimits).set({ count: 1, windowStart: now }).where(where);
  } else {
    await db.update(schema.rateLimits).set({ count: sql`${schema.rateLimits.count} + 1` }).where(where);
  }
  const [after] = await db.select().from(schema.rateLimits).where(where).limit(1);
  return (after?.count ?? 0) <= limit;
}
