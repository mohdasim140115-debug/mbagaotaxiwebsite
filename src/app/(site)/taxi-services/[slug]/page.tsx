import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, Clock, PlaneTakeoff, Users } from "lucide-react";
import { getMediaByIds, getPublishedFaqs, getPublishedVehicles, type PublicVehicle } from "@/server/cms/public";
import { getPublicSettings } from "@/server/cms/settings";
import { buildMetadata } from "@/server/seo/metadata";
import { breadcrumbJsonLd, faqJsonLd, serviceJsonLd } from "@/server/seo/jsonld";
import { resolveBooking, resolveCta } from "@/lib/cms/cta";
import { FARE_TYPE_OPTIONS, formatInr } from "@/lib/cms/fares";
import { CmsImage } from "@/components/site/cms-image";
import { CmsIcon } from "@/components/icons";
import { CtaLink } from "@/components/site/cta-link";
import { JsonLd } from "@/components/site/json-ld";
import { Body } from "@/components/sections/shared";
import { FaqAccordion } from "@/components/sections/faq-accordion";

export const instant = false;

const fareLabel = (type: string, label: string) => label || FARE_TYPE_OPTIONS.find((o) => o.value === type)?.label || type;

// Plain-language meaning of each fare line; wording follows the site's own FAQ and airport copy.
const FARE_EXPLAINER: Record<string, string> = {
  airport_transfer: "Pickup or drop at Dabolim or Mopa Airport. Airport transfer prices are fixed.",
  package_8h_80km: "Full-day rental package covering 8 hours and 80 km.",
  extra_hour: "The listed hourly rate.",
  extra_km: "The listed per-kilometre rate.",
};

// Taken verbatim from the "Why choose us" section of the live site.
const WHY = [
  { icon: "badge-check", title: "Professional Drivers", text: "Friendly local experts who know Goa inside out." },
  { icon: "wallet", title: "Transparent Pricing", text: "No hidden charges. Honest fares every time." },
  { icon: "clock", title: "24×7 Availability", text: "Book your ride anytime, day or night." },
  { icon: "car", title: "Comfortable Vehicles", text: "Clean, air-conditioned and regularly maintained." },
];

// From the live Contact page: "How to Book a Goa Taxi".
const STEPS = [
  { icon: "map-pinned", title: "Share Your Trip Details", text: "Tell us your pickup location, destination, travel date and preferred time." },
  { icon: "wallet", title: "Confirm Your Fare", text: "We confirm availability and the fare with you before the ride." },
  { icon: "car-taxi-front", title: "Get Picked Up", text: "Your driver meets you at the agreed point, including pickups at Dabolim and Mopa Airport." },
  { icon: "badge-check", title: "Pay Your Way", text: "We accept cash, UPI, Google Pay, PhonePe and bank transfers." },
];

function bestFor(seats: number | null) {
  if (!seats) return "";
  if (seats <= 4) return "Couples, solo travellers and small families";
  if (seats <= 6) return "Families and small groups";
  return "Larger families and groups";
}

async function getVehicle(slug: string) {
  const list = await getPublishedVehicles();
  const hit = list.find((v) => v.slug === slug && v.hasDetailPage) ?? null;
  return hit;
}

export async function generateStaticParams() {
  const params = (await getPublishedVehicles()).filter((v) => v.hasDetailPage).map((v) => ({ slug: v.slug }));
  // Cache Components needs at least one param for build-time validation; "_none" resolves to a 404.
  return params.length ? params : [{ slug: "_none" }];
}

export async function generateMetadata({ params }: PageProps<"/taxi-services/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const v = await getVehicle(slug);
  if (!v) return {};
  const name = v.fullName || v.name;
  const airport = v.fares.find((f) => f.fareType === "airport_transfer");
  return buildMetadata({
    entityType: "vehicle",
    entityId: v.id,
    path: `/taxi-services/${v.slug}/`,
    fallbackTitle: `${name} Taxi in Goa`,
    fallbackDescription: `Book a ${name}${v.seatsLabel ? ` (${v.seatsLabel})` : ""} taxi in Goa with MBA Travels Goa.${airport ? ` Airport pickup ${formatInr(airport.amount)}.` : ""} Call or WhatsApp to book.`,
    fallbackImageId: v.imageIds[0] ?? null,
  });
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="max-w-2xl">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="font-display fs-h2 mt-2 font-semibold text-balance">{title}</h2>
    </div>
  );
}

