import Link from "next/link";
import { ArrowRight, Palmtree } from "lucide-react";
import { getMediaByIds, getPublishedPackages } from "@/server/cms/public";
import { getPublicSettings } from "@/server/cms/settings";
import { resolveCta } from "@/lib/cms/cta";
import type { Cta } from "@/lib/cms/fields";
import { CmsIcon } from "@/components/icons";
import { CmsImage } from "@/components/site/cms-image";
import { HeroSlides } from "./hero-slides";
import { HeroBooking } from "./hero-booking";
import { arr, str } from "./shared";

// Quick-links row inside the booking panel (wording taken from the live site's services).
const PANEL_CHIPS = ["Airport Pickup & Drop", "Sightseeing Tours", "Hotel Bookings", "24×7 Support"];

export async function HeroSection({ data }: { data: Record<string, unknown> }) {
  const slides = arr<{ mediaId: number }>(data.slides);  const stats = arr<{ value: string; label: string; icon: string }>(data.stats);
  const [packages, settings] = await Promise.all([getPublishedPackages(), getPublicSettings()]);
  const own = arr<{ mediaId: number; link: Cta }>(data.cards);
  const cards: { key: string | number; title: string; href: string; mediaId: number }[] = own.length
    ? own.flatMap((c, i) => {
        const r = resolveCta(c.link, settings);
        return r ? [{ key: i, title: r.label, href: r.href, mediaId: c.mediaId }] : [];
      })
    : packages.filter((p) => p.imageIds.length).slice(0, 4).map((p) => ({ key: p.id, title: p.name, href: "/packages/", mediaId: p.imageIds[0]! }));
  const promoId = typeof data.promoMediaId === "number" ? data.promoMediaId : null;
  const media = await getMediaByIds([...slides.map((s) => s.mediaId), ...cards.map((c) => c.mediaId), ...(promoId ? [promoId] : [])]);
  const images = slides.map((s) => media[s.mediaId]).filter((m) => !!m);
  const promo = resolveCta(data.promoCta as Cta, settings);

  // Two-line heading: the first words in white, the rest in the orange→amber gradient.
  const words = str(data.title).split(/\s+/).filter(Boolean);
  const cut = Math.max(1, Math.floor(words.length / 2));
  const line1 = words.slice(0, cut).join(" ");
  const line2 = words.slice(cut).join(" ");

  return (
    <>
      <section className="relative isolate overflow-hidden bg-ocean-900 text-white lg:min-h-[640px]">
        <HeroSlides images={images} />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-ocean-900/85 via-ocean-900/45 to-ocean-900/5" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ocean-900/50 via-transparent to-ocean-900/20" />

        <div className="container-wide relative z-10 pb-8 pt-[104px] md:pb-10">
          <div className="hero-stagger max-w-[760px]">
            {str(data.eyebrow) && (
              <p className="inline-flex items-center gap-2.5 rounded-full bg-white/15 py-1.5 pl-1.5 pr-4 text-xs font-semibold uppercase tracking-[0.12em] backdrop-blur-sm">
                <span aria-hidden="true" className="inline-flex size-7 items-center justify-center rounded-full bg-white text-sunset-600">
                  <Palmtree className="size-4" />
                </span>
                {str(data.eyebrow)}
              </p>
            )}
            <h1 className="font-display mt-5 text-[clamp(2.3rem,1rem+3.4vw,4rem)] font-semibold leading-[1.05] text-balance">
              <span className="block">{line1}</span>{" "}
              {line2 && <span className="block bg-gradient-to-r from-[#ff6a1f] to-[#ffc56b] bg-clip-text text-transparent">{line2}</span>}
            </h1>
            {str(data.description) && <p className="mt-4 max-w-xl text-base text-white/90 text-pretty md:text-lg">{str(data.description)}</p>}
            <div className="mt-7 hidden md:block">
              <HeroBooking whatsapp={settings.whatsapp} chips={PANEL_CHIPS} />
            </div>
          </div>

          {/* Explore circle (desktop) */}
          <Link
            href="/packages/"
            aria-label="Explore Goa tour packages"
            className="absolute right-[7%] top-[38%] hidden size-[150px] float-y flex-col items-center justify-center rounded-full border-2 border-white/60 text-center text-white backdrop-blur-[2px] transition-colors hover:bg-white/10 lg:flex"
          >
            <span className="text-base">Explore</span>
            <span className="font-display -mt-1 text-5xl italic leading-none">Goa</span>
            <span aria-hidden="true" className="mt-1.5 inline-flex size-9 items-center justify-center rounded-full bg-white text-sunset-600">
              <ArrowRight className="size-4" />
            </span>
            <span className="mt-1 text-[10px] font-semibold tracking-[0.16em]">VIEW TOURS</span>
          </Link>

          {/* Destination cards: scroll row below xl, pinned bottom-right on wide screens */}
          {cards.length > 0 && (
            <ul className="hero-stagger no-scrollbar mt-5 flex gap-3 overflow-x-auto pb-1 xl:absolute xl:bottom-10 xl:right-8 xl:mt-0 xl:overflow-visible xl:pb-0">
              {cards.map((c) => (
                <li key={c.key} className="shrink-0">
                  <Link href={c.href} className="block w-[120px] rounded-[12px] bg-white p-1.5 text-ink-900 shadow-3 transition-transform hover:-translate-y-0.5 xl:w-[112px]">
                    <span className="relative block aspect-[4/3] overflow-hidden rounded-[8px] bg-sand-100">
                      <CmsImage media={media[c.mediaId]} fill sizes="120px" />
                    </span>
                    <span className="mt-1.5 block truncate px-0.5 text-[11px] font-semibold">{c.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {(stats.length > 0 || str(data.promoTitle)) && (
        <section aria-label="Highlights" className="border-b border-line bg-white">
          <div className="container-wide grid grid-cols-1 gap-5 py-5 lg:grid-cols-[1fr_minmax(0,540px)] lg:items-center">
            {stats.length > 0 && (
              <ul className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
                {stats.map((s, i) => (
                  <li key={s.label} className={`flex min-w-0 items-center gap-2.5 sm:gap-3 ${i > 0 ? "sm:border-l sm:border-line sm:pl-4" : ""}`}>
                    <CmsIcon name={s.icon} className="size-8 shrink-0 text-sunset-500 sm:size-9" />
                    <span className="min-w-0">
                      <span className="font-display block text-2xl font-semibold leading-none text-ocean-800">{s.value}</span>
                      <span className="mt-1 block text-[13px] leading-tight text-ink-700 sm:text-sm">{s.label}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {str(data.promoTitle) && promo && (
              <Link href={promo.href} className="group relative flex flex-col overflow-hidden rounded-[22px] bg-gradient-to-br from-ocean-800 to-ocean-900 text-white shadow-2 ring-1 ring-white/10 sm:flex-row sm:items-center sm:gap-4 sm:rounded-[16px] sm:p-3 sm:pr-4">
                {promoId && media[promoId] && (
                  <span className="relative block aspect-[16/9] w-full shrink-0 overflow-hidden bg-ocean-700 sm:aspect-[4/3] sm:w-[150px] sm:rounded-[10px]">
                    <CmsImage media={media[promoId]} fill sizes="(min-width:640px) 150px, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ocean-900/80 via-transparent to-transparent sm:hidden" />
                  </span>
                )}
                <span className="flex min-w-0 flex-1 items-center gap-3 p-4 sm:p-0">
                  <span className="min-w-0 flex-1">
                    {str(data.promoEyebrow) && <span className="mb-1.5 inline-block rounded-full bg-sunset-500/20 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#ffa463] sm:mb-0 sm:bg-transparent sm:p-0">{str(data.promoEyebrow)}</span>}
                    <span className="font-display block text-xl font-semibold leading-snug sm:text-lg">{str(data.promoTitle)}</span>
                    {str(data.promoText) && <span className="mt-1 block text-sm text-white/75 sm:mt-0.5 sm:text-xs">{str(data.promoText)}</span>}
                  </span>
                  <span aria-hidden="true" className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#ff6a1f] to-[#f07a2b] text-white shadow-2 transition-transform group-hover:translate-x-0.5 sm:size-10 sm:bg-none sm:bg-white sm:text-ocean-900 sm:shadow-none">
                    <ArrowRight className="size-5" />
                  </span>
                </span>
              </Link>
            )}
          </div>
        </section>
      )}
    </>
  );
}
