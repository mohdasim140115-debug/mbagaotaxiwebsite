import { asc } from "@/server/db/orm";
import { db, schema } from "@/server/db/client";
import { requireAdmin } from "@/server/auth/session";
import { RedirectsManager } from "@/components/admin/redirects-manager";
import { PageTitle } from "@/components/admin/ui";

export const metadata = { title: "Redirects" };

export default async function RedirectsPage() {
  await requireAdmin("redirects.manage");
  const rows = await db.select().from(schema.redirects).orderBy(asc(schema.redirects.sourcePath));
  return (
    <>
      <PageTitle title="Redirects" description="301 = moved permanently, 302 = temporary, 410 = gone. Loops and chains are blocked when you save. Changes take effect within 30 seconds." />
      <RedirectsManager rows={rows.map((r) => ({ id: r.id, sourcePath: r.sourcePath, destination: r.destination, statusCode: r.statusCode, isActive: r.isActive, note: r.note, hits: r.hits, lastHitAt: r.lastHitAt?.toISOString() ?? null }))} />
    </>
  );
}

// Admin screens always read fresh, per-request data.
export const instant = false;
