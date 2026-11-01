"use client";

import { useState, useTransition } from "react";
import { saveAnalyticsAction, saveSettingsAction } from "@/server/admin/ops-actions";
import type { SiteSettings } from "@/lib/cms/settings-def";
import type { FieldDef } from "@/lib/cms/fields";
import { Button } from "@/components/ui/button";
import { FieldGrid, FormContextProvider } from "./field-input";
import { Card, Notice, inputCls } from "./ui";

const GROUPS: { title: string; help?: string; fields: FieldDef[] }[] = [
  {
    title: "Business",
    fields: [
      { name: "businessName", label: "Business name", type: "text", required: true },
      { name: "legalName", label: "Legal name", type: "text" },
      { name: "alternateName", label: "Alternate name (structured data)", type: "text" },
      { name: "businessType", label: "Business type (structured data)", type: "select", options: [{ value: "TravelAgency", label: "Travel agency" }, { value: "TaxiService", label: "Taxi service" }, { value: "LocalBusiness", label: "Local business" }] },
      { name: "logoMediaId", label: "Logo", type: "media" },
      { name: "faviconMediaId", label: "Favicon (square image)", type: "media" },
    ],
  },
  {
    title: "Contact & booking",
    help: "Every call, WhatsApp and booking button on the site uses these values.",
    fields: [
      { name: "phone", label: "Phone number (international format)", type: "text", required: true, help: "e.g. +91 93220 73068" },
      { name: "whatsapp", label: "WhatsApp number (digits with country code)", type: "text", required: true, help: "e.g. 919322073068" },
      { name: "whatsappDefaultMessage", label: "Default WhatsApp message", type: "text" },
      { name: "bookingMode", label: "“Book” buttons open", type: "select", options: [{ value: "whatsform", label: "External booking form (WhatsForm) — as on the original site" }, { value: "enquiry", label: "This site’s enquiry form (saved to Enquiries)" }, { value: "whatsapp", label: "WhatsApp chat directly" }] },
      { name: "bookingFormUrl", label: "External booking form URL", type: "text" },
      { name: "email", label: "Email", type: "text" },
      { name: "showEmail", label: "Show email on the website", type: "boolean" },
      { name: "openingHoursText", label: "Opening hours (shown on site)", type: "text" },
      { name: "openingHoursSchema", label: "Opening hours (structured data, e.g. Mo-Su 00:00-23:59)", type: "text" },
    ],
  },
  {
    title: "Address",
    fields: [
      { name: "streetAddress", label: "Street / locality", type: "text" },
      { name: "addressLocality", label: "Town / village", type: "text" },
      { name: "addressRegion", label: "State", type: "text" },
      { name: "postalCode", label: "PIN code", type: "text" },
      { name: "addressCountry", label: "Country code", type: "text" },
      { name: "showAddress", label: "Show address on the website", type: "boolean" },
    ],
  },
  {
    title: "Social & footer",
    fields: [
      { name: "facebookUrl", label: "Facebook URL", type: "text" },
      { name: "instagramUrl", label: "Instagram URL", type: "text" },
      { name: "googleBusinessUrl", label: "Google Business Profile / reviews URL", type: "text" },
      { name: "footerAbout", label: "Footer text", type: "textarea", rows: 2 },
      { name: "copyrightText", label: "Copyright line ({year} = current year)", type: "text" },
    ],
  },
  {
    title: "SEO defaults",
    fields: [
      { name: "titleTemplate", label: "Title template (%s = page title)", type: "text" },
      { name: "defaultMetaDescription", label: "Default meta description", type: "textarea", rows: 2 },
      { name: "defaultOgImageId", label: "Default social share image", type: "media" },
    ],
  },
  {
    title: "Enquiries & privacy",
    fields: [
      { name: "enquiryNotifyEmail", label: "Send new-enquiry notifications to (requires SMTP settings on the server)", type: "text" },
      { name: "enquiryRetentionMonths", label: "Keep enquiry personal data for (months)", type: "number", min: 1, max: 120 },
      { name: "consentText", label: "Consent checkbox text", type: "textarea", rows: 2 },
      { name: "privacyPolicyPath", label: "Privacy policy page path (e.g. /privacy-policy/)", type: "text" },
    ],
  },
];

