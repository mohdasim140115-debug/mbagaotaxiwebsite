import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedPage, getPublishedPagePaths } from "@/server/cms/public";
import { buildMetadata } from "@/server/seo/metadata";
import { breadcrumbJsonLd } from "@/server/seo/jsonld";
import { Sections } from "@/components/sections/render";
import { JsonLd } from "@/components/site/json-ld";

// Pages are allowed to block on first render so unknown paths return a real 404 status.
export const instant = false;

function toPath(slug: string[] | undefined) {
  if (!slug || slug.length === 0) return "/";
  return `/${slug.map((s) => decodeURIComponent(s)).join("/")}/`;
}

export async function generateStaticParams() {
  const pages = await getPublishedPagePaths();
  return pages.map((p) => ({ slug: p.path === "/" ? [] : p.path.split("/").filter(Boolean) }));
}

export async function generateMetadata({ params }: PageProps<"/[[...slug]]">): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPublishedPage(toPath(slug));
  if (!page) return {};
  const hero = page.sections.find((s) => s.type === "hero");
  const firstSlide = (hero?.data.slides as { mediaId: number }[] | undefined)?.[0]?.mediaId ?? null;
  return buildMetadata({
    entityType: "page",
    entityId: page.id,
    path: page.path,
    fallbackTitle: page.title,
    fallbackImageId: firstSlide,
  });
}

const FULL_BLEED = new Set(["hero", "page_header"]);

export default async function CmsPage({ params }: PageProps<"/[[...slug]]">) {
  const { slug } = await params;
  const page = await getPublishedPage(toPath(slug));
  if (!page) notFound();
  const first = page.sections[0];
  return (
    <>
      {page.path !== "/" && <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: page.title, path: page.path }])} />}
      {/* Clear the fixed header unless the first section is designed to sit underneath it. */}
      {(!first || !FULL_BLEED.has(first.type)) && <div aria-hidden="true" className="h-[72px]" />}
      <Sections sections={page.sections} />
    </>
  );
}
