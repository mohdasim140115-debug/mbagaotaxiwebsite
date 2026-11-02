import "server-only";
import { and, desc, eq, inArray, like, or, sql } from "@/server/db/orm";
import { db, schema } from "../db/client";
import { deleteMediaFile } from "../media/storage";
import { mediaUrl } from "./public";

export const PAGE_SIZE = 48;

export async function listMedia(opts: { q?: string; page?: number; licence?: string } = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const conds = [];
  if (opts.q) conds.push(or(like(schema.media.altText, `%${opts.q}%`), like(schema.media.filename, `%${opts.q}%`), like(schema.media.caption, `%${opts.q}%`))!);
  if (opts.licence) conds.push(eq(schema.media.licenceStatus, opts.licence as (typeof schema.LICENCE_STATUSES)[number]));
  const where = conds.length ? and(...conds) : undefined;
  const [rows, [{ total }]] = await Promise.all([
    db.select().from(schema.media).where(where).orderBy(desc(schema.media.id)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ total: sql<number>`COUNT(*)` }).from(schema.media).where(where),
  ]);
  const ids = rows.map((r) => r.id);
  const usage = ids.length
    ? await db
        .select({ mediaId: schema.mediaUsages.mediaId, n: sql<number>`COUNT(*)` })
        .from(schema.mediaUsages)
        .where(inArray(schema.mediaUsages.mediaId, ids))
        .groupBy(schema.mediaUsages.mediaId)
    : [];
  return {
    items: rows.map((r) => ({ ...r, url: mediaUrl(r.storageKey), usageCount: Number(usage.find((u) => u.mediaId === r.id)?.n ?? 0) })),
    total: Number(total),
    page,
    pages: Math.max(1, Math.ceil(Number(total) / PAGE_SIZE)),
  };
}

export async function mediaUsages(mediaId: number) {
  const rows = await db.select().from(schema.mediaUsages).where(eq(schema.mediaUsages.mediaId, mediaId));
  const out: { label: string; href: string }[] = [];
  for (const r of rows) {
    if (r.entityType === "pages") {
      const [p] = await db.select({ title: schema.pages.title, path: schema.pages.path }).from(schema.pages).where(eq(schema.pages.id, r.entityId)).limit(1);
      if (p) out.push({ label: `Page: ${p.title} (${p.path})`, href: `/admin/pages/${r.entityId}/` });
    } else if (r.entityType === "settings") {
      out.push({ label: `Site settings (${r.field})`, href: "/admin/settings/" });
    } else if (r.entityType === "seo") {
      out.push({ label: `SEO image (${r.field})`, href: "/admin/seo/" });
    } else {
      out.push({ label: `${r.entityType} #${r.entityId}`, href: `/admin/content/${r.entityType}/${r.entityId}/` });
    }
  }
  // One image can appear in several sections of the same page; list each place once.
  return out.filter((u, i) => out.findIndex((x) => x.label === u.label) === i);
}

export async function deleteMedia(mediaId: number) {
  const [row] = await db.select().from(schema.media).where(eq(schema.media.id, mediaId)).limit(1);
  if (!row) return;
  await db.transaction(async (tx) => {
    // Detach from galleries (FK restrict) — single-image references are nulled by ON DELETE SET NULL.
    await tx.delete(schema.packageImages).where(eq(schema.packageImages.mediaId, mediaId));
    await tx.delete(schema.vehicleImages).where(eq(schema.vehicleImages.mediaId, mediaId));
    await tx.delete(schema.hotelImages).where(eq(schema.hotelImages.mediaId, mediaId));
    await tx.delete(schema.media).where(eq(schema.media.id, mediaId));
  });
  await deleteMediaFile(row.storageKey);
}

export async function updateMediaMeta(mediaId: number, values: { altText: string; caption: string; credit: string; licenceStatus: string }, userId: number) {
  await db
    .update(schema.media)
    .set({
      altText: values.altText.slice(0, 300),
      caption: values.caption.slice(0, 300),
      credit: values.credit.slice(0, 300),
      licenceStatus: (schema.LICENCE_STATUSES as readonly string[]).includes(values.licenceStatus) ? (values.licenceStatus as (typeof schema.LICENCE_STATUSES)[number]) : "pending",
      updatedBy: userId,
    })
    .where(eq(schema.media.id, mediaId));
}
