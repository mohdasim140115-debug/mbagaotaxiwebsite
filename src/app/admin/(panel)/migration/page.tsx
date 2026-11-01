import { asc, sql } from "drizzle-orm";
import { db, schema } from "@/server/db/client";
import { requireAdmin } from "@/server/auth/session";
import { Badge, Card, PageTitle } from "@/components/admin/ui";

export const metadata = { title: "Migration report" };

export default async function MigrationPage({ searchParams }: PageProps<"/admin/migration">) {
  await requireAdmin("content.view");
  const onlyFlagged = (await searchParams).flagged === "1";
  const rows = await db.select().from(schema.migrationMap).orderBy(asc(schema.migrationMap.sourceUrl), asc(schema.migrationMap.id));
  const [{ flagged }] = await db.select({ flagged: sql<number>`SUM(approval_required)` }).from(schema.migrationMap);
  const shown = onlyFlagged ? rows.filter((r) => r.approvalRequired) : rows;
  return (
    <>
      <PageTitle
        title="Migration report"
        description="Every item imported from the original website, mapped back to its source URL. Items needing business approval are listed in docs/open-questions.md."
        actions={<a href={onlyFlagged ? "?" : "?flagged=1"} className="text-sm font-semibold text-teal-700 underline">{onlyFlagged ? "Show all" : `Show only items needing approval (${Number(flagged)})`}</a>}
      />
      <Card>
        <p className="text-sm">{rows.length} items migrated · {Number(flagged)} need confirmation</p>
      </Card>
      <div className="mt-4 overflow-x-auto rounded-[10px] border border-line bg-white">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-line bg-sand-100/60">
            <tr>
              <th scope="col" className="px-4 py-3">Source</th>
              <th scope="col" className="px-4 py-3">Item</th>
              <th scope="col" className="px-4 py-3">Destination</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Discrepancy / note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {shown.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2 font-mono text-xs">{r.sourceUrl.replace("https://mbatravelsgoa.com", "")}</td>
                <td className="max-w-xs px-4 py-2">{r.sourceRef}</td>
                <td className="px-4 py-2 text-xs">{r.entityType}{r.entityId ? ` #${r.entityId}` : ""}</td>
                <td className="px-4 py-2"><Badge value={r.approvalRequired ? "pending" : "published"} label={r.approvalRequired ? "needs approval" : r.status} /></td>
                <td className="max-w-md px-4 py-2 text-ink-700">{r.discrepancy ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// Admin screens always read fresh, per-request data.
export const instant = false;
