import "server-only";
import path from "node:path";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import sharp, { type Metadata } from "sharp";
import { eq } from "@/server/db/orm";
import { db, schema } from "../db/client";
import { randomToken, sha256 } from "../crypto";
import { slugify } from "@/lib/utils";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ACCEPTED_FORMATS = new Set(["jpeg", "png", "webp", "avif", "heif"]);
const ACCEPTED_EXT = /\.(jpe?g|png|webp|avif|heic|heif)$/i;
export const STORAGE_KEY_PATTERN = /^[a-z0-9][a-z0-9-]{0,150}\.webp$/;

export function storageDir() {
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.STORAGE_DIR ?? "./storage/uploads");
}

export function storagePath(key: string) {
  if (!STORAGE_KEY_PATTERN.test(key)) throw new Error("Invalid storage key");
  return path.join(storageDir(), key);
}

export class UploadError extends Error {}

/**
 * Validates by decoding the actual bytes (not the client-supplied MIME type), then re-encodes
 * to WebP with EXIF/GPS stripped. Anything sharp cannot decode as an image is rejected.
 */
export async function processImage(buffer: Buffer, originalName: string) {
  if (buffer.byteLength > MAX_UPLOAD_BYTES) throw new UploadError("File is larger than 10 MB.");
  if (!ACCEPTED_EXT.test(originalName)) throw new UploadError("Only JPG, PNG, WebP, AVIF or HEIC images are allowed.");
  let meta: Metadata;
  try {
    meta = await sharp(buffer, { limitInputPixels: 60_000_000 }).metadata();
  } catch {
    throw new UploadError("The file is not a valid image.");
  }
  if (!meta.format || !ACCEPTED_FORMATS.has(meta.format)) throw new UploadError("Unsupported image format.");
  const { data, info } = await sharp(buffer, { limitInputPixels: 60_000_000 })
    .rotate()
    .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

export async function storeMedia(opts: {
  buffer: Buffer;
  originalName: string;
  altText?: string;
  caption?: string;
  credit?: string;
  licenceStatus?: (typeof schema.LICENCE_STATUSES)[number];
  sourceUrl?: string | null;
  userId: number | null;
}) {
  const { data, width, height } = await processImage(opts.buffer, opts.originalName);
  const base = slugify(opts.originalName.replace(/\.[^.]+$/, "")).slice(0, 80) || "image";
  const key = `${base}-${randomToken(6).toLowerCase().replace(/[^a-z0-9]/g, "")}.webp`;
  await mkdir(storageDir(), { recursive: true });
  await writeFile(storagePath(key), data);
  const [res] = await db.insert(schema.media).values({
    filename: `${base}.webp`,
    storageKey: key,
    mime: "image/webp",
    bytes: data.byteLength,
    width,
    height,
    altText: (opts.altText ?? "").slice(0, 300),
    caption: (opts.caption ?? "").slice(0, 300),
    credit: (opts.credit ?? "").slice(0, 300),
    licenceStatus: opts.licenceStatus ?? "pending",
    sourceUrl: opts.sourceUrl ?? null,
    sha256: sha256(data),
    createdBy: opts.userId,
    updatedBy: opts.userId,
  });
  return { id: res.insertId, storageKey: key, width, height };
}

/** Replaces the file behind an existing media id (keeps every reference intact). */
export async function replaceMediaFile(mediaId: number, buffer: Buffer, originalName: string, userId: number) {
  const [row] = await db.select().from(schema.media).where(eq(schema.media.id, mediaId)).limit(1);
  if (!row) throw new UploadError("Media not found.");
  const { data, width, height } = await processImage(buffer, originalName);
  await writeFile(storagePath(row.storageKey), data);
  await db
    .update(schema.media)
    .set({ bytes: data.byteLength, width, height, sha256: sha256(data), updatedBy: userId, version: row.version + 1 })
    .where(eq(schema.media.id, mediaId));
}

export async function deleteMediaFile(key: string) {
  try {
    await unlink(storagePath(key));
  } catch {
    /* already gone */
  }
}

export async function readMediaFile(key: string) {
  return readFile(storagePath(key));
}
