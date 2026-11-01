import { getMediaByIds, getNavigation } from "@/server/cms/public";
import { getPublicSettings } from "@/server/cms/settings";
import { resolveBooking } from "@/lib/cms/cta";
import { telHref } from "@/lib/cms/settings-def";
import { HeaderClient } from "./header-client";

export async function SiteHeader() {
  const [nav, settings] = await Promise.all([getNavigation("header"), getPublicSettings()]);
  const logo = settings.logoMediaId ? (await getMediaByIds([settings.logoMediaId]))[settings.logoMediaId] : undefined;
  return (
    <HeaderClient
      nav={nav}
      businessName={settings.businessName}
      logo={logo ? { url: logo.url, width: logo.width, height: logo.height } : null}
      phoneHref={telHref(settings.phone)}
      phoneLabel={settings.phone}
      hours={settings.openingHoursText}
      booking={resolveBooking("Book Now", settings)}
    />
  );
}
