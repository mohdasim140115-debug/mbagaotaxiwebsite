import { readMediaFile, STORAGE_KEY_PATTERN } from "@/server/media/storage";

/** Serves uploaded media. Keys are validated against a strict pattern (no path traversal). */
export async function GET(req: Request, ctx: RouteContext<"/media/[key]">) {
  const { key } = await ctx.params;
  if (!STORAGE_KEY_PATTERN.test(key)) return new Response("Not found", { status: 404 });
  let file: Buffer;
  try {
    file = await readMediaFile(key);
  } catch {
    // Not in STORAGE_DIR (e.g. on Vercel, where the filesystem is read-only): use the copy shipped in /public/uploads.
    try {
      const res = await fetch(new URL(`/uploads/${key}`, req.url));
      if (!res.ok) return new Response("Not found", { status: 404 });
      file = Buffer.from(await res.arrayBuffer());
    } catch {
      return new Response("Not found", { status: 404 });
    }
  }
  try {
    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": "image/webp",
        "Content-Length": String(file.byteLength),
        // Replacing a file keeps its key, so allow revalidation rather than marking it immutable.
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
