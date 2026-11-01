import "server-only";
import { inArray } from "drizzle-orm";
import { db, schema } from "../db/client";
import { mediaUrl } from "./public";
import { refOptions } from "./entity-store";

/** Thumbnails for media ids referenced by a form, so editors render without extra requests. */
export async function mediaThumbs(ids: number[]) {
  const unique = [...new Set(ids.filter((n) => Number.isInteger(n) && n > 0))];
  if (!unique.length) return {};
  const rows = await db.select({ id: schema.media.id, storageKey: schema.media.storageKey, altText: schema.media.altText }).from(schema.media).where(inArray(schema.media.id, unique));
  return Object.fromEntries(rows.map((r) => [r.id, { url: mediaUrl(r.storageKey), altText: r.altText }]));
}

/** Collects every number stored under media-ish keys in arbitrary JSON (sections, entities). */
export function deepMediaIds(value: unknown, out: number[] = []): number[] {
  if (Array.isArray(value)) value.forEach((v) => deepMediaIds(v, out));
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if ((k === "mediaId" || k === "imageId" || k === "ogImageId") && typeof v === "number") out.push(v);
      else if ((k === "images") && Array.isArray(v) && v.every((x) => typeof x === "number")) out.push(...(v as number[]));
      else deepMediaIds(v, out);
    }
  }
  return out;
}

export async function allRefOptions() {
  const [packages, services, vehicles, hotels, destinations, faqs, testimonials] = await Promise.all([
    refOptions("packages"),
    refOptions("services"),
    refOptions("vehicles"),
    refOptions("hotels"),
    refOptions("destinations"),
    refOptions("faqs"),
    refOptions("testimonials"),
  ]);
  return { packages, services, vehicles, hotels, destinations, faqs, testimonials };
}
