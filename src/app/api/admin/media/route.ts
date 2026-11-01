import { revalidateTag } from "next/cache";
import { getCurrentAdmin } from "@/server/auth/session";
import { MAX_UPLOAD_BYTES, replaceMediaFile, storeMedia, UploadError } from "@/server/media/storage";
import { audit } from "@/server/audit";
import { CMS_TAG } from "@/server/cms/settings";

const json = (body: object, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** Multipart upload: fields `file` (required), `alt`, `caption`, `credit`, `licence`, `replaceId`. */
export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host")) return json({ ok: false, error: "Invalid origin" }, 403);
  const user = await getCurrentAdmin();
  if (!user) return json({ ok: false, error: "Not signed in" }, 401);
  if (!user.permissions.includes("media.upload")) return json({ ok: false, error: "You do not have permission to upload media" }, 403);
  if (Number(req.headers.get("content-length") ?? 0) > MAX_UPLOAD_BYTES + 64 * 1024) return json({ ok: false, error: "File is larger than 10 MB." }, 413);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ ok: false, error: "Invalid upload" }, 400);
  }
  const file = form.get("file");
  if (!(file instanceof File)) return json({ ok: false, error: "Choose an image to upload" }, 400);
  const buffer = Buffer.from(await file.arrayBuffer());
  const replaceId = Number(form.get("replaceId") ?? 0);
  try {
    if (replaceId > 0) {
      await replaceMediaFile(replaceId, buffer, file.name, user.id);
      await audit(user.id, "media.replace", "media", replaceId, `Replaced file with ${file.name}`);
      revalidateTag(CMS_TAG, { expire: 0 });
      return json({ ok: true, id: replaceId });
    }
    const licence = String(form.get("licence") ?? "pending");
    const res = await storeMedia({
      buffer,
      originalName: file.name,
      altText: String(form.get("alt") ?? ""),
      caption: String(form.get("caption") ?? ""),
      credit: String(form.get("credit") ?? ""),
      licenceStatus: (["owner", "licensed", "pending"].includes(licence) ? licence : "pending") as "owner" | "licensed" | "pending",
      userId: user.id,
    });
    await audit(user.id, "media.upload", "media", res.id, `Uploaded ${file.name}`);
    return json({ ok: true, id: res.id, url: `/media/${res.storageKey}`, width: res.width, height: res.height });
  } catch (err) {
    if (err instanceof UploadError) return json({ ok: false, error: err.message }, 422);
    console.error("[media upload]", err);
    return json({ ok: false, error: "Upload failed. Please try again." }, 500);
  }
}
