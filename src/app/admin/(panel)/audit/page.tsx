import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/server/db/client";
import { requireAdmin } from "@/server/auth/session";
import { PageTitle } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Audit log" };
const SIZE = 50;

export default async function AuditPage({ searchParams }: PageProps<"/admin/audit">) {
  await requireAdmin("audit.view");
  const page = Math.max(1, Number((await searchParams).page ?? 1) || 1);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({ a: schema.auditLogs, user: schema.adminUsers.name })
      .from(schema.auditLogs)
      .leftJoin(schema.adminUsers, eq(schema.adminUsers.id, schema.auditLogs.userId))
      .orderBy(desc(schema.auditLogs.id))
      .limit(SIZE)
      .offset((page - 1) * SIZE),
    db.select({ total: sql<number>`COUNT(*)` }).from(schema.auditLogs),
  ]);
  const pages = Math.max(1, Math.ceil(Number(total) / SIZE));
  return (
    <>
      <PageTitle title="Audit log" description="Every sign-in, content change, publish, export and settings change." />
      <div className="overflow-x-auto rounded-[10px] border border-line bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-line bg-sand-100/60">
            <tr>
              <th scope="col" className="px-4 py-3">When</th>
              <th scope="col" className="px-4 py-3">Who</th>
              <th scope="col" className="px-4 py-3">Action</th>
              <th scope="col" className="px-4 py-3">Record</th>
              <th scope="col" className="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map(({ a, user }) => (
              <tr key={a.id}>
                <td className="whitespace-nowrap px-4 py-2 text-ink-700">{formatDateTime(a.createdAt)}</td>
                <td className="px-4 py-2">{user ?? "System"}</td>
                <td className="px-4 py-2 font-mono text-xs">{a.action}</td>
                <td className="px-4 py-2 text-xs">{a.entityType ? `${a.entityType} #${a.entityId}` : "—"}</td>
                <td className="px-4 py-2 text-ink-700">{a.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <nav aria-label="Pagination" className="mt-4 flex items-center gap-3 text-sm">
        {page > 1 && <Link className="font-semibold text-teal-700 underline" href={`?page=${page - 1}`}>Newer</Link>}
        <span>Page {page} of {pages}</span>
        {page < pages && <Link className="font-semibold text-teal-700 underline" href={`?page=${page + 1}`}>Older</Link>}
      </nav>
    </>
  );
}

// Admin screens always read fresh, per-request data.
export const instant = false;
