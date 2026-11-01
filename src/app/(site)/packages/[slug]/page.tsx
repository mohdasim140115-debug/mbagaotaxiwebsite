import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Clock, MapPin, X } from "lucide-react";
import { getMediaByIds, getPublishedPackages } from "@/server/cms/public";
import { getPublicSettings } from "@/server/cms/settings";
import { buildMetadata } from "@/server/seo/metadata";
import { breadcrumbJsonLd, touristTripJsonLd } from "@/server/seo/jsonld";
import { resolveBooking, resolveCta } from "@/lib/cms/cta";
import { formatPrice } from "@/lib/cms/fares";
import { CmsImage } from "@/components/site/cms-image";
import { CtaLink } from "@/components/site/cta-link";
import { JsonLd } from "@/components/site/json-ld";
import { Body } from "@/components/sections/shared";

export const instant = false;

async function getPackage(slug: string) {
  const all = await getPublishedPackages();
  return all.find((p) => p.slug === slug && p.hasDetailPage) ?? null;
}

export async function generateStaticParams() {
  const all = await getPublishedPackages();
  const params = all.filter((p) => p.hasDetailPage).map((p) => ({ slug: p.slug }));
  // Cache Components needs at least one param for build-time validation. Until the business
  // enables a detail page, a sentinel slug is prerendered (it resolves to a 404).
  return params.length ? params : [{ slug: "_none" }];
}

export async function generateMetadata({ params }: PageProps<"/packages/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPackage(slug);
  if (!p) return {};
  return buildMetadata({
    entityType: "package",
    entityId: p.id,
    path: `/packages/${p.slug}/`,
    fallbackTitle: p.name,
    fallbackDescription: p.summary || undefined,
    fallbackImageId: p.imageIds[0] ?? null,
  });
}

export default async function PackagePage({ params }: PageProps<"/packages/[slug]">) {
  const { slug } = await params;
  const p = await getPackage(slug);
  if (!p) notFound();
  const [settings, media] = await Promise.all([getPublicSettings(), getMediaByIds(p.imageIds)]);
  const path = `/packages/${p.slug}/`;
  const price = formatPrice(p.pricePrefix, p.priceAmount, p.priceText);
  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Packages", path: "/packages/" },
            { name: p.name, path },
          ]),
          touristTripJsonLd({ name: p.name, description: p.summary || p.description, path, price: p.priceAmount, itinerary: p.itinerary.map((i) => i.title) }),
        ]}
      />
      <div aria-hidden="true" className="h-[72px]" />
      <article className="section-y bg-paper">
        <div className="container-wide">
          <nav aria-label="Breadcrumb" className="text-sm text-ink-500">
            <ol className="flex flex-wrap gap-1.5">
              <li><Link href="/" className="hover:underline">Home</Link> /</li>
              <li><Link href="/packages/" className="hover:underline">Packages</Link> /</li>
              <li aria-current="page" className="text-ink-900">{p.name}</li>
            </ol>
          </nav>
          <div className="mt-6 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <h1 className="font-display fs-h1 font-semibold">{p.name}</h1>
              {p.summary && <p className="mt-3 text-lg text-ink-700">{p.summary}</p>}
              <div className="mt-4 flex flex-wrap gap-2 text-sm">
                {p.durationLabel && <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1"><Clock className="size-3.5" aria-hidden="true" />{p.durationLabel}</span>}
                {p.stopsLabel && <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1"><MapPin className="size-3.5" aria-hidden="true" />{p.stopsLabel}</span>}
              </div>
              <div className="relative mt-8 aspect-[16/10] overflow-hidden rounded-[16px]">
                <CmsImage media={media[p.imageIds[0]!]} fill priority sizes="(min-width:1024px) 60vw, 100vw" />
              </div>
              {p.description && <Body text={p.description} className="mt-8 text-[1.0625rem]" />}
              {p.itinerary.length > 0 && (
                <>
                  <h2 className="font-display mt-10 fs-h2 font-semibold">Itinerary</h2>
                  <ol className="mt-5 space-y-4 border-l-2 border-teal-600/30 pl-6">
                    {p.itinerary.map((it, i) => (
                      <li key={i}><h3 className="font-semibold">{it.title}</h3>{it.text && <p className="text-ink-700">{it.text}</p>}</li>
                    ))}
                  </ol>
                </>
              )}
              <div className="mt-10 grid gap-8 sm:grid-cols-2">
                {p.inclusions.length > 0 && (
                  <div><h2 className="font-display fs-h3 font-semibold">Inclusions</h2>
                    <ul className="mt-3 space-y-2">{p.inclusions.map((x) => <li key={x} className="flex gap-2"><Check className="mt-1 size-4 text-success" aria-hidden="true" />{x}</li>)}</ul></div>
                )}
                {p.exclusions.length > 0 && (
                  <div><h2 className="font-display fs-h3 font-semibold">Exclusions</h2>
                    <ul className="mt-3 space-y-2">{p.exclusions.map((x) => <li key={x} className="flex gap-2"><X className="mt-1 size-4 text-danger" aria-hidden="true" />{x}</li>)}</ul></div>
                )}
              </div>
            </div>
            <aside className="h-fit rounded-[16px] border border-line bg-paper-raised p-6 shadow-1 lg:sticky lg:top-24">
              {price && <p className="font-display text-3xl font-semibold text-sunset-600">{price} <small className="text-base font-normal text-ink-500">{p.priceSuffix}</small></p>}
              {p.highlights.length > 0 && <ul className="mt-4 space-y-2">{p.highlights.map((h) => <li key={h} className="flex gap-2"><Check className="mt-1 size-4 text-teal-600" aria-hidden="true" />{h}</li>)}</ul>}
              <div className="mt-6 grid gap-2">
                <CtaLink cta={resolveBooking(p.ctaLabel || "Book", settings, p.whatsappMessage)} size="lg" className="w-full" context={`package:${p.slug}`} />
                <CtaLink cta={resolveCta({ label: "Call Now", kind: "call" }, settings)} size="lg" variant="call" className="w-full" context={`package:${p.slug}`} />
              </div>
            </aside>
          </div>
        </div>
      </article>
    </>
  );
}
