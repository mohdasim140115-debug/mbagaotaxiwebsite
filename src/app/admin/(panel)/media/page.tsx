import { can, requireAdmin } from "@/server/auth/session";
import { listMedia, mediaUsages } from "@/server/cms/media-store";
import { MediaManager } from "@/components/admin/media-manager";
import { PageTitle } from "@/components/admin/ui";

export const metadata = { title: "Media library" };

export default async function MediaPage({ searchParams }: PageProps<"/admin/media">) {
  const user = await requireAdmin("content.view");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 100) : "";
  const licence = typeof sp.licence === "string" ? sp.licence : "";
  const page = Number(sp.page ?? 1) || 1;
  const data = await listMedia({ q, page, licence });
  const usages = Object.fromEntries(await Promise.all(data.items.filter((m) => m.usageCount > 0).map(async (m) => [m.id, await mediaUsages(m.id)] as const)));
  return (
    <>
      <PageTitle
        title="Media library"
        description="Uploads are checked to be real images, re-encoded to WebP and stripped of location data. Record where every image comes from: only “owner” or “licensed” images should go live."
      />
      <MediaManager
        items={data.items.map((m) => ({ id: m.id, url: m.url, filename: m.filename, altText: m.altText, caption: m.caption, credit: m.credit, licenceStatus: m.licenceStatus, width: m.width, height: m.height, bytes: m.bytes, sourceUrl: m.sourceUrl, usages: usages[m.id] ?? [] }))}
        page={data.page}
        pages={data.pages}
        total={data.total}
        q={q}
        licence={licence}
        can={{ upload: can(user, "media.upload"), delete: can(user, "media.delete") }}
      />
    </>
  );
}

// Admin screens always read fresh, per-request data.
export const instant = false;