export default async function VehiclePage({ params }: PageProps<"/taxi-services/[slug]">) {
  const { slug } = await params;
  const v = await getVehicle(slug);
  if (!v) notFound();
  const [settings, all, faqs] = await Promise.all([getPublicSettings(), getPublishedVehicles(), getPublishedFaqs("general")]);
  const others = all.filter((x) => x.id !== v.id && x.hasDetailPage);
  const media = await getMediaByIds([...v.imageIds, ...others.map((o) => o.imageIds[0]!).filter(Boolean)]);
  const name = v.fullName || v.name;
  const path = `/taxi-services/${v.slug}/`;
  const message = v.whatsappMessage || `I want to book ${name}`;
  const airport = v.fares.find((f) => f.fareType === "airport_transfer");
  const features = [...new Set([...v.features, ...v.airportFeatures])];
  const book = resolveBooking("Book Now", settings, message);
  const call = resolveCta({ label: "Call Now", kind: "call" }, settings);
  const faqLd = faqJsonLd(faqs.map((f) => ({ question: f.question, answer: f.answer })));
  const intro = `${name} is a ${v.seatsLabel ? `${v.seatsLabel.toLowerCase()} ` : ""}${v.vehicleClass ? `${v.vehicleClass} ` : "vehicle "}available with MBA Travels Goa for airport transfers, sightseeing and local travel across Goa.`;

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Taxi Services", path: "/taxi-services/" }, { name, path }]),
          serviceJsonLd(`${name} taxi in Goa`, `${name}${v.seatsLabel ? `, ${v.seatsLabel}` : ""} taxi service in Goa.`, path, v.fares.map((f) => ({ price: f.amount, description: `${fareLabel(f.fareType, f.label)}${f.unitLabel ? ` ${f.unitLabel}` : ""}` }))),
          ...(faqLd ? [faqLd] : []),
        ]}
      />

      {/* Header band */}
      <section className="relative isolate overflow-hidden bg-ocean-900 pt-[72px] text-white">
        <div aria-hidden="true" className="absolute -right-24 -top-24 -z-10 size-[420px] rounded-full bg-sunset-500/20 blur-3xl" />
        <div aria-hidden="true" className="absolute -bottom-32 left-1/4 -z-10 size-[360px] rounded-full bg-teal-600/20 blur-3xl" />
        <div className="container-wide pb-28 pt-10 md:pb-32">
          <nav aria-label="Breadcrumb" className="text-sm text-white/70">
            <ol className="flex flex-wrap gap-1.5">
              <li><Link href="/" className="hover:text-white hover:underline">Home</Link> /</li>
              <li><Link href="/taxi-services/" className="hover:text-white hover:underline">Taxi Services</Link> /</li>
              <li aria-current="page" className="text-white">{name}</li>
            </ol>
          </nav>
          <p className="eyebrow mt-6 flex items-center gap-3 !text-[#ffa463]">
            <span aria-hidden="true" className="h-px w-10 bg-[#ffa463]" /> Taxi in Goa
          </p>
          <h1 className="font-display mt-3 text-[clamp(2.2rem,1.2rem+3.2vw,3.75rem)] font-semibold leading-[1.05]">{name}</h1>
          <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
            {v.seatsLabel && <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3.5 py-1.5 backdrop-blur-sm"><Users className="size-4" aria-hidden="true" />{v.seatsLabel}</span>}
            {v.vehicleClass && <span className="rounded-full bg-white/12 px-3.5 py-1.5 backdrop-blur-sm">{v.vehicleClass}</span>}
            {v.luggage && <span className="rounded-full bg-white/12 px-3.5 py-1.5 backdrop-blur-sm">Luggage: {v.luggage}</span>}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3.5 py-1.5 backdrop-blur-sm"><Clock className="size-4" aria-hidden="true" />Available 24×7</span>
          </div>
          {airport && (
            <p className="mt-6 flex items-center gap-3 text-white/90">
              <PlaneTakeoff className="size-5 text-[#ffa463]" aria-hidden="true" />
              <span>Airport pickup from <strong className="font-display text-2xl font-semibold text-white">{formatInr(airport.amount)}</strong></span>
            </p>
          )}
        </div>
      </section>

      {/* Main: gallery + content, with the fares card overlapping the band */}
      <section className="bg-paper pb-16">
        <div className="container-wide relative z-10 -mt-20 grid gap-8 lg:grid-cols-[1.5fr_1fr] md:-mt-24">
          <div className="min-w-0">
            <div className="overflow-hidden rounded-[20px] bg-white p-2.5 shadow-3">
              <div className="relative aspect-[16/10] overflow-hidden rounded-[14px] bg-sand-100">
                <CmsImage media={media[v.imageIds[0]!]} fill priority sizes="(min-width:1024px) 58vw, 100vw" className="object-contain" />
              </div>
              {v.imageIds.length > 1 && (
                <ul className="mt-2.5 grid grid-cols-4 gap-2.5">
                  {v.imageIds.slice(1, 5).map((id) => (
                    <li key={id} className="relative aspect-[4/3] overflow-hidden rounded-[10px] bg-sand-100">
                      <CmsImage media={media[id]} fill sizes="15vw" />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-10">
              <h2 className="font-display fs-h2 font-semibold">About the {v.name}</h2>
              <p className="mt-3 text-[1.0625rem] text-ink-700">{intro}</p>
              {v.description && <Body text={v.description} className="mt-4 text-[1.0625rem]" />}
              {bestFor(v.seats) && (
                <p className="mt-5 rounded-[12px] border border-sunset-500/30 bg-sunset-50 px-4 py-3 text-sm">
                  <span className="font-semibold">Best for:</span> {bestFor(v.seats)}
                  {v.seats ? <span className="text-ink-700"> · seats {v.seats} passengers</span> : null}
                </p>
              )}
            </div>

            {features.length > 0 && (
              <div className="mt-10">
                <h2 className="font-display fs-h3 font-semibold">What’s included</h2>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-3 rounded-[12px] border border-line bg-paper-raised p-3.5">
                      <span aria-hidden="true" className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700"><Check className="size-3.5" /></span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-10">
              <h2 className="font-display fs-h3 font-semibold">Fare guide</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {v.fares.map((f) => (
                  <li key={f.id} className="rounded-[12px] border border-line bg-paper-raised p-4">
                    <p className="text-sm text-ink-700">{fareLabel(f.fareType, f.label)}</p>
                    <p className="font-display mt-0.5 text-2xl font-semibold tabular-nums">{formatInr(f.amount)}{f.unitLabel && <span className="ml-1 text-sm font-normal text-ink-500">{f.unitLabel}</span>}</p>
                    {(f.notes || FARE_EXPLAINER[f.fareType]) && <p className="mt-1.5 text-sm text-ink-700">{f.notes || FARE_EXPLAINER[f.fareType]}</p>}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-ink-700">Any extra charges such as additional hours or kilometres will be explained before your trip begins.</p>
            </div>
          </div>

          <aside className="h-fit min-w-0 rounded-[20px] border border-line bg-white p-6 shadow-3 lg:sticky lg:top-24">
            <p className="eyebrow">Book this vehicle</p>
            <h2 className="font-display mt-1 text-2xl font-semibold">Fares</h2>
            <dl className="mt-4 divide-y divide-line">
              {v.fares.map((f) => (
                <div key={f.id} className="flex items-baseline justify-between gap-3 py-2.5">
                  <dt className="text-ink-700">{fareLabel(f.fareType, f.label)}</dt>
                  <dd className="font-display text-xl font-semibold tabular-nums">{formatInr(f.amount)}{f.unitLabel && <span className="ml-1 text-sm font-normal text-ink-500">{f.unitLabel}</span>}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-ink-500">We confirm the fare with you before the ride.</p>
            <div className="mt-5 grid gap-2">
              <CtaLink cta={book} size="lg" className="w-full" context={`vehicle:${v.slug}`} />
              <CtaLink cta={call} size="lg" variant="call" className="w-full" context={`vehicle:${v.slug}`} />
            </div>
            <p className="mt-4 text-center text-xs text-ink-500">Open 24×7 · {settings.phone}</p>
          </aside>
        </div>
      </section>

      {/* Why book */}
      <section className="section-y bg-sand-100">
        <div className="container-wide">
          <SectionTitle eyebrow="Why choose us" title={`Why book the ${v.name} with MBA Travels Goa`} />
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {WHY.map((w) => (
              <li key={w.title} className="rounded-[16px] bg-paper-raised p-6 shadow-1">
                <span className="inline-flex size-11 items-center justify-center rounded-[10px] bg-ocean-800 text-[#ffa463]"><CmsIcon name={w.icon} className="size-5" /></span>
                <h3 className="font-display mt-4 text-lg font-semibold">{w.title}</h3>
                <p className="mt-1.5 text-sm text-ink-700">{w.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How to book */}
      <section className="section-y bg-paper">
        <div className="container-wide">
          <SectionTitle eyebrow="How to book" title="How to Book a Goa Taxi" />
          <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative rounded-[16px] border border-line bg-paper-raised p-6">
                <span aria-hidden="true" className="absolute right-4 top-4 inline-flex size-7 items-center justify-center rounded-full bg-ocean-800 text-xs font-semibold text-white">{i + 1}</span>
                <span className="inline-flex size-11 items-center justify-center rounded-[10px] bg-teal-50 text-teal-700"><CmsIcon name={s.icon} className="size-5" /></span>
                <h3 className="font-display mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-ink-700">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FAQ */}
      {faqs.length > 0 && (
        <section className="section-y bg-sand-100">
          <div className="container-wide grid gap-10 lg:grid-cols-[1fr_1.6fr]">
            <div>
              <SectionTitle eyebrow="Questions" title="Everything You Need To Know" />
              <p className="mt-4 text-ink-700">Our team is available 24×7 to help you with airport transfers, sightseeing tours and taxi bookings across Goa.</p>
            </div>
            <FaqAccordion items={faqs.map((f) => ({ id: f.id, question: f.question, answer: f.answer }))} />
          </div>
        </section>
      )}

      {/* Other vehicles */}
      {others.length > 0 && (
        <section className="section-y bg-paper" aria-label="Other vehicles">
          <div className="container-wide">
            <SectionTitle eyebrow="Our fleet" title="Other vehicles you can book" />
            <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((o: PublicVehicle) => {
                const f = o.fares.find((x) => x.fareType === "airport_transfer");
                return (
                  <li key={o.id}>
                    <Link href={`/taxi-services/${o.slug}/`} className="group flex h-full gap-4 overflow-hidden rounded-[16px] border border-line bg-paper-raised p-3 shadow-1 transition-shadow hover:shadow-2">
                      <span className="relative block aspect-[4/3] w-[120px] shrink-0 overflow-hidden rounded-[10px] bg-sand-100 sm:w-[140px]">
                        <CmsImage media={media[o.imageIds[0]!]} fill sizes="140px" className="object-cover" />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col justify-center">
                        <span className="font-display text-lg font-semibold">{o.fullName || o.name}</span>
                        <span className="text-sm text-ink-700">{o.seatsLabel}</span>
                        {f && <span className="mt-1 text-sm">Airport pickup <strong className="tabular-nums">{formatInr(f.amount)}</strong></span>}
                        <span className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-teal-700">View details <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {/* Closing call-to-action */}
      <section className="pb-16 md:pb-20">
        <div className="container-wide">
          <div className="relative overflow-hidden rounded-[24px] bg-ocean-800 px-6 py-12 text-center text-white md:px-12">
            <div aria-hidden="true" className="absolute -right-20 -top-20 size-72 rounded-full bg-sunset-500/25 blur-3xl" />
            <h2 className="font-display fs-h2 relative font-semibold text-balance">Ready to book the {v.name}?</h2>
            <p className="relative mx-auto mt-3 max-w-xl text-white/80">Contact us on WhatsApp or call. We confirm availability and the fare with you before the ride.</p>
            <div className="relative mt-7 flex flex-wrap justify-center gap-3">
              <CtaLink cta={book} size="lg" context={`vehicle_cta:${v.slug}`} />
              <CtaLink cta={call} size="lg" variant="outlineLight" context={`vehicle_cta:${v.slug}`} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
