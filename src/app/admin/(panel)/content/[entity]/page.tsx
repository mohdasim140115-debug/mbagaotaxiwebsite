import Link from "next/link";
import { notFound } from "next/navigation";
import { can, requireAdmin } from "@/server/auth/session";
import { listEntities } from "@/server/cms/entity-store";
import { ENTITIES, isEntityKey } from "@/lib/cms/entities";
import { Badge, PageTitle } from "@/components/admin/ui";
import { buttonVariants } from "@/components/ui/button";

export default async function EntityList({ params, searchParams }: PageProps<"/admin/content/[entity]">) {
  const user = await requireAdmin("content.view");
  const { entity } = await params;
  if (!isEntityKey(entity)) notFound();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 100) : "";
  const status = typeof sp.status === "string" ? sp.status : "";
  const def = ENTITIES[entity];
  const rows = await listEntities(entity, { q, status });
  return (
    <>
      <PageTitle
        title={def.label}
        description={def.help}
        actions={can(user, "content.edit") && <Link href={`/admin/content/${entity}/new/`} className={buttonVariants({ size: "sm" })}>Add {def.singular.toLowerCase()}</Link>}
      />
      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <label htmlFor="q" className="sr-only">Search</label>
        <input id="q" name="q" defaultValue={q} placeholder={`Search ${def.label.toLowerCase()}`} className="h-10 w-64 rounded-md border border-line bg-white px-3" />
        <label htmlFor="status" className="sr-only">Status</label>
        <select id="status" name="status" defaultValue={status} className="h-10 rounded-md border border-line bg-white px-3">
          <option value="">Active (draft + published)</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
        <button type="submit" className={buttonVariants({ variant: "secondary", size: "sm" })}>Filter</button>
      </form>
      <div className="overflow-x-auto rounded-[10px] border border-line bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-line bg-sand-100/60">
            <tr>
              {def.listColumns.map((c) => (
                <th key={c.field} scope="col" className="px-4 py-3">{c.label}</th>
              ))}
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Order</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 && (
              <tr>
                <td colSpan={def.listColumns.length + 2} className="px-4 py-8 text-center text-ink-700">Nothing here yet.</td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-sand-100/40">
                {def.listColumns.map((c, i) => (
                  <td key={c.field} className="max-w-md px-4 py-3">
                    {i === 0 ? (
                      <Link href={`/admin/content/${entity}/${r.id}/`} className="font-semibold hover:underline">{String(r[c.field] ?? "") || "(untitled)"}</Link>
                    ) : (
                      <span className="line-clamp-2 text-ink-700">{String(r[c.field] ?? "")}</span>
                    )}
                  </td>
                ))}
                <td className="px-4 py-3"><Badge value={r.status} /></td>
                <td className="px-4 py-3 text-ink-500">{r.position}</td>
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
