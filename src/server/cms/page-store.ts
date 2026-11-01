import "server-only";
import { and, asc, eq, isNotNull, lte, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db/client";
import { isSectionType, sectionMediaIds, sectionSchema, type SectionType } from "@/lib/cms/sections";
import { ConflictError, syncMediaUsages, ValidationError, writeRevision } from "./entity-store";

const RESERVED = [/^\/admin(\/|$)/, /^\/api(\/|$)/, /^\/media(\/|$)/, /^\/_next(\/|$)/, /^\/(packages|blog|taxi-services)\/[^/]+\/$/, /^\/sitemap\.xml/, /^\/robots\.txt/, /^\/image-credits\/$/];

export const pagePathSchema = z
  .string()
  .trim()
  .transform((p) => {
    let v = p.toLowerCase();
    if (!v.startsWith("/")) v = `/${v}`;
    if (!v.endsWith("/")) v = `${v}/`;
    return v.replace(/\/{2,}/g, "/");
  })
  .refine((p) => /^\/([a-z0-9-]+\/)*$/.test(p), "Use lowercase letters, numbers, hyphens and slashes only (e.g. /goa-tours/)")
  .refine((p) => !RESERVED.some((r) => r.test(p)), "This path is reserved by the system");

const sectionInput = z.object({
  type: z.string(),
  isEnabled: z.boolean(),
  data: z.record(z.string(), z.unknown()),
});

export const pageInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(191),
  path: pagePathSchema,
  template: z.string().trim().max(32).default("generic"),
  scheduledAt: z.string().trim().max(32).default(""),
  sections: z.array(sectionInput).max(40),
  seo: z
    .object({
      metaTitle: z.string().trim().max(191).default(""),
      metaDescription: z.string().trim().max(320).default(""),
      canonicalUrl: z.union([z.literal(""), z.string().trim().url()]).default(""),
      robotsIndex: z.boolean().default(true),
      robotsFollow: z.boolean().default(true),
      ogTitle: z.string().trim().max(191).default(""),
      ogDescription: z.string().trim().max(320).default(""),
      ogImageId: z.number().int().positive().nullable().default(null),
    })
    .optional(),
});
export type PageInput = z.input<typeof pageInputSchema>;

export async function listPages() {
  return db
    .select({
      id: schema.pages.id,
      path: schema.pages.path,
      title: schema.pages.title,
      status: schema.pages.status,
      isSystem: schema.pages.isSystem,
      hasUnpublishedChanges: schema.pages.hasUnpublishedChanges,
      scheduledAt: schema.pages.scheduledAt,
      updatedAt: schema.pages.updatedAt,
      editor: schema.adminUsers.name,
    })
    .from(schema.pages)
    .leftJoin(schema.adminUsers, eq(schema.adminUsers.id, schema.pages.updatedBy))
    .orderBy(asc(schema.pages.path));
}

export async function loadPage(id: number) {
  const [page] = await db.select().from(schema.pages).where(eq(schema.pages.id, id)).limit(1);
  if (!page) return null;
  const sections = await db.select().from(schema.pageSections).where(eq(schema.pageSections.pageId, id)).orderBy(asc(schema.pageSections.position));
  const [seo] = await db
    .select()
    .from(schema.seoMetadata)
    .where(and(eq(schema.seoMetadata.entityType, "page"), eq(schema.seoMetadata.entityId, id)))
    .limit(1);
  return { page, sections, seo: seo ?? null };
}

function validateSections(sections: z.infer<typeof sectionInput>[]) {
  const errors: Record<string, string> = {};
  const out = sections.map((s, i) => {
    if (!isSectionType(s.type)) {
      errors[`sections.${i}`] = `Unknown section type “${s.type}”`;
      return null;
    }
    const parsed = sectionSchema(s.type).safeParse(s.data);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) errors[`sections.${i}.${issue.path.join(".")}`] ??= issue.message;
      return null;
    }
    return { type: s.type as SectionType, isEnabled: s.isEnabled, data: parsed.data as Record<string, unknown> };
  });
  const h1Count = out.filter((s) => s && s.isEnabled && (s.type === "hero" || s.data.headingLevel === "h1")).length;
  if (h1Count > 1) errors.sections = "Only one enabled section may use an H1 heading (hero sections always use H1).";
  if (Object.keys(errors).length) throw new ValidationError(errors);
  return out as { type: SectionType; isEnabled: boolean; data: Record<string, unknown> }[];
}

