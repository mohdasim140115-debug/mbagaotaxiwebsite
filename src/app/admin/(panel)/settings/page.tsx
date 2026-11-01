import { db, schema } from "@/server/db/client";
import { requireAdmin } from "@/server/auth/session";
import { getAllSettings } from "@/server/cms/settings";
import { mediaThumbs } from "@/server/cms/editor-data";
import { SettingsForm } from "@/components/admin/settings-form";
import { PageTitle } from "@/components/admin/ui";

export const metadata = { title: "Site settings" };

export default async function SettingsPage() {
  await requireAdmin("settings.manage");
  const [settings, analytics] = await Promise.all([getAllSettings(), db.select().from(schema.analyticsConfiguration)]);
  const media = await mediaThumbs([settings.logoMediaId, settings.faviconMediaId, settings.defaultOgImageId].filter((n): n is number => !!n));
  return (
    <>
      <PageTitle title="Site settings" description="Business details used across the whole site, structured data, booking buttons and analytics. Phone and WhatsApp numbers here update every button at once." />
      <SettingsForm
        initial={settings}
        media={media}
        analytics={schema.ANALYTICS_PROVIDERS.map((p) => {
          const row = analytics.find((a) => a.provider === p);
          return { provider: p, publicId: row?.publicId ?? "", conversionLabel: row?.conversionLabel ?? "", isEnabled: row?.isEnabled ?? false, requiresConsent: row?.requiresConsent ?? p !== "gsc_verification" };
        })}
      />
    </>
  );
}

// Admin screens always read fresh, per-request data.
export const instant = false;
