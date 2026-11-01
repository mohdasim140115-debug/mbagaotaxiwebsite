import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { publishDuePages } from "@/server/cms/page-store";
import { CMS_TAG } from "@/server/cms/settings";

/**
 * Publishes scheduled pages that are due. Call every few minutes from the host's cron:
 *   curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://mbatravelsgoa.com/api/cron/publish-scheduled/
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const ok = secret.length >= 16 && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!ok) return new Response("Unauthorized", { status: 401 });
  const published = await publishDuePages(null);
  if (published) revalidateTag(CMS_TAG, { expire: 0 });
  return Response.json({ published });
}
