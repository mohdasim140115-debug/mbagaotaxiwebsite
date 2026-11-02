import Link from "next/link";
import { and, eq, ne, sql } from "@/server/db/orm";
import { db, schema } from "@/server/db/client";
import { requireAdmin } from "@/server/auth/session";
import { getAllSettings } from "@/server/cms/settings";
import { Badge, Card, PageTitle } from "@/components/admin/ui";

export const metadata = { title: "SEO overview" };

export default async function SeoOverview() {
  await requireAdmin("seo.manage");
  const settings = await getAllSettings();
  const pages = await db
    .select({ id: schema.pages.id, path: schema.pages.path, title: schema.pages.title, status: schema.pages.status, seo: schema.seoMetadata })
    .from(schema.pages)
    .leftJoin(schema.seoMetadata, and(eq(schema.seoMetadata.entityType, "page"), eq(schema.seoMetadata.entityId, schema.pages.id)))
    .where(ne(schema.pages.status, "archived"));
  const effectiveTitle = (p: (typeof pages)[number]) => p.seo?.metaTitle || settings.titleTemplate.replace("%s", p.title);
  const effectiveDesc = (p: (typeof pages)[number]) => p.seo?.metaDescription || settings.defaultMetaDescription;
  const count = <T,>(arr: T[], key: (x: T) => string) => arr.reduce<Record<string, number>>((acc, x) => ((acc[key(x)] = (acc[key(x)] ?? 0) + 1), acc), {});
  const titleCounts = count(pages, effectiveTitle);
  const descCounts = count(pages, effectiveDesc);
  const [{ missingAlt }] = await db.select({ missingAlt: sql<number>`COUNT(*)` }).from(schema.media).where(and(eq(schema.media.altText, ""), ne(schema.media.licenceStatus, "do_not_use")));
  const [{ activeRedirects }] = await db.select({ activeRedirects: sql<number>`COUNT(*)` }).from(schema.redirects).where(eq(schema.redirects.isActive, true));

  return (
    <>
      <PageTitle title="SEO overview" description="Checks across all pages. Edit titles and descriptions in each page’s SEO panel." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card><p className="text-sm text-ink-700">Images missing alt text</p><p className="font-display text-3xl font-semibold"><Link href="/admin/media/" className="hover:underline">{Number(missingAlt)}</Link></p></Card>
        <Card><p className="text-sm text-ink-700">Active redirects</p><p className="font-display text-3xl font-semibold"><Link href="/admin/redirects/" className="hover:underline">{Number(activeRedirects)}</Link></p></Card>
        <Card><p className="text-sm text-ink-700">Sitemap</p><p className="mt-2"><a href="/sitemap.xml" target="_blank" rel="noopener" className="font-semibold text-teal-700 underline">/sitemap.xml</a> · <a href="/robots.txt" target="_blank" rel="noopener" className="font-semibold text-teal-700 underline">/robots.txt</a></p></Card>
      </div>
      <div className="overflow-x-auto rounded-[10px] border border-line bg-white">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-line bg-sand-100/60">
            <tr>
              <th scope="col" className="px-4 py-3">Page</th>
              <th scope="col" className="px-4 py-3">Title (as rendered)</th>
              <th scope="col" className="px-4 py-3">Description</th>
              <th scope="col" className="px-4 py-3">Indexing</th>
              <th scope="col" className="px-4 py-3">Issues</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {pages.map((p) => {
              const t = effectiveTitle(p);
              const d = effectiveDesc(p);
              const issues = [
                !p.seo?.metaDescription && "No page-specific description",
                titleCounts[t]! > 1 && "Duplicate title",
                descCounts[d]! > 1 && "Duplicate description",
                t.length > 65 && "Title longer than ~60 chars",
                d.length > 165 && "Description longer than ~160 chars",
                p.status !== "published" && "Not published",
              ].filter(Boolean) as string[];
              return (
                <tr key={p.id}>
                  <td className="px-4 py-3"><Link href={`/admin/pages/${p.id}/`} className="font-semibold hover:underline">{p.path}</Link></td>
                  <td className="px-4 py-3">{t} <span className="text-xs text-ink-500">({t.length})</span></td>
                  <td className="max-w-sm px-4 py-3 text-ink-700">{d} <span className="text-xs text-ink-500">({d.length})</span></td>
                  <td className="px-4 py-3">{p.seo?.robotsIndex === false ? <Badge value="draft" label="noindex" /> : <Badge value="published" label="index" />}</td>
                  <td className="px-4 py-3 text-xs">{issues.length ? <ul className="list-disc pl-4 text-sunset-600">{issues.map((i) => <li key={i}>{i}</li>)}</ul> : <span className="text-success">OK</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

// Admin screens always read fresh, per-request data.
export const instant = false;
