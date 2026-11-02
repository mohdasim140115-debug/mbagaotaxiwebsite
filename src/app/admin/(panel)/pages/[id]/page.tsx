import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "@/server/db/orm";
import { can, requireAdmin } from "@/server/auth/session";
import { loadPage } from "@/server/cms/page-store";
import { listRevisions } from "@/server/cms/entity-store";
import { allRefOptions, deepMediaIds, mediaThumbs } from "@/server/cms/editor-data";
import { db, schema } from "@/server/db/client";
import { PageEditor } from "@/components/admin/page-editor";
import { EMPTY_SEO } from "@/components/admin/seo-panel";
import { PageTitle } from "@/components/admin/ui";
import type { SectionType } from "@/lib/cms/sections";
import { toIstInput } from "@/lib/utils";

export const metadata = { title: "Edit page" };

export default async function EditPage({ params }: PageProps<"/admin/pages/[id]">) {
  const user = await requireAdmin("content.view");
  const { id: raw } = await params;
  const isNew = raw === "new";
  const id = isNew ? null : Number(raw);
  if (!isNew && !Number.isInteger(id)) notFound();
  if (isNew && !can(user, "content.edit")) notFound();

  const loaded = id ? await loadPage(id) : null;
  if (id && !loaded) notFound();
  const [refs, revisions] = await Promise.all([allRefOptions(), id ? listRevisions("pages", id) : Promise.resolve([])]);
  const sections = (loaded?.sections ?? []).map((s) => ({ type: s.type as SectionType, isEnabled: s.isEnabled, data: s.data as Record<string, unknown> }));
  const seo = loaded?.seo
    ? { metaTitle: loaded.seo.metaTitle, metaDescription: loaded.seo.metaDescription, canonicalUrl: loaded.seo.canonicalUrl, robotsIndex: loaded.seo.robotsIndex, robotsFollow: loaded.seo.robotsFollow, ogTitle: loaded.seo.ogTitle, ogDescription: loaded.seo.ogDescription, ogImageId: loaded.seo.ogImageId }
    : EMPTY_SEO;
  const media = await mediaThumbs([...deepMediaIds(sections), ...(seo.ogImageId ? [seo.ogImageId] : [])]);
  let editor: string | null = null;
  if (loaded?.page.updatedBy) {
    const [u] = await db.select({ name: schema.adminUsers.name }).from(schema.adminUsers).where(eq(schema.adminUsers.id, loaded.page.updatedBy)).limit(1);
    editor = u?.name ?? null;
  }

  return (
    <>
      <Link href="/admin/pages/" className="text-sm font-semibold text-teal-700 underline">
        ← All pages
      </Link>
      <PageTitle title={isNew ? "New page" : loaded!.page.title} description={isNew ? "Start with a page header, then add sections." : `Editing ${loaded!.page.path}`} />
      <PageEditor
        id={id}
        initial={{
          title: loaded?.page.title ?? "",
          path: loaded?.page.path ?? "/",
          template: loaded?.page.template ?? "generic",
          scheduledAt: toIstInput(loaded?.page.scheduledAt),
          sections: isNew ? [{ type: "page_header", isEnabled: true, data: { eyebrow: "", title: "", headingLevel: "h1", description: "", mediaId: null } }] : sections,
        }}
        seo={seo}
        version={loaded?.page.version ?? null}
        status={loaded?.page.status ?? "draft"}
        isSystem={loaded?.page.isSystem ?? false}
        hasUnpublishedChanges={loaded?.page.hasUnpublishedChanges ?? true}
        updatedAt={loaded?.page.updatedAt.toISOString()}
        updatedBy={editor}
        siteUrl={(process.env.SITE_URL ?? "").replace(/\/$/, "")}
        media={media}
        refs={refs}
        revisions={revisions}
        can={{ edit: can(user, "content.edit"), publish: can(user, "content.publish"), delete: can(user, "content.delete"), seo: can(user, "seo.manage") }}
      />
    </>
  );
}

// Admin screens always read fresh, per-request data.
export const instant = false;
