import "server-only";
import { db, schema } from "./db/client";
import { getClientIpHash } from "./request";

export async function audit(
  userId: number | null,
  action: string,
  entityType: string | null,
  entityId: string | number | null,
  summary = "",
) {
  let ipHash: string | null = null;
  try {
    ipHash = await getClientIpHash();
  } catch {
    // Called outside a request (scripts): no IP available.
  }
  await db.insert(schema.auditLogs).values({
    userId,
    action,
    entityType,
    entityId: entityId === null ? null : String(entityId),
    summary: summary.slice(0, 500),
    ipHash,
  });
}
