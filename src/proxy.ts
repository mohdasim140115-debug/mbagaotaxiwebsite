import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { MongoClient, type Db } from "mongodb";
import { matchRedirect, type RedirectRule } from "@/lib/redirects";

/*
 * Runs before routing (Node.js runtime):
 *  1. www → apex canonical host (single hop)
 *  2. Uppercase paths → lowercase (the old site served /About-Us/ as a duplicate)
 *  3. CMS-managed redirects (301/302) and 410 Gone, cached for 30 s
 */

let dbPromise: Promise<Db> | null = null;
function getDb() {
  dbPromise ??= (async () => {
    const url = process.env.DATABASE_URL!;
    const client = await new MongoClient(url, { maxPoolSize: 2 }).connect();
    const name = process.env.MONGODB_DB || new URL(url.replace("mongodb+srv:", "http:").replace("mongodb:", "http:")).pathname.slice(1) || "mba_travels";
    return client.db(name);
  })();
  return dbPromise;
}
let cache: { at: number; rules: RedirectRule[] } | null = null;
const TTL_MS = 30_000;

async function loadRules(): Promise<RedirectRule[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.rules;
  try {
    const rows = await (await getDb()).collection("redirects").find({ isActive: true }, { projection: { _id: 0, id: 1, sourcePath: 1, destination: 1, statusCode: 1 } }).toArray();
    cache = { at: Date.now(), rules: rows as unknown as RedirectRule[] };
  } catch (err) {
    // Never take the site down because the redirect table is unreachable.
    console.error("[proxy] redirect load failed", err);
    cache = { at: Date.now(), rules: cache?.rules ?? [] };
  }
  return cache.rules;
}

let knownCache: { at: number; paths: Set<string> } | null = null;
const KNOWN_TTL_MS = 5_000;

/** Published page paths, package detail pages and fixed system routes. Null = DB unavailable (fail open). */
async function loadKnownPaths(): Promise<Set<string> | null> {
  if (knownCache && Date.now() - knownCache.at < KNOWN_TTL_MS) return knownCache.paths;
  try {
    const db = await getDb();
    const list = (c: string, q: object, field: string) => db.collection(c).find(q, { projection: { _id: 0, [field]: 1 } }).toArray() as Promise<Record<string, string>[]>;
    const [pages, pkgs, vehs, blog] = await Promise.all([
      list("pages", { status: "published" }, "path"),
      list("packages", { status: "published", hasDetailPage: true }, "slug"),
      list("vehicles", { status: "published", hasDetailPage: true }, "slug"),
      list("posts", { status: "published" }, "slug"),
    ]);
    const paths = new Set<string>(["/image-credits/", "/not-found-route/"]);
    for (const p of pages) paths.add(p.path!);
    for (const p of pkgs) paths.add(`/packages/${p.slug}/`);
    for (const p of vehs) paths.add(`/taxi-services/${p.slug}/`);
    for (const p of blog) paths.add(`/blog/${p.slug}/`);
    knownCache = { at: Date.now(), paths };
    return paths;
  } catch (err) {
    console.error("[proxy] known-path load failed", err);
    return null;
  }
}

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  const url = request.nextUrl;
  const canonical = new URL(process.env.SITE_URL ?? "https://mbatravelsgoa.com");
  const host = request.headers.get("host") ?? "";

  if (host === `www.${canonical.host}`) {
    return NextResponse.redirect(new URL(url.pathname + url.search, canonical), 301);
  }

  if (/[A-Z]/.test(url.pathname)) {
    const lower = url.clone();
    lower.pathname = url.pathname.toLowerCase();
    return NextResponse.redirect(lower, 301);
  }

  const rule = matchRedirect(await loadRules(), url.pathname, url.search);
  if (rule) {
    event.waitUntil(
      (async () => {
        try {
          await (await getDb()).collection("redirects").updateOne({ id: rule.id }, { $inc: { hits: 1 }, $set: { lastHitAt: new Date() } });
        } catch {
          /* hit counting is best-effort */
        }
      })(),
    );
    if (rule.statusCode === 410) return new NextResponse("Gone", { status: 410, headers: { "X-Robots-Tag": "noindex" } });
    const dest = /^https?:\/\//.test(rule.destination) ? new URL(rule.destination) : new URL(rule.destination, request.url);
    return NextResponse.redirect(dest, rule.statusCode === 302 ? 302 : 301);
  }

  // Unknown URL: answer 404 before any streaming starts. (Paths without a trailing slash fall
  // through so Next.js can issue its canonical trailing-slash redirect first.)
  // Paths whose last segment has a file extension (e.g. /wp-login.php, /secret.webp) get no
  // trailing-slash redirect and the site serves no such files, so they are always unknown.
  // Next.js itself requests dotted internal URLs for client navigation and prefetching (`/page.rsc`, `/page.segments/_tree.segment.rsc`); those must pass through.
  const isNextInternal = /\.rsc$|\.segments\//.test(url.pathname);
  const isFilePath = !isNextInternal && !url.pathname.endsWith("/") && (url.pathname.split("/").pop() ?? "").includes(".");
  if (isFilePath) return NextResponse.rewrite(new URL("/not-found-route/", request.url));
  if (url.pathname.endsWith("/")) {
    const known = await loadKnownPaths();
    if (known && !known.has(url.pathname)) return NextResponse.rewrite(new URL("/not-found-route/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|media/|images/|uploads/|api/|admin/|favicon.ico|sitemap.xml|robots.txt|google[a-z0-9]+.html).*)"],
};
