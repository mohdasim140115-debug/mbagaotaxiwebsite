import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { and, asc, desc, eq, inArray } from "@/server/db/orm";
import { db, schema } from "../db/client";
import { CMS_TAG } from "./settings";
import { isSectionType, type Section } from "@/lib/cms/sections";

/* Every public read is cached and tagged "cms"; admin mutations call updateTag("cms"). */
function tag() {
  cacheTag(CMS_TAG);
  cacheLife("max");
}

export type MediaItem = { id: number; url: string; width: number; height: number; alt: string; caption: string; credit: string };

export function mediaUrl(storageKey: string) {
  return `/media/${storageKey}`;
}

export async function getMediaByIds(ids: number[]): Promise<Record<number, MediaItem>> {
  "use cache";
  tag();
  const unique = [...new Set(ids.filter((n) => Number.isInteger(n) && n > 0))];
  if (!unique.length) return {};
  const rows = await db.select().from(schema.media).where(inArray(schema.media.id, unique));
  const out: Record<number, MediaItem> = {};
  for (const m of rows) {
    // Images marked "do not use" are never rendered publicly.
    if (m.licenceStatus === "do_not_use") continue;
    out[m.id] = { id: m.id, url: mediaUrl(m.storageKey), width: m.width, height: m.height, alt: m.altText, caption: m.caption, credit: m.credit };
  }
  return out;
}

export type PublishedPage = {
  id: number;
  path: string;
  title: string;
  template: string;
  sections: Section[];
  updatedAt: string;
};

type Snapshot = { title: string; sections: { type: string; isEnabled: boolean; data: Record<string, unknown> }[] };

export async function getPublishedPage(path: string): Promise<PublishedPage | null> {
  "use cache";
  tag();
  const [row] = await db
    .select()
    .from(schema.pages)
    .where(and(eq(schema.pages.path, path), eq(schema.pages.status, "published")))
    .limit(1);
  if (!row || !row.publishedData) return null;
  const snap = row.publishedData as Snapshot;
  return {
    id: row.id,
    path: row.path,
    title: snap.title,
    template: row.template,
    sections: snap.sections.filter((s) => s.isEnabled && isSectionType(s.type)) as Section[],
    updatedAt: (row.publishedAt ?? row.updatedAt).toISOString(),
  };
}

export async function getPublishedPagePaths(): Promise<{ path: string; updatedAt: string }[]> {
  "use cache";
  tag();
  const rows = await db
    .select({ path: schema.pages.path, publishedAt: schema.pages.publishedAt, updatedAt: schema.pages.updatedAt })
    .from(schema.pages)
    .where(eq(schema.pages.status, "published"));
  return rows.map((r) => ({ path: r.path, updatedAt: (r.publishedAt ?? r.updatedAt).toISOString() }));
}

export async function getSeoFor(entityType: string, entityId: number) {
  "use cache";
  tag();
  const [row] = await db
    .select()
    .from(schema.seoMetadata)
    .where(and(eq(schema.seoMetadata.entityType, entityType), eq(schema.seoMetadata.entityId, entityId)))
    .limit(1);
  return row ?? null;
}

export async function getNavigation(menu: "header" | "footer" | "legal") {
  "use cache";
  tag();
  const rows = await db
    .select()
    .from(schema.navigationItems)
    .where(and(eq(schema.navigationItems.menu, menu), eq(schema.navigationItems.isVisible, true)))
    .orderBy(asc(schema.navigationItems.position), asc(schema.navigationItems.id));
  const top = rows.filter((r) => !r.parentId);
  return top.map((t) => ({
    id: t.id,
    label: t.label,
    href: t.href,
    newTab: t.openInNewTab,
    children: rows
      .filter((c) => c.parentId === t.id)
      .map((c) => ({ id: c.id, label: c.label, href: c.href, newTab: c.openInNewTab })),
  }));
}
export type NavItem = Awaited<ReturnType<typeof getNavigation>>[number];