const PROVIDER_LABELS: Record<string, { label: string; help: string }> = {
  ga4: { label: "Google Analytics 4", help: "Measurement ID, e.g. G-XXXXXXX" },
  gtm: { label: "Google Tag Manager", help: "Container ID, e.g. GTM-XXXXXX. When enabled, events go to the dataLayer only." },
  google_ads: { label: "Google Ads conversions", help: "AW-XXXXXXXXX plus a conversion label for enquiries" },
  meta_pixel: { label: "Meta Pixel", help: "Pixel ID (numbers)" },
  gsc_verification: { label: "Google Search Console verification", help: "The content value of the google-site-verification meta tag" },
};

type AnalyticsRow = { provider: string; publicId: string; conversionLabel: string; isEnabled: boolean; requiresConsent: boolean };

export function SettingsForm({ initial, media, analytics }: { initial: SiteSettings; media: Record<number, { url: string; altText: string }>; analytics: AnalyticsRow[] }) {
  const [values, setValues] = useState<Record<string, unknown>>(initial);
  const [rows, setRows] = useState(analytics);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [aMsg, setAMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <FormContextProvider initialMedia={media} refs={{}} errors={errors}>
      <div className="space-y-6">
        {GROUPS.map((g) => (
          <Card key={g.title} title={g.title}>
            {g.help && <p className="mb-4 text-sm text-ink-700">{g.help}</p>}
            <FieldGrid fields={g.fields} values={values} onChange={(n, v) => setValues((p) => ({ ...p, [n]: v }))} />
          </Card>
        ))}
        <div className="sticky bottom-0 z-10 flex items-center gap-3 border-t border-line bg-[#f6f4ef] py-3">
          <Button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await saveSettingsAction(values);
                setErrors(r.ok ? {} : (r.fieldErrors ?? {}));
                setMsg({ ok: r.ok, text: r.ok ? "Settings saved. The website is updated." : r.error });
              })
            }
          >
            {pending ? "Saving…" : "Save settings"}
          </Button>
          {msg && <Notice kind={msg.ok ? "success" : "error"}>{msg.text}</Notice>}
        </div>

        <Card title="Analytics & tracking">
          <p className="mb-4 text-sm text-ink-700">
            Only public IDs belong here — never passwords or API secrets. Tools that require consent load only after a visitor accepts the cookie banner. Tracked events: enquiry_submit, phone_click, whatsapp_click, booking_click, enquiry_click (no personal data is sent).
          </p>
          <ul className="space-y-4">
            {rows.map((r, i) => {
              const meta = PROVIDER_LABELS[r.provider]!;
              const set = (patch: Partial<AnalyticsRow>) => setRows((prev) => prev.map((x, j) => (j === i ? { ...x, ...patch } : x)));
              return (
                <li key={r.provider} className="grid gap-3 rounded-md border border-line p-3 md:grid-cols-[1.2fr_1fr_1fr_auto]">
                  <div>
                    <p className="font-semibold">{meta.label}</p>
                    <p className="text-xs text-ink-500">{meta.help}</p>
                  </div>
                  <input aria-label={`${meta.label} ID`} className={inputCls} value={r.publicId} placeholder="ID" onChange={(e) => set({ publicId: e.target.value.trim() })} />
                  {r.provider === "google_ads" ? (
                    <input aria-label="Conversion label" className={inputCls} value={r.conversionLabel} placeholder="Conversion label" onChange={(e) => set({ conversionLabel: e.target.value.trim() })} />
                  ) : (
                    <span />
                  )}
                  <div className="flex flex-col gap-1 text-sm">
                    <label className="inline-flex items-center gap-2"><input type="checkbox" className="accent-teal-600" checked={r.isEnabled} onChange={(e) => set({ isEnabled: e.target.checked })} /> Enabled</label>
                    {r.provider !== "gsc_verification" && <label className="inline-flex items-center gap-2"><input type="checkbox" className="accent-teal-600" checked={r.requiresConsent} onChange={(e) => set({ requiresConsent: e.target.checked })} /> Requires consent</label>}
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await saveAnalyticsAction(rows);
                  setAMsg({ ok: r.ok, text: r.ok ? "Analytics settings saved." : r.error });
                })
              }
            >
              Save analytics
            </Button>
            {aMsg && <Notice kind={aMsg.ok ? "success" : "error"}>{aMsg.text}</Notice>}
          </div>
        </Card>
      </div>
    </FormContextProvider>
  );
}
