import { readMediaFile, STORAGE_KEY_PATTERN } from "@/server/media/storage";

/** Serves uploaded media. Keys are validated against a strict pattern (no path traversal). */
export async function GET(_req: Request, ctx: RouteContext<"/media/[key]">) {
  const { key } = await ctx.params;
  if (!STORAGE_KEY_PATTERN.test(key)) return new Response("Not found", { status: 404 });
  try {
    const file = await readMediaFile(key);
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