/** Saves the working copy (draft). The public site keeps serving the last published snapshot. */
export async function savePage(id: number | null, input: unknown, expectedVersion: number | null, userId: number, canEditSeo: boolean) {
  const parsed = pageInputSchema.safeParse(input);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) errors[issue.path.join(".")] ??= issue.message;
    throw new ValidationError(errors);
  }
  const v = parsed.data;
  const sections = validateSections(v.sections);
  // datetime-local inputs carry no zone; the business operates on India Standard Time.
  const scheduledAt = v.scheduledAt ? new Date(/(z|[+-]\d\d:\d\d)$/i.test(v.scheduledAt) ? v.scheduledAt : `${v.scheduledAt}+05:30`) : null;
  if (scheduledAt && Number.isNaN(scheduledAt.getTime())) throw new ValidationError({ scheduledAt: "Invalid date" });

  return db.transaction(async (tx) => {
    const clash = await tx
      .select({ id: schema.pages.id })
      .from(schema.pages)
      .where(id ? and(eq(schema.pages.path, v.path), ne(schema.pages.id, id)) : eq(schema.pages.path, v.path))
      .limit(1);
    if (clash.length) throw new ValidationError({ path: "Another page already uses this path" });

    let pageId: number;
    let version: number;
    if (id === null) {
      const [res] = await tx.insert(schema.pages).values({
        path: v.path, title: v.title, template: v.template, status: "draft", scheduledAt, hasUnpublishedChanges: true, createdBy: userId, updatedBy: userId,
      });
      pageId = res.insertId;
      version = 1;
    } else {
      const [existing] = await tx.select({ isSystem: schema.pages.isSystem, path: schema.pages.path }).from(schema.pages).where(eq(schema.pages.id, id)).limit(1);
      if (existing?.isSystem && existing.path !== v.path) {
        throw new ValidationError({ path: "This page is part of the original site; its URL cannot be changed here. Use a redirect if a move is approved." });
      }
      const [res] = await tx
        .update(schema.pages)
        .set({ title: v.title, path: v.path, template: v.template, scheduledAt, hasUnpublishedChanges: true, updatedBy: userId, version: sql`${schema.pages.version} + 1` })
        .where(and(eq(schema.pages.id, id), eq(schema.pages.version, expectedVersion ?? -1)));
      if (res.affectedRows === 0) throw new ConflictError("This page was saved by someone else since you opened it. Reload to get the latest version.");
      pageId = id;
      version = (expectedVersion ?? 0) + 1;
    }

    await tx.delete(schema.pageSections).where(eq(schema.pageSections.pageId, pageId));
    if (sections.length) {
      await tx.insert(schema.pageSections).values(sections.map((s, position) => ({ pageId, type: s.type, position, isEnabled: s.isEnabled, data: s.data })));
    }
    if (canEditSeo && v.seo) {
      await tx
        .insert(schema.seoMetadata)
        .values({ entityType: "page", entityId: pageId, ...v.seo })
        .onDuplicateKeyUpdate({ set: { ...v.seo } });
    }
    const mediaIds = sections.flatMap((s) => sectionMediaIds(s.type, s.data));
    if (v.seo?.ogImageId) mediaIds.push(v.seo.ogImageId);
    await syncMediaUsages(tx, "pages", pageId, mediaIds);
    await writeRevision(tx, "pages", pageId, version, { title: v.title, path: v.path, sections }, userId, "Draft saved");
    return { id: pageId, version };
  });
}

export async function publishPage(id: number, userId: number | null) {
  const loaded = await loadPage(id);
  if (!loaded) throw new ValidationError({ page: "Page not found" });
  const snapshot = {
    title: loaded.page.title,
    sections: loaded.sections.map((s) => ({ type: s.type, isEnabled: s.isEnabled, data: s.data })),
  };
  await db.transaction(async (tx) => {
    await tx
      .update(schema.pages)
      .set({ status: "published", publishedAt: new Date(), publishedData: snapshot, hasUnpublishedChanges: false, scheduledAt: null, updatedBy: userId })
      .where(eq(schema.pages.id, id));
    await writeRevision(tx, "pages", id, loaded.page.version, { ...snapshot, path: loaded.page.path }, userId, "Published");
  });
}

export async function setPageStatus(id: number, status: "draft" | "archived", userId: number) {
  await db.update(schema.pages).set({ status, updatedBy: userId }).where(eq(schema.pages.id, id));
}

/** Copies a revision snapshot back into the working copy as a draft (does not publish). */
export async function restorePageRevision(id: number, revisionSnapshot: { title: string; sections: { type: string; isEnabled: boolean; data: Record<string, unknown> }[] }, userId: number) {
  const sections = validateSections(revisionSnapshot.sections.map((s) => ({ ...s, isEnabled: s.isEnabled ?? true })));
  await db.transaction(async (tx) => {
    await tx.update(schema.pages).set({ title: revisionSnapshot.title, hasUnpublishedChanges: true, updatedBy: userId, version: sql`${schema.pages.version} + 1` }).where(eq(schema.pages.id, id));
    await tx.delete(schema.pageSections).where(eq(schema.pageSections.pageId, id));
    if (sections.length) await tx.insert(schema.pageSections).values(sections.map((s, position) => ({ pageId: id, type: s.type, position, isEnabled: s.isEnabled, data: s.data })));
  });
}

/** Publishes drafts whose scheduled time has passed. Returns the number published. */
export async function publishDuePages(userId: number | null) {
  const due = await db
    .select({ id: schema.pages.id })
    .from(schema.pages)
    .where(and(isNotNull(schema.pages.scheduledAt), lte(schema.pages.scheduledAt, new Date()), ne(schema.pages.status, "archived")));
  for (const p of due) await publishPage(p.id, userId);
  return due.length;
}
