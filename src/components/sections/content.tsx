import { Check, Quote, Star } from "lucide-react";
import {
  getMediaByIds,
  getPublishedDestinations,
  getPublishedFaqs,
  getPublishedTestimonials,
} from "@/server/cms/public";
import { getPublicSettings } from "@/server/cms/settings";
import { resolveCta } from "@/lib/cms/cta";
import type { Cta } from "@/lib/cms/fields";
import { CtaLink } from "@/components/site/cta-link";
import { CmsImage } from "@/components/site/cms-image";
import { CmsIcon } from "@/components/icons";
import { JsonLd } from "@/components/site/json-ld";
import { faqJsonLd } from "@/server/seo/jsonld";
import { FaqAccordion } from "./faq-accordion";
import { Body, SectionHeading, arr, str } from "./shared";
import { cn } from "@/lib/utils";

type Data = Record<string, unknown>;
const mid = (v: unknown) => (typeof v === "number" ? v : null);

export async function PageHeaderSection({ data }: { data: Data }) {
  const imageId = mid(data.mediaId);
  const media = await getMediaByIds(imageId ? [imageId] : []);
  const img = imageId ? media[imageId] : undefined;
  return (
    <section className={cn("relative isolate overflow-hidden pt-[72px]", img ? "bg-ocean-900 text-white" : "bg-sand-100")}>
      {img && (
        <>
          <CmsImage media={img} fill sizes="100vw" priority className="-z-10" />
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-ocean-900/70" />
        </>
      )}
      <div className="container-wide py-16 md:py-24">
        <SectionHeading data={data} align="left" tone={img ? "light" : "dark"} />
      </div>
    </section>
  );
}

