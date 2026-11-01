"use server";

import { and, eq } from "drizzle-orm";
import { db, schema } from "../db/client";
import { audit } from "../audit";
import { ENTITIES, isEntityKey, type EntityKey } from "@/lib/cms/entities";
import {
  deleteEntity,
  getRevision,
  saveEntity,
  setEntityStatus,
} from "../cms/entity-store";
import { publishPage, restorePageRevision, savePage, setPageStatus } from "../cms/page-store";
import { guarded, toId, UserFacingError } from "./guard";
import type { Status } from "../db/schema";

function entityKey(k: string): EntityKey {
  if (!isEntityKey(k)) throw new UserFacingError("Unknown content type");
  return k;
}

/* ------------------------------------------------------------------ catalogue entities */

export async function saveEntityAction(key: string, id: number | null, values: unknown, version: number | null, summary: string) {
  return guarded(
    "content.edit",
    async (user) => {
      const k = entityKey(key);
      const res = await saveEntity(k, id === null ? null : toId(id), values, version, user.id, summary);
      await audit(user.id, id === null ? "content.create" : "content.update", k, res.id, `${ENTITIES[k].singular} ${id === null ? "created" : "updated"}${summary ? `: ${summary}` : ""}`);
      return res;
    },
    { invalidate: true, message: "Saved" },
  );
}

export async function setEntityStatusAction(key: string, id: number, status: Status) {
  return guarded(
    "content.publish",
    async (user) => {
      const k = entityKey(key);
      if (!["draft", "published", "archived"].includes(status)) throw new UserFacingError("Invalid status");
      await setEntityStatus(k, toId(id), status, user.id);
      await audit(user.id, `content.${status}`, k, id, `${ENTITIES[k].singular} set to ${status}`);
      return { status };
    },
    { invalidate: true, message: `Status changed to ${status}` },
  );
}

export async function deleteEntityAction(key: string, id: number) {
  return guarded(
    "content.delete",
    async (user) => {
      const k = entityKey(key);
      const t = (await import("../cms/entity-store")).entityTable(k);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [row]: any[] = await db.select().from(t).where(eq(t.id, toId(id))).limit(1);
      if (!row) throw new UserFacingError("Not found");
      if (row.status === "published") throw new UserFacingError("Unpublish or archive this item before deleting it permanently.");
      await deleteEntity(k, row.id);
      await audit(user.id, "content.delete", k, id, `${ENTITIES[k].singular} deleted`);
      return null;
    },
    { invalidate: true, message: "Deleted" },
  );
}

/** Restores an entity revision by re-saving its snapshot (creates a new version; nothing is lost). */
export async function restoreEntityRevisionAction(key: string, id: number, revisionId: number, version: number) {
  return guarded(
    "content.edit",
    async (user) => {
      const k = entityKey(key);
      const rev = await getRevision(toId(revisionId));
      if (!rev || rev.entityType !== k || rev.entityId !== id) throw new UserFacingError("Revision not found");
      const res = await saveEntity(k, id, rev.snapshot, version, user.id, `Restored version ${rev.version}`);
      await audit(user.id, "content.restore", k, id, `Restored revision v${rev.version}`);
      return res;
    },
    { invalidate: true, message: "Revision restored" },
  );
}

/* ------------------------------------------------------------------ pages */

export async function savePageAction(id: number | null, input: unknown, version: number | null) {
  return guarded("content.edit", async (user) => {
    const res = await savePage(id === null ? null : toId(id), input, version, user.id, user.permissions.includes("seo.manage"));
    await audit(user.id, id === null ? "page.create" : "page.save_draft", "pages", res.id, "Draft saved");
    return res;
  }, { message: "Draft saved" });
}

export async function publishPageAction(id: number) {
  return guarded(
    "content.publish",
    async (user) => {
      await publishPage(toId(id), user.id);
      await audit(user.id, "page.publish", "pages", id, "Published");
      return null;
    },
    { invalidate: true, message: "Published" },
  );
}

export async function setPageStatusAction(id: number, status: "draft" | "archived") {
  return guarded(
    "content.publish",
    async (user) => {
      if (status !== "draft" && status !== "archived") throw new UserFacingError("Invalid status");
      const [page] = await db.select({ path: schema.pages.path }).from(schema.pages).where(eq(schema.pages.id, toId(id))).limit(1);
      if (page?.path === "/" && status === "archived") throw new UserFacingError("The homepage cannot be archived.");
      await setPageStatus(id, status, user.id);
      await audit(user.id, status === "draft" ? "page.unpublish" : "page.archive", "pages", id, status === "draft" ? "Unpublished" : "Archived");
      return null;
    },
    { invalidate: true, message: status === "draft" ? "Unpublished" : "Archived" },
  );
}

export async function deletePageAction(id: number) {
  return guarded(
    "content.delete",
    async (user) => {
      const [page] = await db.select().from(schema.pages).where(eq(schema.pages.id, toId(id))).limit(1);
      if (!page) throw new UserFacingError("Not found");
      if (page.isSystem) throw new UserFacingError("Pages from the original site cannot be deleted. Archive it instead and add a redirect if approved.");
      if (page.status === "published") throw new UserFacingError("Unpublish the page before deleting it.");
      await db.delete(schema.pages).where(eq(schema.pages.id, id));
      await db.delete(schema.seoMetadata).where(and(eq(schema.seoMetadata.entityType, "page"), eq(schema.seoMetadata.entityId, id)));
      await audit(user.id, "page.delete", "pages", id, `Deleted ${page.path}`);
      return null;
    },
    { invalidate: true, message: "Deleted" },
  );
}

export async function restorePageRevisionAction(id: number, revisionId: number) {
  return guarded("content.edit", async (user) => {
    const rev = await getRevision(toId(revisionId));
    if (!rev || rev.entityType !== "pages" || rev.entityId !== id) throw new UserFacingError("Revision not found");
    await restorePageRevision(id, rev.snapshot as Parameters<typeof restorePageRevision>[1], user.id);
    await audit(user.id, "page.restore", "pages", id, `Restored revision v${rev.version} as draft`);
    return null;
  }, { message: "Revision restored as a draft — review and publish when ready" });
}

/* ------------------------------------------------------------------ entity SEO (packages) */

export async function saveEntitySeoAction(entityType: "package" | "vehicle" | "post", entityId: number, seo: Record<string, unknown>) {
  return guarded(
    "seo.manage",
    async (user) => {
      const { pageInputSchema } = await import("../cms/page-store");
      const parsed = pageInputSchema.shape.seo.unwrap().safeParse(seo);
      if (!parsed.success) throw new UserFacingError(parsed.error.issues[0]?.message ?? "Invalid SEO values");
      await db.insert(schema.seoMetadata).values({ entityType, entityId: toId(entityId), ...parsed.data }).onDuplicateKeyUpdate({ set: parsed.data });
      await audit(user.id, "seo.update", entityType, entityId, "SEO metadata updated");
      return null;
    },
    { invalidate: true, message: "SEO saved" },
  );
}