async function imagesFor(
  table: typeof schema.packageImages | typeof schema.hotelImages | typeof schema.vehicleImages,
  ownerCol: "packageId" | "hotelId" | "vehicleId",
  ids: number[],
) {
  if (!ids.length) return new Map<number, number[]>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = table as any;
  const rows: { owner: number; mediaId: number; position: number }[] = await db
    .select({ owner: t[ownerCol], mediaId: t.mediaId, position: t.position })
    .from(t)
    .where(inArray(t[ownerCol], ids))
    .orderBy(asc(t.position));
  const map = new Map<number, number[]>();
  for (const r of rows) map.set(r.owner, [...(map.get(r.owner) ?? []), r.mediaId]);
  return map;
}

export async function getPublishedPackages() {
  "use cache";
  tag();
  const rows = await db
    .select()
    .from(schema.packages)
    .where(eq(schema.packages.status, "published"))
    .orderBy(asc(schema.packages.position), asc(schema.packages.id));
  const imgs = await imagesFor(schema.packageImages, "packageId", rows.map((r) => r.id));
  return rows.map((r) => ({ ...r, imageIds: imgs.get(r.id) ?? [] }));
}
export type PublicPackage = Awaited<ReturnType<typeof getPublishedPackages>>[number];

export async function getPublishedServices() {
  "use cache";
  tag();
  return db
    .select()
    .from(schema.services)
    .where(eq(schema.services.status, "published"))
    .orderBy(asc(schema.services.position), asc(schema.services.id));
}

export async function getPublishedVehicles() {
  "use cache";
  tag();
  const rows = await db
    .select()
    .from(schema.vehicles)
    .where(eq(schema.vehicles.status, "published"))
    .orderBy(asc(schema.vehicles.position), asc(schema.vehicles.id));
  const ids = rows.map((r) => r.id);
  const fares = ids.length
    ? await db.select().from(schema.vehicleFares).where(inArray(schema.vehicleFares.vehicleId, ids)).orderBy(asc(schema.vehicleFares.position))
    : [];
  const imgs = await imagesFor(schema.vehicleImages, "vehicleId", ids);
  return rows.map((r) => ({ ...r, fares: fares.filter((f) => f.vehicleId === r.id), imageIds: imgs.get(r.id) ?? [] }));
}
export type PublicVehicle = Awaited<ReturnType<typeof getPublishedVehicles>>[number];

export async function getPublishedHotels() {
  "use cache";
  tag();
  const rows = await db
    .select()
    .from(schema.hotels)
    .where(eq(schema.hotels.status, "published"))
    .orderBy(asc(schema.hotels.position), asc(schema.hotels.id));
  const imgs = await imagesFor(schema.hotelImages, "hotelId", rows.map((r) => r.id));
  return rows.map((r) => ({ ...r, imageIds: imgs.get(r.id) ?? [] }));
}
export type PublicHotel = Awaited<ReturnType<typeof getPublishedHotels>>[number];

export async function getPublishedDestinations() {
  "use cache";
  tag();
  return db
    .select()
    .from(schema.destinations)
    .where(eq(schema.destinations.status, "published"))
    .orderBy(asc(schema.destinations.position), asc(schema.destinations.id));
}

export async function getPublishedTestimonials() {
  "use cache";
  tag();
  return db
    .select()
    .from(schema.testimonials)
    .where(eq(schema.testimonials.status, "published"))
    .orderBy(asc(schema.testimonials.position), asc(schema.testimonials.id));
}

export async function getPublishedFaqs(category: string) {
  "use cache";
  tag();
  const where = category
    ? and(eq(schema.faqs.status, "published"), eq(schema.faqs.category, category))
    : eq(schema.faqs.status, "published");
  return db.select().from(schema.faqs).where(where).orderBy(asc(schema.faqs.position), asc(schema.faqs.id));
}

export async function getAnalyticsConfig() {
  "use cache";
  tag();
  const rows = await db.select().from(schema.analyticsConfiguration).where(eq(schema.analyticsConfiguration.isEnabled, true));
  return rows.map((r) => ({ provider: r.provider, publicId: r.publicId, conversionLabel: r.conversionLabel, requiresConsent: r.requiresConsent }));
}

/** Published blog posts, newest first. */
export async function getPublishedPosts() {
  "use cache";
  tag();
  return db
    .select()
    .from(schema.posts)
    .where(eq(schema.posts.status, "published"))
    .orderBy(desc(schema.posts.publishedAt), desc(schema.posts.id));
}
export type PublicPost = Awaited<ReturnType<typeof getPublishedPosts>>[number];
