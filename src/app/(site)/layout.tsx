import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { MobileActionBar } from "@/components/site/mobile-action-bar";
import { ClientBoot } from "@/components/site/reveal";
import { Analytics } from "@/components/analytics/analytics";
import { JsonLd } from "@/components/site/json-ld";
import { getAnalyticsConfig, getMediaByIds } from "@/server/cms/public";
import { getPublicSettings } from "@/server/cms/settings";
import { organizationJsonLd, websiteJsonLd } from "@/server/seo/jsonld";

export async function generateMetadata(): Promise<Metadata> {
  const [settings, analytics] = await Promise.all([getPublicSettings(), getAnalyticsConfig()]);
  const icon = settings.faviconMediaId ? (await getMediaByIds([settings.faviconMediaId]))[settings.faviconMediaId] : undefined;
  const gsc = analytics.find((a) => a.provider === "gsc_verification");
  return {
    title: { default: settings.businessName, template: settings.titleTemplate },
    description: settings.defaultMetaDescription,
    applicationName: settings.businessName,
    icons: icon ? { icon: icon.url, apple: icon.url } : undefined,
    verification: gsc ? { google: gsc.publicId } : undefined,
    openGraph: { siteName: settings.businessName, locale: "en_IN", type: "website" },
    twitter: { card: "summary_large_image" },
    robots: process.env.STAGING === "true" ? { index: false, follow: false } : undefined,
  };
}

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const [settings, analytics] = await Promise.all([getPublicSettings(), getAnalyticsConfig()]);
  const logo = settings.logoMediaId ? (await getMediaByIds([settings.logoMediaId]))[settings.logoMediaId] : undefined;
  return (
    <>
      <JsonLd data={[organizationJsonLd(settings, logo?.url), websiteJsonLd(settings)]} />
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <MobileActionBar />
      <ClientBoot />
      <Analytics providers={analytics} privacyPath={settings.privacyPolicyPath} />
    </>
  );
}
