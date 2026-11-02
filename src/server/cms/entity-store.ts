import "server-only";
import { and, asc, desc, eq, ne, getTableColumns, inArray, like, or, sql } from "@/server/db/orm";
import type { Table as MySqlTable } from "@/server/db/orm";
import { db, schema, type Tx } from "../db/client";
import { ENTITIES, type EntityKey } from "@/lib/cms/entities";
import { collectMediaIds, fieldsToZod } from "@/lib/cms/fields";
import { formatInr, formatPrice } from "@/lib/cms/fares";
import { slugify } from "@/lib/utils";
import type { Status } from "../db/schema";

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyTable = MySqlTable & Record<string, any>;

const TABLES: Record<EntityKey, AnyTable> = {
  packages: schema.packages as AnyTable,
  services: schema.services as AnyTable,
  vehicles: schema.vehicles as AnyTable,
  hotels: schema.hotels as AnyTable,
  destinations: schema.destinations as AnyTable,
  testimonials: schema.testimonials as AnyTable,
  faqs: schema.faqs as AnyTable,
  posts: schema.posts as AnyTable,
};

const IMAGE_TABLES: Partial<Record<EntityKey, { table: AnyTable; owner: string }>> = {
  packages: { table: schema.packageImages as AnyTable, owner: "packageId" },
  vehicles: { table: schema.vehicleImages as AnyTable, owner: "vehicleId" },
  hotels: { table: schema.hotelImages as AnyTable, owner: "hotelId" },
};

export function entityTable(key: EntityKey) {
  return TABLES[key];
}

export function entitySchema(key: EntityKey) {
  return fieldsToZod(ENTITIES[key].fields);
}

/** Columns that exist on the table, used to strip virtual fields (images, fares) before writes. */
function tableColumns(key: EntityKey) {
  const protectedCols = ["id", "status", "version", "createdBy", "updatedBy", "createdAt", "updatedAt", "sourceUrl"];
  return new Set(Object.keys(getTableColumns(TABLES[key])).filter((k) => !protectedCols.includes(k)));
}

export class ConflictError extends Error {}
export class ValidationError extends Error {
  constructor(public fieldErrors: Record<string, string>) {
    super("Validation failed");
  }
}

export async function listEntities(key: EntityKey, opts: { q?: string; status?: string } = {}) {
  const t = TABLES[key];
  const def = ENTITIES[key];
  const conds: any[] = [];
  if (opts.status && ["draft", "published", "archived"].includes(opts.status)) conds.push(eq(t.status, opts.status));
  else conds.push(ne(t.status, "archived"));
  if (opts.q) conds.push(or(like(t[def.titleField], `%${opts.q}%`))!);
  const rows: any[] = await db.select().from(t).where(and(...conds)).orderBy(asc(t.position), asc(t.id));
  let fares: (typeof schema.vehicleFares.$inferSelect)[] = [];
  if (key === "vehicles" && rows.length) {
    fares = await db.select().from(schema.vehicleFares).where(inArray(schema.vehicleFares.vehicleId, rows.map((r) => r.id))).orderBy(asc(schema.vehicleFares.position));
  }
  return rows.map((r) => ({
    ...r,
    priceDisplay:
      key === "packages"
        ? [formatPrice(r.pricePrefix, r.priceAmount, r.priceText), r.priceSuffix].filter(Boolean).join(" ")
        : key === "hotels"
          ? [r.pricePrefix, formatInr(r.priceAmount), r.priceUnit].filter(Boolean).join(" ")
          : undefined,
    fareSummary: key === "vehicles" ? fares.filter((f) => f.vehicleId === r.id).map((f) => `${f.label || f.fareType} ${formatInr(f.amount)}${f.unitLabel ? " " + f.unitLabel : ""}`).join(" · ") : undefined,
    verifiedDisplay: key === "testimonials" ? (r.isVerified ? "Yes" : "No — not verified") : undefined,
  }));
}

