import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/auth/session";
import { loadPage } from "@/server/cms/page-store";
import { Sections } from "@/components/sections/render";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { isSectionType, type Section } from "@/lib/cms/sections";

export const metadata = { title: "Preview", robots: { index: false, follow: false } };

/** Renders the saved working copy (draft) of a page. Admin-only, never cached or indexed. */
export default async function PreviewPage({ params }: PageProps<"/admin/preview/pages/[id]">) {
  await requireAdmin("content.view");
  const { id } = await params;
  const loaded = await loadPage(Number(id));
  if (!loaded) notFound();
  const sections = loaded.sections.filter((s) => s.isEnabled && isSectionType(s.type)).map((s) => ({ id: s.id, type: s.type, isEnabled: true, data: s.data })) as Section[];
  const first = sections[0];
  return (
    <div className="bg-paper">
      <div className="fixed inset-x-0 bottom-0 z-[80] bg-sunset-600 px-4 py-2 text-center text-sm font-semibold text-white">
        Draft preview of {loaded.page.path} — not visible to the public until published.
      </div>
      <SiteHeader />
      {(!first || (first.type !== "hero" && first.type !== "page_header")) && <div aria-hidden="true" className="h-[72px]" />}
      <Sections sections={sections} />
      <SiteFooter />
    </div>
  );
}

// Admin screens always read fresh, per-request data.
export const instant = false;
