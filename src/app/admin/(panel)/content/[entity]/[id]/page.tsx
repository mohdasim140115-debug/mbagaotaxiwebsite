import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { can, requireAdmin } from "@/server/auth/session";
import { listRevisions, loadEntity } from "@/server/cms/entity-store";
import { allRefOptions, deepMediaIds, mediaThumbs } from "@/server/cms/editor-data";
import { db, schema } from "@/server/db/client";
import { ENTITIES, isEntityKey } from "@/lib/cms/entities";
import { defaultsFor } from "@/lib/cms/fields";
import { EntityEditor } from "@/components/admin/entity-editor";
import { EMPTY_SEO, EntitySeoCard } from "@/components/admin/seo-panel";
import { PageTitle } from "@/components/admin/ui";

export default async function EntityEdit({ params }: PageProps<"/admin/content/[entity]/[id]">) {
  const user = await requireAdmin("content.view");
  const { entity, id: raw } = await params;
  if (!isEntityKey(entity)) notFound();
  const def = ENTITIES[entity];
  const isNew = raw === "new";
  const id = isNew ? null : Number(raw);
  if (!isNew && !Number.isInteger(id)) notFound();
  if (isNew && !can(user, "content.edit")) notFound();

  const loaded = id ? await loadEntity(entity, id) : null;
  if (id && !loaded) notFound();
  const initial = loaded ?? defaultsFor(def.fields);
  const [refs, revisions, media] = await Promise.all([allRefOptions(), id ? listRevisions(entity, id) : Promise.resolve([]), mediaThumbs(deepMediaIds(initial))]);

  let seoSlot: React.ReactNode = null;
  const SEO_TYPES = { packages: "package", vehicles: "vehicle", posts: "post" } as const;
  const seoType = SEO_TYPES[entity as keyof typeof SEO_TYPES];
  if (seoType && id && loaded) {
    const [seo] = await db.select().from(schema.seoMetadata).where(and(eq(schema.seoMetadata.entityType, seoType), eq(schema.seoMetadata.entityId, id))).limit(1);
    Object.assign(media, seo?.ogImageId ? await mediaThumbs([seo.ogImageId]) : {});
    const publicPath = def.publicPath?.({ slug: String(loaded.slug), hasDetailPage: Boolean(loaded.hasDetailPage) });
    seoSlot = publicPath ? (
      <EntitySeoCard
        entityType={seoType}
        entityId={id}
        initial={seo ? { metaTitle: seo.metaTitle, metaDescription: seo.metaDescription, canonicalUrl: seo.canonicalUrl, robotsIndex: seo.robotsIndex, robotsFollow: seo.robotsFollow, ogTitle: seo.ogTitle, ogDescription: seo.ogDescription, ogImageId: seo.ogImageId } : EMPTY_SEO}
        fallbackTitle={`${String(loaded[def.titleField])} - MBA Travels Goa`}
        url={`${(process.env.SITE_URL ?? "").replace(/\/$/, "")}${publicPath}`}
        canEdit={can(user, "seo.manage")}
      />
    ) : (
      <p className="rounded-md bg-sand-100 p-4 text-sm text-ink-700">Turn on “Show a detail page” and save to edit this page’s SEO.</p>
    );
  }

  const title = loaded ? String(loaded[def.titleField] ?? def.singular) : `New ${def.singular.toLowerCase()}`;
  return (
    <>
      <Link href={`/admin/content/${entity}/`} className="text-sm font-semibold text-teal-700 underline">
        ← All {def.label.toLowerCase()}
      </Link>
      <PageTitle title={title} />
      <EntityEditor
        entity={entity}
        id={id}
        initial={initial}
        version={(loaded?.version as number) ?? null}
        status={(loaded?.status as string) ?? "draft"}
        media={media}
        refs={refs}
        revisions={revisions}
        updatedAt={loaded?.updatedAt instanceof Date ? loaded.updatedAt.toISOString() : undefined}
        publicPath={def.publicPath ? def.publicPath({ slug: loaded?.slug as string, hasDetailPage: loaded?.hasDetailPage as boolean }) : null}
        can={{ edit: can(user, "content.edit"), publish: can(user, "content.publish"), delete: can(user, "content.delete") }}
        seoSlot={seoSlot}
      />
    </>
  );
}

// Admin screens always read fresh, per-request data.
export const instant = false;
