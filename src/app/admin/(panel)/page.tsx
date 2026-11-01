import Link from "next/link";
import { desc, eq, sql, type SQL } from "drizzle-orm";
import type { MySqlTable } from "drizzle-orm/mysql-core";
import { db, schema } from "@/server/db/client";
import { can, requireAdmin } from "@/server/auth/session";
import { publishDuePages } from "@/server/cms/page-store";
import { Badge, PageTitle } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

async function count(table: MySqlTable, where?: SQL) {
  const [row] = await db.select({ n: sql<number>`COUNT(*)` }).from(table).where(where);
  return Number(row?.n ?? 0);
}

export default async function Dashboard() {
  const user = await requireAdmin("dashboard.view");
  // Opportunistically publish any scheduled pages that are due.
  if (can(user, "content.publish")) await publishDuePages(user.id);

  const showContent = can(user, "content.view");
  const showLeads = can(user, "enquiries.view");
  const [publishedPages, draftPages, packages, services, vehicles, hotels, newEnquiries, pendingMedia] = await Promise.all([
    count(schema.pages, eq(schema.pages.status, "published")),
    count(schema.pages, eq(schema.pages.status, "draft")),
    count(schema.packages, eq(schema.packages.status, "published")),
    count(schema.services, eq(schema.services.status, "published")),
    count(schema.vehicles, eq(schema.vehicles.status, "published")),
    count(schema.hotels, eq(schema.hotels.status, "published")),
    count(schema.enquiries, eq(schema.enquiries.status, "new")),
    count(schema.media, eq(schema.media.licenceStatus, "pending")),
  ]);
  const recentEnquiries = showLeads ? await db.select().from(schema.enquiries).orderBy(desc(schema.enquiries.createdAt)).limit(6) : [];
  const recentChanges = showContent
    ? await db
        .select({ id: schema.auditLogs.id, action: schema.auditLogs.action, summary: schema.auditLogs.summary, entityType: schema.auditLogs.entityType, entityId: schema.auditLogs.entityId, createdAt: schema.auditLogs.createdAt, user: schema.adminUsers.name })
        .from(schema.auditLogs)
        .leftJoin(schema.adminUsers, eq(schema.adminUsers.id, schema.auditLogs.userId))
        .orderBy(desc(schema.auditLogs.createdAt))
        .limit(10)
    : [];

  const stats = [
    showContent && { label: "Published pages", value: publishedPages, href: "/admin/pages/" },
    showContent && { label: "Draft pages", value: draftPages, href: "/admin/pages/" },
    showContent && { label: "Published packages", value: packages, href: "/admin/content/packages/" },
    showContent && { label: "Active services", value: services, href: "/admin/content/services/" },
    showContent && { label: "Active fleet listings", value: vehicles, href: "/admin/content/vehicles/" },
    showContent && { label: "Hotels", value: hotels, href: "/admin/content/hotels/" },
    showLeads && { label: "New enquiries", value: newEnquiries, href: "/admin/enquiries/?status=new" },
    showContent && { label: "Images awaiting licence check", value: pendingMedia, href: "/admin/media/?licence=pending" },
  ].filter(Boolean) as { label: string; value: number; href: string }[];

  return (
    <>
      <PageTitle title={`Welcome, ${user.name.split(" ")[0]}`} description="Live figures from the website database." />
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <li key={s.label}>
            <Link href={s.href} className="block rounded-[10px] border border-line bg-white p-5 hover:border-teal-600">
              <span className="block text-sm text-ink-700">{s.label}</span>
              <span className="font-display mt-1 block text-4xl font-semibold">{s.value}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        {showLeads && (
          <section className="rounded-[10px] border border-line bg-white">
            <h2 className="border-b border-line px-5 py-3 font-semibold">Recent enquiries</h2>
            {recentEnquiries.length === 0 ? (
              <p className="p-5 text-ink-700">No enquiries yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {recentEnquiries.map((e) => (
                  <li key={e.id}>
                    <Link href={`/admin/enquiries/${e.id}/`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-sand-100/50">
                      <span>
                        <span className="font-semibold">{e.name || e.phone}</span> <span className="text-sm text-ink-500">· {e.type}</span>
                        <span className="block text-xs text-ink-500">{formatDateTime(e.createdAt)}</span>
                      </span>
                      <Badge value={e.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
        {showContent && (
          <section className="rounded-[10px] border border-line bg-white">
            <h2 className="border-b border-line px-5 py-3 font-semibold">Recent changes</h2>
            {recentChanges.length === 0 ? (
              <p className="p-5 text-ink-700">No administrative actions yet.</p>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {recentChanges.map((c) => (
                  <li key={c.id} className="px-5 py-3">
                    <span className="font-semibold">{c.user ?? "System"}</span> — {c.summary || c.action}
                    <span className="block text-xs text-ink-500">
                      {c.action} · {formatDateTime(c.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </>
  );
}

// Admin screens always read fresh, per-request data.
export const instant = false;
