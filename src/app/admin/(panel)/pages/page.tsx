import Link from "next/link";
import { can, requireAdmin } from "@/server/auth/session";
import { listPages } from "@/server/cms/page-store";
import { Badge, PageTitle } from "@/components/admin/ui";
import { buttonVariants } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Pages" };

export default async function PagesList() {
  const user = await requireAdmin("content.view");
  const pages = await listPages();
  return (
    <>
      <PageTitle
        title="Pages"
        description="Every page is built from sections. Pages from the original site keep their URLs."
        actions={can(user, "content.edit") && <Link href="/admin/pages/new/" className={buttonVariants({ size: "sm" })}>New page</Link>}
      />
      <div className="overflow-x-auto rounded-[10px] border border-line bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-line bg-sand-100/60">
            <tr>
              <th scope="col" className="px-4 py-3">Title</th>
              <th scope="col" className="px-4 py-3">URL</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Last modified</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {pages.map((p) => (
              <tr key={p.id} className="hover:bg-sand-100/40">
                <td className="px-4 py-3 font-semibold">
                  <Link href={`/admin/pages/${p.id}/`} className="hover:underline">
                    {p.title}
                  </Link>
                  {p.isSystem && <span className="ml-2 text-xs font-normal text-ink-500">original site</span>}
                </td>
                <td className="px-4 py-3 font-mono text-xs">{p.path}</td>
                <td className="px-4 py-3">
                  <Badge value={p.status} />
                  {p.hasUnpublishedChanges && p.status === "published" && <span className="ml-2 text-xs text-sunset-600">unpublished changes</span>}
                  {p.scheduledAt && <span className="ml-2 text-xs text-teal-700">scheduled {formatDateTime(p.scheduledAt)}</span>}
                </td>
                <td className="px-4 py-3 text-ink-700">
                  {formatDateTime(p.updatedAt)}
                  {p.editor && <span className="block text-xs text-ink-500">by {p.editor}</span>}
                </td>
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
