import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/server/db/client";
import { can, requireAdmin } from "@/server/auth/session";
import { telHref, whatsappHref } from "@/lib/cms/settings-def";
import { EnquiryControls } from "@/components/admin/enquiry-controls";
import { Badge, Card, PageTitle } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Enquiry" };

export default async function EnquiryDetail({ params }: PageProps<"/admin/enquiries/[id]">) {
  const user = await requireAdmin("enquiries.view");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [e] = await db.select().from(schema.enquiries).where(eq(schema.enquiries.id, id)).limit(1);
  if (!e) notFound();
  if (!e.isRead) await db.update(schema.enquiries).set({ isRead: true }).where(eq(schema.enquiries.id, id));
  const [notes, events, users] = await Promise.all([
    db.select({ n: schema.enquiryNotes, author: schema.adminUsers.name }).from(schema.enquiryNotes).leftJoin(schema.adminUsers, eq(schema.adminUsers.id, schema.enquiryNotes.authorId)).where(eq(schema.enquiryNotes.enquiryId, id)).orderBy(desc(schema.enquiryNotes.createdAt)),
    db.select({ ev: schema.enquiryEvents, who: schema.adminUsers.name }).from(schema.enquiryEvents).leftJoin(schema.adminUsers, eq(schema.adminUsers.id, schema.enquiryEvents.userId)).where(eq(schema.enquiryEvents.enquiryId, id)).orderBy(asc(schema.enquiryEvents.createdAt)),
    db.select({ id: schema.adminUsers.id, name: schema.adminUsers.name }).from(schema.adminUsers).where(eq(schema.adminUsers.isActive, true)),
  ]);
  const digits = e.phone.replace(/\D/g, "");
  const rows: [string, string][] = [
    ["Phone", e.phone],
    ["Email", e.email || "—"],
    ["Travel date & time", e.travelDate.replace("T", " ") || "—"],
    ["Pickup", e.pickup || "—"],
    ["Destination", e.dropoff || "—"],
    ["Passengers", e.travellers ? String(e.travellers) : "—"],
    ["Subject", e.subject || "—"],
    ["Landing page", e.landingPage || "—"],
    ["Referrer", e.referrer || "—"],
    ["UTM", [e.utmSource, e.utmMedium, e.utmCampaign, e.utmTerm, e.utmContent].filter(Boolean).join(" / ") || "—"],
    ["Consent given", e.consentAt ? formatDateTime(e.consentAt) : "—"],
  ];
  return (
    <>
      <Link href="/admin/enquiries/" className="text-sm font-semibold text-teal-700 underline">← All enquiries</Link>
      <PageTitle title={e.name || e.phone} description={`${e.type} enquiry #${e.id} · received ${formatDateTime(e.createdAt)}`} actions={<Badge value={e.status} />} />
      {e.duplicateOf && (
        <p className="mb-4 rounded-md bg-sunset-50 p-3 text-sm text-sunset-600">
          Same phone number enquired within 24 hours: <Link className="underline" href={`/admin/enquiries/${e.duplicateOf}/`}>#{e.duplicateOf}</Link>
        </p>
      )}
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card title="Details">
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {rows.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs font-semibold text-ink-500">{k}</dt>
                  <dd className="break-words">{v}</dd>
                </div>
              ))}
            </dl>
            <h3 className="mt-5 text-xs font-semibold text-ink-500">Message</h3>
            <p className="mt-1 whitespace-pre-wrap">{e.message || "—"}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <a href={telHref(e.phone)} className="rounded-[10px] border border-line px-4 py-2 text-sm font-semibold">Call</a>
              {digits.length >= 10 && <a href={whatsappHref(digits.length === 10 ? `91${digits}` : digits)} target="_blank" rel="noopener noreferrer" className="rounded-[10px] bg-whatsapp px-4 py-2 text-sm font-semibold text-white">WhatsApp</a>}
              {e.email && <a href={`mailto:${e.email}`} className="rounded-[10px] border border-line px-4 py-2 text-sm font-semibold">Email</a>}
            </div>
          </Card>
          <Card title="Internal notes">
            {notes.length === 0 ? <p className="text-ink-700">No notes yet.</p> : (
              <ul className="space-y-3">
                {notes.map(({ n, author }) => (
                  <li key={n.id} className="rounded-md bg-sand-100/60 p-3">
                    <p className="whitespace-pre-wrap">{n.body}</p>
                    <p className="mt-1 text-xs text-ink-500">{author ?? "Unknown"} · {formatDateTime(n.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <aside className="space-y-4">
          <EnquiryControls id={e.id} status={e.status} assignedTo={e.assignedTo} users={users} canManage={can(user, "enquiries.manage")} />
          <Card title="History">
            <ol className="space-y-2 text-sm">
              {events.map(({ ev, who }) => (
                <li key={ev.id}>
                  <span className="font-semibold">{ev.event}</span> {ev.fromValue && `${ev.fromValue} → `}{ev.toValue}
                  <span className="block text-xs text-ink-500">{who ?? "Website"} · {formatDateTime(ev.createdAt)}</span>
                </li>
              ))}
            </ol>
          </Card>
        </aside>
      </div>
    </>
  );
}

// Admin screens always read fresh, per-request data.
export const instant = false;
