import Link from "next/link";
import { Mail, MapPin, Phone, Clock } from "lucide-react";
import { getNavigation } from "@/server/cms/public";
import { getPublicSettings } from "@/server/cms/settings";
import { telHref, whatsappHref } from "@/lib/cms/settings-def";
import { WhatsAppIcon } from "@/components/icons";
import { cacheLife } from "next/cache";

async function currentYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

export async function SiteFooter() {
  const [settings, footerNav, legalNav, headerNav, year] = await Promise.all([
    getPublicSettings(),
    getNavigation("footer"),
    getNavigation("legal"),
    getNavigation("header"),
    currentYear(),
  ]);
  const links = footerNav.length ? footerNav : headerNav;
  const address = [settings.streetAddress, settings.addressLocality, `${settings.addressRegion} ${settings.postalCode}`.trim()]
    .filter(Boolean)
    .join(", ");
  const copyright = settings.copyrightText.replace("{year}", String(year));

  return (
    <footer className="mt-auto bg-ocean-900 text-white/85 pb-24 lg:pb-0">
      <div className="container-wide grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-display text-2xl font-semibold text-white">{settings.businessName}</p>
          {settings.footerAbout && <p className="mt-3 max-w-sm text-white/75">{settings.footerAbout}</p>}
          <ul className="mt-5 space-y-3 text-[0.9375rem]">
            <li>
              <a href={telHref(settings.phone)} className="inline-flex items-center gap-2.5 hover:text-white">
                <Phone className="size-4 text-sunset-500" aria-hidden="true" /> {settings.phone}
              </a>
            </li>
            <li>
              <a href={whatsappHref(settings.whatsapp, settings.whatsappDefaultMessage)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2.5 hover:text-white">
                <WhatsAppIcon className="size-4 text-sunset-500" /> WhatsApp us<span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
            {settings.showEmail && settings.email && (
              <li>
                <a href={`mailto:${settings.email}`} className="inline-flex items-center gap-2.5 hover:text-white">
                  <Mail className="size-4 text-sunset-500" aria-hidden="true" /> {settings.email}
                </a>
              </li>
            )}
            {settings.showAddress && address && (
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-1 size-4 shrink-0 text-sunset-500" aria-hidden="true" /> <span>{address}</span>
              </li>
            )}
            {settings.openingHoursText && (
              <li className="flex items-center gap-2.5">
                <Clock className="size-4 text-sunset-500" aria-hidden="true" /> {settings.openingHoursText}
              </li>
            )}
          </ul>
        </div>
        <nav aria-label="Footer">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-white/60">Explore</p>
          <ul className="mt-4 space-y-2.5">
            {links.map((l) => (
              <li key={l.id}>
                <Link href={l.href} className="hover:text-white hover:underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          {(settings.facebookUrl || settings.instagramUrl || settings.googleBusinessUrl) && (
            <>
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-white/60">Follow</p>
              <ul className="mt-4 space-y-2.5">
                {settings.facebookUrl && (
                  <li>
                    <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white hover:underline">
                      Facebook<span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </li>
                )}
                {settings.instagramUrl && (
                  <li>
                    <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white hover:underline">
                      Instagram<span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </li>
                )}
                {settings.googleBusinessUrl && (
                  <li>
                    <a href={settings.googleBusinessUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white hover:underline">
                      Google reviews<span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </li>
                )}
              </ul>
            </>
          )}
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-wide flex flex-col gap-2 py-5 text-sm text-white/65 sm:flex-row sm:items-center sm:justify-between">
          <p>
            {copyright}
            <span className="mx-2 text-white/30" aria-hidden="true">|</span>
            Prepared by{" "}
            <a href="https://deenxconsultancy.com/" target="_blank" rel="noopener" className="font-semibold text-white/90 underline-offset-4 hover:text-[#ffa463] hover:underline">
              DeenX Consultancy<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </p>
          {legalNav.length > 0 && (
            <ul className="flex flex-wrap gap-4">
              {legalNav.map((l) => (
                <li key={l.id}>
                  <Link href={l.href} className="hover:text-white hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </footer>
  );
}
