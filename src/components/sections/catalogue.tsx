import Link from "next/link";
import { Check, Clock, MapPin, Star } from "lucide-react";
import {
  getMediaByIds,
  getPublishedPackages,
  getPublishedServices,
  getPublishedVehicles,
  type PublicVehicle,
} from "@/server/cms/public";
import { getPublicSettings } from "@/server/cms/settings";
import { resolveBooking, resolveCta } from "@/lib/cms/cta";
import { formatInr, formatPrice } from "@/lib/cms/fares";
import type { Cta } from "@/lib/cms/fields";
import { CtaLink } from "@/components/site/cta-link";
import { CmsImage } from "@/components/site/cms-image";
import { CmsIcon } from "@/components/icons";
import { SectionHeading, arr, str } from "./shared";
import { cn } from "@/lib/utils";
import { Slider } from "./slider";

type Data = Record<string, unknown>;

/* ------------------------------------------------------------------ services */

export async function ServicesSection({ data }: { data: Data }) {
  const [services, settings] = await Promise.all([getPublishedServices(), getPublicSettings()]);
  const call = resolveCta({ label: "Call Now", kind: "call" }, settings);
  return (
    <section className="section-y bg-paper">
      <div className="container-wide">
        <SectionHeading data={data} />
        <ul className="mt-10 grid gap-x-4 sm:grid-cols-2 xl:grid-cols-4">
          {services.map((s) => (
            <li
              key={s.id}
              data-reveal
              className={cn(
                // Each card spans 4 rows of the parent grid (title / summary / features / buttons) via subgrid,
                // so those parts line up across every card in a row and cards share one height.
                "group mb-4 grid grid-rows-subgrid row-span-4 gap-y-0 rounded-[12px] border border-line bg-paper-raised p-4 shadow-1 transition-shadow hover:shadow-2 sm:p-5",
                // Services in the "featured" category get a stronger treatment than the rest.
                s.category === "featured" && "border-sunset-500/50 bg-sunset-50/70",
              )}
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-ocean-800 text-[#ffa463]">
                  <CmsIcon name={s.icon} className="size-5" />
                </span>
                <h3 className="font-display text-[1.125rem] font-semibold leading-tight">{s.title}</h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink-700">{s.summary}</p>
              <ul className="mt-3 space-y-1 text-sm">
                  {s.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-1 size-4 shrink-0 text-teal-600" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
              <div className="mt-4 flex flex-wrap items-end gap-2">
                <CtaLink cta={resolveBooking(s.ctaLabel || "Book Now", settings, s.whatsappMessage)} size="sm" className="max-sm:min-h-11" context={`service:${s.slug}`} />
                <CtaLink cta={call} size="sm" variant="call" className="max-sm:min-h-11" context={`service:${s.slug}`} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ packages */

type PackageItem = { packageId: number; priceOverride?: string; unitOverride?: string; hidePrice?: boolean };

export async function PackagesSection({ data }: { data: Data }) {
  const [all, settings] = await Promise.all([getPublishedPackages(), getPublicSettings()]);
  const items = arr<PackageItem>(data.items);
  const selected = items.length
    ? items.map((it) => ({ pkg: all.find((p) => p.id === it.packageId), it })).filter((x) => !!x.pkg)
    : all.map((pkg) => ({ pkg, it: undefined as PackageItem | undefined }));
  const media = await getMediaByIds(selected.map((x) => x.pkg!.imageIds[0]!).filter(Boolean));
  const call = resolveCta({ label: "Call", kind: "call" }, settings);

  return (
    <section className="section-y bg-sand-100">
      <div className="container-wide">
        <SectionHeading data={data} />
        <Slider label="Packages" dotsClassName="md:hidden" tone="dark" className="no-scrollbar -mx-4 mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 lg:grid-cols-3">
          {selected.map(({ pkg, it }) => {
            const p = pkg!;
            const price = it?.hidePrice ? "" : it?.priceOverride || formatPrice(p.pricePrefix, p.priceAmount, p.priceText);
            const unit = it?.priceOverride ? (it.unitOverride ?? "") : p.priceSuffix;
            const detailHref = p.hasDetailPage ? `/packages/${p.slug}/` : null;
            return (
              <li key={p.id} data-reveal className="w-[86%] shrink-0 snap-center md:w-auto">
                <article className="relative flex h-full flex-col overflow-hidden rounded-[22px] border border-line bg-paper-raised shadow-2 transition-shadow md:rounded-[16px] md:shadow-1 md:hover:shadow-2">
                  <div className="relative aspect-[4/3]">
                    <CmsImage media={media[p.imageIds[0]!]} fill sizes="(min-width:1024px) 33vw, (min-width:768px) 50vw, 82vw" />
                    {p.badge && (
                      <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-ink-900">
                        <Star className="size-3.5 fill-sunset-500 text-sunset-500" aria-hidden="true" /> {p.badge}
                      </span>
                    )}
                    {price && (
                      <span className="absolute bottom-3 left-3 rounded-full bg-gradient-to-r from-[#c2410c] to-[#f07a2b] px-3.5 py-1.5 text-sm font-semibold text-white shadow-2">
                        {price} {unit && <small className="font-normal text-white/80">{unit}</small>}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="font-display fs-h3 font-semibold">
                      {detailHref ? (
                        <Link href={detailHref} className="after:absolute after:inset-0 after:z-[1] after:content-[''] hover:underline">
                          {p.name}
                        </Link>
                      ) : (
                        p.name
                      )}
                    </h3>
                    {p.summary && <p className="mt-2 text-ink-700">{p.summary}</p>}
                    <div className="mt-4 flex flex-wrap gap-2 text-sm text-ink-700">
                      {p.durationLabel && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1">
                          <Clock className="size-3.5 text-teal-700" aria-hidden="true" /> {p.durationLabel}
                        </span>
                      )}
                      {p.stopsLabel && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1">
                          <MapPin className="size-3.5 text-teal-700" aria-hidden="true" /> {p.stopsLabel}
                        </span>
                      )}
                    </div>
                    <div className="relative z-10 mt-auto grid grid-cols-2 gap-2 border-t border-line/70 pt-4 sm:flex sm:flex-wrap sm:border-0 sm:pt-5">
                      <CtaLink cta={resolveBooking(p.ctaLabel || "Book", settings, p.whatsappMessage)} size="sm" className="max-sm:min-h-11" context={`package:${p.slug}`} />
                      {data.showCallButton === true && <CtaLink cta={call} size="sm" variant="call" className="max-sm:min-h-11" context={`package:${p.slug}`} />}
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </Slider>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ fleet */

function fareOf(v: PublicVehicle, type: string) {
  return v.fares.find((f) => f.fareType === type);
}

export async function FleetSection({ data }: { data: Data }) {
  const [vehicles, settings] = await Promise.all([getPublishedVehicles(), getPublicSettings()]);
  const media = await getMediaByIds(vehicles.map((v) => v.imageIds[0]!).filter(Boolean));
  const call = resolveCta({ label: "Call Now", kind: "call" }, settings);
  return (
    <section className="section-y bg-paper">
      <div className="container-wide">
        <SectionHeading data={data} />
        <Slider label="Taxi fleet" dotsClassName="md:hidden" tone="dark" className="no-scrollbar -mx-4 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 md:mx-0 md:mt-12 md:grid md:grid-cols-2 md:gap-6 md:overflow-visible md:px-0 md:pb-0">
          {vehicles.map((v) => {
            const main = v.fares.filter((f) => f.fareType === "airport_transfer" || f.fareType === "package_8h_80km");
            const extras = v.fares.filter((f) => f.fareType !== "airport_transfer" && f.fareType !== "package_8h_80km");
            return (
              <li key={v.id} data-reveal className="w-[88%] shrink-0 snap-center md:w-auto">
                <article className="relative grid h-full overflow-hidden rounded-[22px] border border-line bg-paper-raised shadow-2 sm:grid-cols-[1.25fr_1fr] md:rounded-[16px] md:shadow-1">
                  <div className="p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-3">
                      {v.badge && <span className="text-xs font-bold tracking-[0.18em] text-teal-700">{v.badge}</span>}
                      {v.seatsLabel && <span className="rounded-full bg-sand-100 px-3 py-1 text-sm font-medium">{v.seatsLabel}</span>}
                    </div>
                    <div className="relative mt-3 aspect-[16/9] overflow-hidden rounded-[14px] bg-gradient-to-b from-sand-100 to-white ring-1 ring-line/60">
                      <CmsImage media={media[v.imageIds[0]!]} fill sizes="(min-width:768px) 28vw, 90vw" className="object-contain" />
                    </div>
                    <h3 className="font-display mt-4 fs-h3 font-semibold">
                      {v.hasDetailPage ? (
                        <Link href={`/taxi-services/${v.slug}/`} className="after:absolute after:inset-0 after:z-[1] after:content-[''] hover:underline">
                          {v.name}
                        </Link>
                      ) : (
                        v.name
                      )}
                    </h3>
                    {v.hasDetailPage && (
                      <Link href={`/taxi-services/${v.slug}/`} className="mt-1 inline-block text-sm font-semibold text-teal-700 hover:underline">
                        View details<span className="sr-only"> for {v.name}</span> →
                      </Link>
                    )}
                  </div>
                  <div className="ticket-perforation relative flex flex-col justify-between gap-4 border-t border-dashed border-line bg-sand-100/70 p-5 sm:border-l sm:border-t-0 sm:p-6">
                    <div className="space-y-3">
                      <dl className="grid grid-cols-2 gap-3 sm:block sm:space-y-3">
                        {main.map((f) => (
                          <div key={f.id} className="max-sm:rounded-[12px] max-sm:bg-paper-raised max-sm:p-3 max-sm:shadow-1">
                            <dt className="text-sm text-ink-700">{f.label}</dt>
                            <dd className="font-display text-2xl font-semibold tabular-nums text-ocean-900">{formatInr(f.amount)}</dd>
                          </div>
                        ))}
                      </dl>
                      {extras.length > 0 && (
                        <ul className="flex flex-wrap gap-2 pt-1">
                          {extras.map((f) => (
                            <li key={f.id} className="rounded-full bg-paper-raised px-3 py-1 text-sm font-medium tabular-nums">
                              {f.label ? `${f.label}: ` : ""}
                              {formatInr(f.amount)} {f.unitLabel}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="relative z-10 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                      <CtaLink cta={resolveBooking("Book Now", settings, v.whatsappMessage)} size="sm" className="max-sm:min-h-11" context={`vehicle:${v.slug}`} />
                      {data.showCallButton === true && <CtaLink cta={call} size="sm" variant="call" className="max-sm:min-h-11" context={`vehicle:${v.slug}`} />}
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </Slider>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ airport */

export async function AirportSection({ data }: { data: Data }) {
  const [vehicles, settings] = await Promise.all([getPublishedVehicles(), getPublicSettings()]);
  const imageId = typeof data.mediaId === "number" ? data.mediaId : null;
  const media = await getMediaByIds(imageId ? [imageId] : []);
  const features = arr<{ title: string; text: string }>(data.features);
  const cardCta = data.cardCta as Cta | undefined;
  const closing = resolveCta(data.cta as Cta, settings);

  return (
    <section className="section-y bg-ocean-800 text-white">
      <div className="container-wide">
        <SectionHeading data={data} tone="light" />
        <div className="mt-12 grid items-center gap-10 lg:grid-cols-2">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[16px]" data-reveal>
            <CmsImage media={imageId ? media[imageId] : undefined} fill sizes="(min-width:1024px) 45vw, 100vw" />
            {(str(data.badgeTitle) || str(data.badgeText)) && (
              <div className="absolute bottom-4 left-4 rounded-[10px] bg-white px-4 py-3 text-ink-900 shadow-2">
                <p className="font-semibold">{str(data.badgeTitle)}</p>
                <p className="text-sm text-ink-700">{str(data.badgeText)}</p>
              </div>
            )}
          </div>
          <div data-reveal>
            {str(data.introTitle) && <h3 className="font-display fs-h3 font-semibold">{str(data.introTitle)}</h3>}
            {str(data.introText) && <p className="mt-3 text-white/80">{str(data.introText)}</p>}
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {features.map((f) => (
                <li key={f.title} className="flex gap-3">
                  <Check className="mt-1 size-5 shrink-0 text-[#7fd6d1]" aria-hidden="true" />
                  <div>
                    <p className="font-semibold">{f.title}</p>
                    <p className="text-sm text-white/75">{f.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Slider label="Airport transfer vehicles" dotsClassName="sm:hidden" tone="light" className="no-scrollbar -mx-4 mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
          {vehicles.map((v) => {
            const fare = fareOf(v, "airport_transfer");
            const cta =
              cardCta?.label && cardCta.kind !== "booking"
                ? resolveCta(cardCta, settings, v.whatsappMessage)
                : resolveBooking(cardCta?.label || "Book Now", settings, v.whatsappMessage);
            return (
              <li key={v.id} data-reveal className="relative flex w-[78%] shrink-0 snap-center flex-col overflow-hidden rounded-[20px] border border-white/20 bg-white p-5 text-ink-900 shadow-2 before:absolute before:inset-x-0 before:top-0 before:h-1.5 before:bg-gradient-to-r before:from-[#ff6a1f] before:to-[#ffc56b] sm:w-auto">
                <h3 className="font-display mt-1 text-xl font-semibold">{v.fullName || v.name}</h3>
                {v.airportLabel && <p className="text-sm text-ink-700">{v.airportLabel}</p>}
                {fare && <p className="font-display mt-3 text-3xl font-semibold tabular-nums text-sunset-600">{formatInr(fare.amount)}</p>}
                <ul className="mt-4 space-y-1.5 text-[0.9375rem]">
                  {v.airportFeatures.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-1 size-4 shrink-0 text-teal-600" aria-hidden="true" /> {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-5">
                  <CtaLink cta={cta} size="sm" className="w-full" context={`airport:${v.slug}`} />
                </div>
              </li>
            );
          })}
        </Slider>

        {(str(data.ctaTitle) || closing) && (
          <div className="mt-14 flex flex-col items-start justify-between gap-6 rounded-[16px] border border-white/15 bg-white/5 p-6 md:flex-row md:items-center md:p-8" data-reveal>
            <div className="max-w-2xl">
              <h3 className="font-display fs-h3 font-semibold">{str(data.ctaTitle)}</h3>
              {str(data.ctaText) && <p className="mt-2 text-white/80">{str(data.ctaText)}</p>}
            </div>
            <CtaLink cta={closing} size="lg" context="airport_cta" />
          </div>
        )}
      </div>
    </section>
  );
}