/** Loads a record as form values (including virtual images/fares fields). */
export async function loadEntity(key: EntityKey, id: number) {
  const t = TABLES[key];
  const [row]: any[] = await db.select().from(t).where(eq(t.id, id)).limit(1);
  if (!row) return null;
  const values: Record<string, unknown> = { ...row };
  const img = IMAGE_TABLES[key];
  if (img) {
    const rows: any[] = await db.select().from(img.table).where(eq(img.table[img.owner], id)).orderBy(asc(img.table.position));
    values.images = rows.map((r) => r.mediaId);
  }
  if (key === "vehicles") {
    const fares = await db.select().from(schema.vehicleFares).where(eq(schema.vehicleFares.vehicleId, id)).orderBy(asc(schema.vehicleFares.position));
    values.fares = fares.map((f) => ({ fareType: f.fareType, label: f.label, amount: f.amount, unitLabel: f.unitLabel, notes: f.notes }));
  }
  if (key === "testimonials" && row.reviewDate instanceof Date) values.reviewDate = row.reviewDate.toISOString().slice(0, 10);
  return values;
}

async function uniqueSlug(tx: Tx, key: EntityKey, wanted: string, excludeId: number | null) {
  const t = TABLES[key];
  const base = slugify(wanted) || key.slice(0, -1);
  let candidate = base;
  for (let i = 2; i < 100; i++) {
    const rows: any[] = await tx.select({ id: t.id }).from(t).where(eq(t.slug, candidate)).limit(1);
    if (!rows.length || rows[0].id === excludeId) return candidate;
    candidate = `${base}-${i}`;
  }
  throw new ValidationError({ slug: "Could not generate a unique slug" });
}

export async function syncMediaUsages(tx: Tx, entityType: string, entityId: number, ids: number[]) {
  await tx.delete(schema.mediaUsages).where(and(eq(schema.mediaUsages.entityType, entityType), eq(schema.mediaUsages.entityId, entityId)));
  const unique = [...new Set(ids)];
  if (unique.length) {
    await tx.insert(schema.mediaUsages).values(unique.map((mediaId) => ({ mediaId, entityType, entityId, field: "content" })));
  }
}

export async function writeRevision(tx: Tx, entityType: string, entityId: number, version: number, snapshot: unknown, userId: number | null, summary: string) {
  await tx.insert(schema.contentRevisions).values({ entityType, entityId, version, snapshot, changeSummary: summary.slice(0, 300), editorId: userId });
}

/**
 * Validates and saves an entity. `expectedVersion` enforces optimistic locking:
 * if someone else saved in the meantime the save is rejected instead of overwriting their work.
 */