export async function FeatureSplitSection({ data }: { data: Data }) {
  const imageId = mid(data.mediaId);
  const [media, settings] = await Promise.all([getMediaByIds(imageId ? [imageId] : []), getPublicSettings()]);
  const features = arr<{ title: string; text: string }>(data.features);
  return (
    <section className="section-y bg-paper">
      <div className="container-wide grid items-center gap-12 lg:grid-cols-2">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[16px] sm:aspect-[4/3] lg:aspect-[4/5]" data-reveal>
          <CmsImage media={imageId ? media[imageId] : undefined} fill sizes="(min-width:1024px) 45vw, 100vw" />
        </div>
        <div data-reveal>
          <SectionHeading data={data} align="left" />
          <ul className="mt-8 grid gap-5 sm:grid-cols-2">
            {features.map((f) => (
              <li key={f.title} className="rounded-[10px] border border-line bg-paper-raised p-5">
                <span className="inline-flex size-8 items-center justify-center rounded-full bg-teal-50 text-teal-700">
                  <Check className="size-4" aria-hidden="true" />
                </span>
                <h3 className="mt-3 text-lg font-semibold">{f.title}</h3>
                <p className="mt-1 text-ink-700">{f.text}</p>
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <CtaLink cta={resolveCta(data.cta as Cta, settings)} variant="secondary" context="feature_split" />
          </div>
        </div>
      </div>
    </section>
  );
}

export async function DestinationsSection({ data }: { data: Data }) {
  const items = await getPublishedDestinations();
  const media = await getMediaByIds(items.map((d) => d.imageId!).filter(Boolean));
  return (
    <section className="section-y bg-paper">
      <div className="container-wide">
        <SectionHeading data={data} />
        <ul className="mt-12 grid auto-rows-[220px] gap-4 sm:grid-cols-2 lg:auto-rows-[240px] lg:grid-cols-4">
          {items.map((d, i) => (
            <li
              key={d.id}
              data-reveal
              className={cn("group relative overflow-hidden rounded-[16px] bg-ocean-800", i === 0 && "sm:col-span-2 lg:row-span-2")}
            >
              <CmsImage
                media={d.imageId ? media[d.imageId] : undefined}
                fill
                sizes={i === 0 ? "(min-width:1024px) 50vw, 100vw" : "(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw"}
                className="transition-transform duration-700 group-hover:scale-105"
              />
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ocean-900/85 via-ocean-900/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <h3 className="font-display text-2xl font-semibold">{d.title}</h3>
                <p className="mt-1 text-white/85">{d.summary}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export async function TestimonialsSection({ data }: { data: Data }) {
  const items = await getPublishedTestimonials();
  if (!items.length) return null;
  return (
    <section className="section-y bg-sand-100">
      <div className="container-wide">
        <SectionHeading data={data} />
        <ul className="no-scrollbar -mx-4 mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 lg:grid-cols-3">
          {items.map((t) => (
            <li key={t.id} data-reveal className="w-[85%] shrink-0 snap-start md:w-auto">
              <figure className="flex h-full flex-col rounded-[16px] bg-paper-raised p-6 shadow-1">
                <Quote className="size-7 text-sunset-500" aria-hidden="true" />
                {/* Star ratings are only displayed for reviews the business has verified. */}
                {t.isVerified && t.rating && (
                  <p role="img" className="mt-3 flex gap-0.5" aria-label={`Rated ${t.rating} out of 5`}>
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="size-4 fill-sunset-500 text-sunset-500" aria-hidden="true" />
                    ))}
                  </p>
                )}
                <blockquote className="mt-3 flex-1 text-ink-700">
                  <p>{t.quote}</p>
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3">
                  <span aria-hidden="true" className="inline-flex size-11 items-center justify-center rounded-full bg-ocean-800 font-semibold text-white">
                    {initials(t.authorName)}
                  </span>
                  <span>
                    <span className="block font-semibold">{t.authorName}</span>
                    {t.authorLocation && <span className="block text-sm text-ink-500">{t.authorLocation}</span>}
                  </span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export async function FaqSection({ data }: { data: Data }) {
  const [faqs, settings] = await Promise.all([getPublishedFaqs(str(data.category)), getPublicSettings()]);
  if (!faqs.length) return null;
  const ld = faqJsonLd(faqs.map((f) => ({ question: f.question, answer: f.answer })));
  return (
    <section className="section-y bg-paper">
      {ld && <JsonLd data={ld} />}
      <div className="container-wide">
        <SectionHeading data={data} />
        <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_340px]">
          <FaqAccordion items={faqs.map((f) => ({ id: f.id, question: f.question, answer: f.answer }))} />
          {(str(data.asideTitle) || str(data.asideText)) && (
            <aside className="h-fit rounded-[16px] bg-ocean-800 p-6 text-white lg:sticky lg:top-24">
              <h3 className="font-display fs-h3 font-semibold">{str(data.asideTitle)}</h3>
              <p className="mt-2 text-white/80">{str(data.asideText)}</p>
              <div className="mt-5 flex flex-col gap-2">
                <CtaLink cta={resolveCta(data.asideCta as Cta, settings)} className="w-full" context="faq_aside" />
                <CtaLink cta={resolveCta({ label: "Call Now", kind: "call" }, settings)} variant="outlineLight" className="w-full" context="faq_aside" />
              </div>
            </aside>
          )}
        </div>
      </div>
    </section>
  );
}

export function RichTextSection({ data }: { data: Data }) {
  const wide = data.width === "wide";
  return (
    <section className={cn("section-y", data.background === "sand" ? "bg-sand-100" : "bg-paper")}>
      <div className={wide ? "container-content" : "container-prose"}>
        <SectionHeading data={data} align="left" />
        <Body text={str(data.body)} className={cn(str(data.title) && "mt-6", "text-[1.0625rem]")} />
      </div>
    </section>
  );
}

export async function AboutIntroSection({ data }: { data: Data }) {
  const ids = arr<number>(data.images);
  const [media, settings] = await Promise.all([getMediaByIds(ids), getPublicSettings()]);
  const highlights = arr<string>(data.highlights);
  return (
    <section className="section-y bg-paper">
      <div className="container-wide grid items-center gap-12 lg:grid-cols-2">
        <div className="relative pb-16 pr-10 sm:pr-20" data-reveal>
          <div className="relative aspect-[4/5] overflow-hidden rounded-[16px]">
            <CmsImage media={media[ids[0]!]} fill sizes="(min-width:1024px) 40vw, 90vw" priority />
          </div>
          {ids[1] && media[ids[1]] && (
            <div className="absolute bottom-0 right-0 aspect-square w-[46%] overflow-hidden rounded-[16px] border-[6px] border-paper shadow-2">
              <CmsImage media={media[ids[1]]} fill sizes="(min-width:1024px) 20vw, 45vw" />
            </div>
          )}
          {str(data.badgeValue) && (
            <div className="absolute left-4 top-4 rounded-[10px] bg-sunset-600 px-4 py-3 text-white shadow-2">
              <p className="font-display text-3xl font-semibold leading-none">{str(data.badgeValue)}</p>
              <p className="mt-1 text-sm">{str(data.badgeLabel)}</p>
            </div>
          )}
        </div>
        <div data-reveal>
          <SectionHeading data={data} align="left" />
          <Body text={str(data.body)} className="mt-5 text-[1.0625rem]" />
          {highlights.length > 0 && (
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {highlights.map((h) => (
                <li key={h} className="flex items-center gap-2 font-medium">
                  <Check className="size-5 shrink-0 text-teal-600" aria-hidden="true" /> {h}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-8">
            <CtaLink cta={resolveCta(data.cta as Cta, settings)} size="lg" context="about_intro" />
          </div>
        </div>
      </div>
    </section>
  );
}

export function FeatureCardsSection({ data }: { data: Data }) {
  const items = arr<{ title: string; text: string; icon: string }>(data.items);
  return (
    <section className="section-y bg-sand-100">
      <div className="container-wide">
        <SectionHeading data={data} />
        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it) => (
            <li key={it.title} data-reveal className="rounded-[16px] bg-paper-raised p-6 shadow-1">
              <span className="inline-flex size-12 items-center justify-center rounded-[10px] bg-teal-50 text-teal-700">
                <CmsIcon name={it.icon} className="size-6" />
              </span>
              <h3 className="font-display mt-5 fs-h3 font-semibold">{it.title}</h3>
              <p className="mt-2 text-ink-700">{it.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function StatsSection({ data }: { data: Data }) {
  const items = arr<{ value: string; label: string }>(data.items);
  return (
    <section className="section-y bg-paper">
      <div className="container-wide grid gap-12 lg:grid-cols-2 lg:items-center">
        <div data-reveal>
          <SectionHeading data={data} align="left" />
          <Body text={str(data.body)} className="mt-5 text-[1.0625rem]" />
        </div>
        {items.length > 0 && (
          <dl className="grid grid-cols-2 gap-4" data-reveal>
            {items.map((s) => (
              <div key={s.label} className="rounded-[16px] border border-line bg-paper-raised p-6">
                <dt className="text-sm text-ink-700">{s.label}</dt>
                <dd className="font-display mt-1 text-4xl font-semibold text-ocean-800">{s.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}

export async function CtaBandSection({ data }: { data: Data }) {
  const settings = await getPublicSettings();
  return (
    <section className="py-16 md:py-20">
      <div className="container-wide">
        <div className="relative overflow-hidden rounded-[20px] bg-ocean-800 px-6 py-12 text-center text-white md:px-12">
          <div aria-hidden="true" className="absolute -right-24 -top-24 size-72 rounded-full bg-teal-600/30 blur-3xl" />
          <h2 className="font-display relative fs-h2 font-semibold text-balance">{str(data.title)}</h2>
          {str(data.text) && <p className="relative mx-auto mt-3 max-w-2xl text-white/80">{str(data.text)}</p>}
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <CtaLink cta={resolveCta(data.primaryCta as Cta, settings)} size="lg" context="cta_band" />
            <CtaLink cta={resolveCta(data.secondaryCta as Cta, settings)} size="lg" variant="outlineLight" context="cta_band" />
          </div>
        </div>
      </div>
    </section>
  );
}
