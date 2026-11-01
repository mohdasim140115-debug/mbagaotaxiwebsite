import { Check } from "lucide-react";
import { getMediaByIds, getPublishedHotels } from "@/server/cms/public";
import { getPublicSettings } from "@/server/cms/settings";
import { resolveBooking, resolveCta } from "@/lib/cms/cta";
import { formatInr } from "@/lib/cms/fares";
import { CtaLink } from "@/components/site/cta-link";
import { HotelCarousel } from "./hotel-carousel";
import { SectionHeading } from "./shared";

export async function HotelsSection({ data }: { data: Record<string, unknown> }) {
  const [hotels, settings] = await Promise.all([getPublishedHotels(), getPublicSettings()]);
  const media = await getMediaByIds(hotels.flatMap((h) => h.imageIds));
  const call = resolveCta({ label: "Call Now", kind: "call" }, settings);
  return (
    <section className="section-y bg-paper">
      <div className="container-wide">
        <SectionHeading data={data} />
        <ul className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {hotels.map((h, i) => (
            <li key={h.id} data-reveal>
              <article className="flex h-full flex-col overflow-hidden rounded-[16px] border border-line bg-paper-raised shadow-1">
                <HotelCarousel
                  name={h.name}
                  images={h.imageIds.map((id) => media[id]).filter((m) => !!m)}
                  priority={i === 0}
                />
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display fs-h3 font-semibold">{h.name}</h3>
                    {h.priceAmount !== null && (
                      <p className="shrink-0 text-right">
                        {h.pricePrefix && <span className="block text-xs text-ink-500">{h.pricePrefix}</span>}
                        <span className="font-display text-xl font-semibold tabular-nums text-sunset-600">{formatInr(h.priceAmount)}</span>
                        {h.priceUnit && <span className="block text-xs text-ink-500">{h.priceUnit}</span>}
                      </p>
                    )}
                  </div>
                  {h.location && <p className="text-sm text-ink-500">{h.location}</p>}
                  <p className="mt-3 text-ink-700">{h.description}</p>
                  {h.amenities.length > 0 && (
                    <ul className="mt-4 flex flex-wrap gap-2 text-sm">
                      {h.amenities.map((a) => (
                        <li key={a} className="inline-flex items-center gap-1 rounded-full bg-sand-100 px-3 py-1">
                          <Check className="size-3.5 text-teal-700" aria-hidden="true" /> {a}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-auto flex flex-wrap gap-2 pt-5">
                    <CtaLink cta={resolveBooking("WhatsApp", settings, h.whatsappMessage)} size="sm" context={`hotel:${h.slug}`} />
                    <CtaLink cta={call} size="sm" variant="call" context={`hotel:${h.slug}`} />
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