export async function saveEntity(key: EntityKey, id: number | null, input: unknown, expectedVersion: number | null, userId: number, summary = "") {
  const def = ENTITIES[key];
  const parsed = entitySchema(key).safeParse(input);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) errors[issue.path.join(".")] ??= issue.message;
    throw new ValidationError(errors);
  }
  const values = parsed.data as Record<string, any>;
  if (key === "testimonials" && values.reviewDate && !/^\d{4}-\d{2}-\d{2}$/.test(values.reviewDate)) {
    throw new ValidationError({ reviewDate: "Use YYYY-MM-DD" });
  }
  const t = TABLES[key];
  const cols = tableColumns(key);

  return db.transaction(async (tx) => {
    if (def.slugFrom) values.slug = await uniqueSlug(tx, key, values.slug || values[def.slugFrom], id);
    const row: Record<string, any> = {};
    for (const [k, v] of Object.entries(values)) if (cols.has(k)) row[k] = v;
    if (key === "testimonials") row.reviewDate = values.reviewDate ? new Date(`${values.reviewDate}T00:00:00Z`) : null;
    if ("position" in row && row.position === null) row.position = 0;
    for (const textCol of ["description", "notes", "quote", "answer"]) if (cols.has(textCol) && row[textCol] === undefined) row[textCol] = "";

    let entityId: number;
    let version: number;
    if (id === null) {
      const [res] = await tx.insert(t).values({ ...row, status: "draft", createdBy: userId, updatedBy: userId, version: 1 } as any);
      entityId = (res as any).insertId;
      version = 1;
    } else {
      const [res] = await tx
        .update(t)
        .set({ ...row, updatedBy: userId, version: sql`${t.version} + 1` } as any)
        .where(and(eq(t.id, id), eq(t.version, expectedVersion ?? -1)));
      if ((res as any).affectedRows === 0) {
        throw new ConflictError("This record was changed by someone else since you opened it. Reload to see the latest version, then reapply your changes.");
      }
      entityId = id;
      version = (expectedVersion ?? 0) + 1;
    }

    const img = IMAGE_TABLES[key];
    if (img) {
      await tx.delete(img.table).where(eq(img.table[img.owner], entityId));
      const ids = [...new Set((values.images as number[]) ?? [])];
      if (ids.length) await tx.insert(img.table).values(ids.map((mediaId, position) => ({ [img.owner]: entityId, mediaId, position })) as any);
    }
    if (key === "vehicles") {
      await tx.delete(schema.vehicleFares).where(eq(schema.vehicleFares.vehicleId, entityId));
      const fares = (values.fares as any[]) ?? [];
      const seen = new Set<string>();
      for (const f of fares) {
        if (seen.has(f.fareType)) throw new ValidationError({ fares: `Duplicate fare type “${f.fareType}”. Use one row per type.` });
        seen.add(f.fareType);
      }
      if (fares.length) {
        await tx.insert(schema.vehicleFares).values(fares.map((f, position) => ({ vehicleId: entityId, fareType: f.fareType, label: f.label, amount: f.amount, unitLabel: f.unitLabel, notes: f.notes, position })));
      }
    }
    await syncMediaUsages(tx, key, entityId, collectMediaIds(def.fields, values));
    await writeRevision(tx, key, entityId, version, values, userId, summary || (id === null ? "Created" : "Edited"));
    return { id: entityId, version };
  });
}

export async function setEntityStatus(key: EntityKey, id: number, status: Status, userId: number) {
  const t = TABLES[key];
  // A blog post keeps the date it was first published.
  const firstPublish = key === "posts" && status === "published" ? { publishedAt: sql`COALESCE(published_at, UTC_TIMESTAMP())` } : {};
  await db.update(t).set({ status, updatedBy: userId, ...firstPublish } as any).where(eq(t.id, id));
}

export async function deleteEntity(key: EntityKey, id: number) {
  const t = TABLES[key];
  await db.transaction(async (tx) => {
    await tx.delete(schema.mediaUsages).where(and(eq(schema.mediaUsages.entityType, key), eq(schema.mediaUsages.entityId, id)));
    await tx.delete(t).where(eq(t.id, id));
  });
}

export async function listRevisions(entityType: string, entityId: number) {
  return db
    .select({ id: schema.contentRevisions.id, version: schema.contentRevisions.version, summary: schema.contentRevisions.changeSummary, createdAt: schema.contentRevisions.createdAt, editor: schema.adminUsers.name })
    .from(schema.contentRevisions)
    .leftJoin(schema.adminUsers, eq(schema.adminUsers.id, schema.contentRevisions.editorId))
    .where(and(eq(schema.contentRevisions.entityType, entityType), eq(schema.contentRevisions.entityId, entityId)))
    .orderBy(desc(schema.contentRevisions.version), desc(schema.contentRevisions.id))
    .limit(50);
}

export async function getRevision(id: number) {
  const [row] = await db.select().from(schema.contentRevisions).where(eq(schema.contentRevisions.id, id)).limit(1);
  return row ?? null;
}

/** Options for "ref" fields (e.g. package picker in sections). */
export async function refOptions(key: EntityKey) {
  const t = TABLES[key];
  const titleCol = t[ENTITIES[key].titleField];
  const rows: any[] = await db.select({ id: t.id, title: titleCol, status: t.status }).from(t).orderBy(asc(t.position), asc(t.id));
  return rows.map((r) => ({ value: String(r.id), label: `${r.title}${r.status !== "published" ? ` (${r.status})` : ""}` }));
}
