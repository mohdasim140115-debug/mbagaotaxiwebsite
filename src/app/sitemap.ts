import type { MetadataRoute } from "next";
import { and, eq } from "@/server/db/orm";
import { cacheLife, cacheTag } from "next/cache";
import { db, schema } from "@/server/db/client";
import { getPublishedPackages, getPublishedPagePaths, getPublishedPosts, getPublishedVehicles } from "@/server/cms/public";
import { CMS_TAG } from "@/server/cms/settings";
import { siteUrl } from "@/server/seo/jsonld";

/** Paths whose SEO record says noindex, or that carry a non-self canonical, are excluded. */
async function excludedPaths() {
  "use cache";
  cacheTag(CMS_TAG);
  cacheLife("max");
  const rows = await db
    .select({ type: schema.seoMetadata.entityType, id: schema.seoMetadata.entityId, index: schema.seoMetadata.robotsIndex, canonical: schema.seoMetadata.canonicalUrl })
    .from(schema.seoMetadata);
  const [pages, pkgs, vehicles, posts] = await Promise.all([
    db.select({ id: schema.pages.id, path: schema.pages.path }).from(schema.pages).where(and(eq(schema.pages.status, "published"))),
    db.select({ id: schema.packages.id, slug: schema.packages.slug }).from(schema.packages),
    db.select({ id: schema.vehicles.id, slug: schema.vehicles.slug }).from(schema.vehicles),
    db.select({ id: schema.posts.id, slug: schema.posts.slug }).from(schema.posts),
  ]);
  const pathOf = (type: string, id: number) => {
    if (type === "page") return pages.find((p) => p.id === id)?.path;
    if (type === "package") return `/packages/${pkgs.find((p) => p.id === id)?.slug}/`;
    if (type === "vehicle") return `/taxi-services/${vehicles.find((p) => p.id === id)?.slug}/`;
    if (type === "post") return `/blog/${posts.find((p) => p.id === id)?.slug}/`;
    return undefined;
  };
  const out = new Set<string>();
  for (const r of rows) {
    const path = pathOf(r.type, r.id);
    if (!path) continue;
    if (!r.index || (r.canonical && r.canonical !== siteUrl(path))) out.add(path);
  }
  return [...out];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (process.env.STAGING === "true") return [];
  const [pages, packages, vehicles, posts, excluded] = await Promise.all([getPublishedPagePaths(), getPublishedPackages(), getPublishedVehicles(), getPublishedPosts(), excludedPaths()]);
  const entries: MetadataRoute.Sitemap = pages.map((p) => ({ url: siteUrl(p.path), lastModified: p.updatedAt }));
  for (const p of packages.filter((p) => p.hasDetailPage)) entries.push({ url: siteUrl(`/packages/${p.slug}/`), lastModified: p.updatedAt.toISOString() });
  for (const v of vehicles.filter((v) => v.hasDetailPage)) entries.push({ url: siteUrl(`/taxi-services/${v.slug}/`), lastModified: v.updatedAt.toISOString() });
  for (const p of posts) entries.push({ url: siteUrl(`/blog/${p.slug}/`), lastModified: p.updatedAt.toISOString() });
  return entries.filter((e) => !excluded.some((x) => e.url === siteUrl(x)));
}
