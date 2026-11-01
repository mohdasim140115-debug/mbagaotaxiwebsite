import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMediaByIds, getPublishedPosts } from "@/server/cms/public";
import { getPublicSettings } from "@/server/cms/settings";
import { buildMetadata } from "@/server/seo/metadata";
import { blogPostingJsonLd, breadcrumbJsonLd } from "@/server/seo/jsonld";
import { resolveBooking, resolveCta } from "@/lib/cms/cta";
import { CmsImage } from "@/components/site/cms-image";
import { CtaLink } from "@/components/site/cta-link";
import { JsonLd } from "@/components/site/json-ld";
import { Body } from "@/components/sections/shared";

export const instant = false;

const fmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeZone: "Asia/Kolkata" });

async function getPost(slug: string) {
  return (await getPublishedPosts()).find((p) => p.slug === slug) ?? null;
}

export async function generateStaticParams() {
  const params = (await getPublishedPosts()).map((p) => ({ slug: p.slug }));
  // Cache Components needs at least one param for build-time validation; "_none" resolves to a 404.
  return params.length ? params : [{ slug: "_none" }];
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPost(slug);
  if (!p) return {};
  const meta = await buildMetadata({
    entityType: "post",
    entityId: p.id,
    path: `/blog/${p.slug}/`,
    fallbackTitle: p.title,
    fallbackDescription: p.excerpt || undefined,
    fallbackImageId: p.imageId,
  });
  return { ...meta, openGraph: { ...meta.openGraph, type: "article", ...(p.publishedAt ? { publishedTime: p.publishedAt.toISOString() } : {}) } };
}

export default async function BlogPostPage({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const p = await getPost(slug);
  if (!p) notFound();
  const [settings, media, all] = await Promise.all([getPublicSettings(), getMediaByIds(p.imageId ? [p.imageId] : []), getPublishedPosts()]);
  const cover = p.imageId ? media[p.imageId] : undefined;
  const path = `/blog/${p.slug}/`;
  const related = all.filter((x) => x.id !== p.id).slice(0, 3);
  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Blog", path: "/blog/" }, { name: p.title, path }]),
          blogPostingJsonLd({ title: p.title, description: p.excerpt || settings.defaultMetaDescription, path, image: cover?.url, published: p.publishedAt?.toISOString() ?? null, modified: p.updatedAt.toISOString(), author: p.authorName }),
        ]}
      />
      <div aria-hidden="true" className="h-[72px]" />
      <article className="section-y bg-paper">
        <div className="container-prose">
          <nav aria-label="Breadcrumb" className="text-sm text-ink-500">
            <ol className="flex flex-wrap gap-1.5">
              <li><Link href="/" className="hover:underline">Home</Link> /</li>
              <li><Link href="/blog/" className="hover:underline">Blog</Link> /</li>
              <li aria-current="page" className="text-ink-900">{p.title}</li>
            </ol>
          </nav>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.12em] text-sunset-600">
            {[p.category, p.publishedAt ? fmt.format(p.publishedAt) : "", p.authorName && `By ${p.authorName}`].filter(Boolean).join(" · ")}
          </p>
          <h1 className="font-display fs-h1 mt-2 font-semibold text-balance">{p.title}</h1>
          {p.excerpt && <p className="mt-4 text-lg text-ink-700">{p.excerpt}</p>}
          {cover && (
            <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-[16px]">
              <CmsImage media={cover} fill priority sizes="(min-width:768px) 720px, 100vw" />
            </div>
          )}
          <Body text={p.body ?? ""} className="mt-8 text-[1.0625rem]" />
          <aside className="mt-12 rounded-[16px] bg-ocean-800 p-6 text-white">
            <p className="font-display text-xl font-semibold">Need a taxi in Goa?</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <CtaLink cta={resolveBooking("Book Now", settings)} context={`blog:${p.slug}`} />
              <CtaLink cta={resolveCta({ label: "Call Now", kind: "call" }, settings)} variant="outlineLight" context={`blog:${p.slug}`} />
            </div>
          </aside>
        </div>
        {related.length > 0 && (
          <div className="container-prose mt-14">
            <h2 className="font-display text-2xl font-semibold">More from the blog</h2>
            <ul className="mt-4 space-y-2">
              {related.map((r) => (
                <li key={r.id}>
                  <Link href={`/blog/${r.slug}/`} className="font-medium text-teal-700 hover:underline">
                    {r.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </article>
    </>
  );
}
