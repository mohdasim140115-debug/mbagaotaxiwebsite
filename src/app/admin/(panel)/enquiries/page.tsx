import Link from "next/link";
import { can, requireAdmin } from "@/server/auth/session";
import { listEnquiries } from "@/server/enquiries/query";
import { schema } from "@/server/db/client";
import { ENQUIRY_TYPES } from "@/lib/validation/enquiry";
import { Badge, PageTitle } from "@/components/admin/ui";
import { buttonVariants } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Enquiries" };

export default async function EnquiriesPage({ searchParams }: PageProps<"/admin/enquiries">) {
  const user = await requireAdmin("enquiries.view");
  const sp = await searchParams;
  const f = {
    q: typeof sp.q === "string" ? sp.q : "",
    status: typeof sp.status === "string" ? sp.status : "",
    type: typeof sp.type === "string" ? sp.type : "",
    from: typeof sp.from === "string" ? sp.from : "",
    to: typeof sp.to === "string" ? sp.to : "",
    page: Number(sp.page ?? 1) || 1,
  };
  const data = await listEnquiries(f);
  const qs = (extra: Record<string, string | number>) => new URLSearchParams({ ...Object.fromEntries(Object.entries(f).map(([k, v]) => [k, String(v)])), ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, String(v)])) }).toString();
  return (
    <>
      <PageTitle
        title="Enquiries"
        description="Leads from the website enquiry form. Personal data is visible only to roles with enquiry access."
        actions={can(user, "enquiries.export") && <a href={`/api/admin/enquiries/export/?${qs({})}`} className={buttonVariants({ variant: "secondary", size: "sm" })}>Export CSV</a>}
      />
      <form className="mb-4 grid gap-2 rounded-[10px] border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-6" role="search">
        <div className="lg:col-span-2">
          <label htmlFor="eq" className="text-xs font-semibold">Search</label>
          <input id="eq" name="q" defaultValue={f.q} placeholder="Name, phone, email, message" className="h-10 w-full rounded-md border border-line px-3" />
        </div>
        <div>
          <label htmlFor="es" className="text-xs font-semibold">Status</label>
          <select id="es" name="status" defaultValue={f.status} className="h-10 w-full rounded-md border border-line px-2">
            <option value="">All</option>
            {schema.ENQUIRY_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="et" className="text-xs font-semibold">Type</label>
          <select id="et" name="type" defaultValue={f.type} className="h-10 w-full rounded-md border border-line px-2">
            <option value="">All</option>
            {ENQUIRY_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="ef" className="text-xs font-semibold">From</label>
          <input id="ef" type="date" name="from" defaultValue={f.from} className="h-10 w-full rounded-md border border-line px-2" />
        </div>
        <div>
          <label htmlFor="eto" className="text-xs font-semibold">To</label>
          <input id="eto" type="date" name="to" defaultValue={f.to} className="h-10 w-full rounded-md border border-line px-2" />
        </div>
        <div className="flex items-end gap-2 lg:col-span-6">
          <button type="submit" className={buttonVariants({ variant: "secondary", size: "sm" })}>Apply filters</button>
          <Link href="/admin/enquiries/" className="text-sm underline">Reset</Link>
          <span className="ml-auto text-sm text-ink-500">{data.total} result(s)</span>
        </div>
      </form>
      <div className="overflow-x-auto rounded-[10px] border border-line bg-white">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="border-b border-line bg-sand-100/60">
            <tr>
              <th scope="col" className="px-4 py-3">Received</th>
              <th scope="col" className="px-4 py-3">Customer</th>
              <th scope="col" className="px-4 py-3">Type</th>
              <th scope="col" className="px-4 py-3">Travel</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Assigned</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-700">No enquiries match these filters.</td></tr>
            )}
            {data.rows.map(({ e, assignee }) => (
              <tr key={e.id} className={e.isRead ? "" : "bg-sunset-50/40"}>
                <td className="px-4 py-3 text-ink-700">{formatDateTime(e.createdAt)}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/enquiries/${e.id}/`} className="font-semibold hover:underline">{e.name || "(no name)"}</Link>
                  <span className="block text-xs text-ink-500">{e.phone}{e.duplicateOf ? " · possible duplicate" : ""}</span>
                </td>
                <td className="px-4 py-3">{e.type}</td>
                <td className="px-4 py-3 text-ink-700">{[e.travelDate.replace("T", " "), e.pickup && `${e.pickup} → ${e.dropoff}`].filter(Boolean).join(" · ") || "—"}</td>
                <td className="px-4 py-3"><Badge value={e.status} /></td>
                <td className="px-4 py-3 text-ink-700">{assignee ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.pages > 1 && (
        <nav aria-label="Pagination" className="mt-4 flex items-center gap-3 text-sm">
          {data.page > 1 && <Link className="font-semibold text-teal-700 underline" href={`?${qs({ page: data.page - 1 })}`}>Previous</Link>}
          <span>Page {data.page} of {data.pages}</span>
          {data.page < data.pages && <Link className="font-semibold text-teal-700 underline" href={`?${qs({ page: data.page + 1 })}`}>Next</Link>}
        </nav>
      )}
    </>
  );
}

// Admin screens always read fresh, per-request data.
export const instant = false;
