export type RedirectRule = { id: number; sourcePath: string; destination: string; statusCode: number };

/** Normalises a source path for storage/matching: leading slash, no host, keeps query string. */
export function normaliseSource(input: string): string {
  let s = input.trim();
  try {
    if (/^https?:\/\//.test(s)) {
      const u = new URL(s);
      s = u.pathname + u.search;
    }
  } catch {
    /* fall through */
  }
  if (!s.startsWith("/")) s = `/${s}`;
  return s;
}

/** Exact match on path+query first (e.g. "/?page_id=84"), then on path alone, with/without trailing slash. */
export function matchRedirect(rules: RedirectRule[], pathname: string, search: string): RedirectRule | null {
  const withQuery = pathname + search;
  const alt = pathname.endsWith("/") ? pathname.slice(0, -1) : `${pathname}/`;
  return (
    (search && rules.find((r) => r.sourcePath === withQuery)) ||
    rules.find((r) => r.sourcePath === pathname) ||
    rules.find((r) => r.sourcePath === alt) ||
    null
  );
}

/**
 * Validates a redirect against the existing set: rejects self-redirects, loops and chains.
 * Returns an error message or null.
 */
export function validateRedirect(
  rule: { sourcePath: string; destination: string; statusCode: number },
  others: { sourcePath: string; destination: string; statusCode: number }[],
  existingPagePaths: string[],
): string | null {
  const src = normaliseSource(rule.sourcePath);
  if (src.startsWith("/admin") || src.startsWith("/api") || src.startsWith("/_next") || src.startsWith("/media/")) {
    return "Redirects cannot be created for system paths (/admin, /api, /_next, /media).";
  }
  if (rule.statusCode === 410) return null;
  if (!rule.destination) return "A destination is required for 301/302 redirects.";
  const isExternal = /^https?:\/\//.test(rule.destination);
  if (!isExternal && !rule.destination.startsWith("/")) return "Destination must start with / or be a full https:// URL.";
  if (isExternal) return null;
  const strip = (p: string) => (p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p);
  if (strip(rule.destination.split("#")[0]!) === strip(src)) return "A redirect cannot point to itself.";
  // Walk the chain from the destination; any hop back to the source is a loop, any hop at all is a chain.
  const map = new Map(others.filter((o) => o.statusCode !== 410).map((o) => [strip(normaliseSource(o.sourcePath)), o.destination]));
  let cur = strip(rule.destination.split("#")[0]!);
  const seen = new Set<string>([strip(src)]);
  let hops = 0;
  while (map.has(cur)) {
    if (seen.has(cur)) return "This redirect would create a loop.";
    seen.add(cur);
    const next = map.get(cur)!;
    if (/^https?:\/\//.test(next)) break;
    cur = strip(next.split("#")[0]!);
    hops++;
    if (seen.has(cur)) return "This redirect would create a loop.";
    if (hops > 10) break;
  }
  if (hops > 0) return `Destination is itself redirected (${hops} hop${hops > 1 ? "s" : ""}). Point directly at the final URL to avoid a redirect chain.`;
  // Redirecting a live page hides it — require explicit acknowledgement in the UI.
  if (existingPagePaths.map(strip).includes(strip(src))) return "WARN_EXISTING_PAGE";
  return null;
}
