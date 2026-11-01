import { Check, Clock, Mail, MapPin, Phone } from "lucide-react";
import { getPublicSettings } from "@/server/cms/settings";
import { resolveCta } from "@/lib/cms/cta";
import type { Cta } from "@/lib/cms/fields";
import { telHref } from "@/lib/cms/settings-def";
import { CtaLink } from "@/components/site/cta-link";
import { EnquiryForm } from "@/components/site/enquiry-form";
import { arr, str } from "./shared";

export async function ContactSection({ data }: { data: Record<string, unknown> }) {
  const settings = await getPublicSettings();
  const services = arr<string>(data.servicesList);
  const address = [settings.streetAddress, settings.addressLocality, `${settings.addressRegion} ${settings.postalCode}`.trim()].filter(Boolean).join(", ");
  return (
    <section className="section-y bg-paper">
      <div className="container-wide grid gap-10 lg:grid-cols-[1fr_1.1fr]">
        <div>
          {str(data.title) && <h2 className="font-display fs-h2 font-semibold">{str(data.title)}</h2>}
          {str(data.text) && <p className="mt-4 text-lg text-ink-700">{str(data.text)}</p>}
          {services.length > 0 && (
            <>
              <h3 className="font-display mt-8 fs-h3 font-semibold">{str(data.servicesTitle)}</h3>
              <ul className="mt-3 space-y-2">
                {services.map((s) => (
                  <li key={s} className="flex items-center gap-2">
                    <Check className="size-5 text-teal-600" aria-hidden="true" /> {s}
                  </li>
                ))}
              </ul>
            </>
          )}
          <div className="mt-8 rounded-[16px] bg-ocean-800 p-6 text-white">
            <h3 className="font-display fs-h3 font-semibold">{str(data.bookTitle)}</h3>
            {str(data.bookText) && <p className="mt-2 text-white/80">{str(data.bookText)}</p>}
            <div className="mt-5 flex flex-wrap gap-3">
              <CtaLink cta={resolveCta(data.bookCta as Cta, settings)} size="lg" context="contact" />
              <CtaLink cta={resolveCta({ label: "Call Now", kind: "call" }, settings)} size="lg" variant="outlineLight" context="contact" />
            </div>
            {str(data.bookNote) && <p className="mt-4 text-sm text-white/70">{str(data.bookNote)}</p>}
          </div>
          <ul className="mt-8 space-y-3">
            <li>
              <a href={telHref(settings.phone)} className="inline-flex items-center gap-3 font-medium hover:underline">
                <Phone className="size-5 text-teal-700" aria-hidden="true" /> {settings.phone}
              </a>
            </li>
            {settings.showEmail && settings.email && (
              <li>
                <a href={`mailto:${settings.email}`} className="inline-flex items-center gap-3 font-medium hover:underline">
                  <Mail className="size-5 text-teal-700" aria-hidden="true" /> {settings.email}
                </a>
              </li>
            )}
            {settings.showAddress && address && (
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-5 shrink-0 text-teal-700" aria-hidden="true" />
                <address className="not-italic">{address}</address>
              </li>
            )}
            {settings.openingHoursText && (
              <li className="flex items-center gap-3">
                <Clock className="size-5 text-teal-700" aria-hidden="true" /> {settings.openingHoursText}
              </li>
            )}
          </ul>
        </div>
        {data.showForm === true && (
          <div id="enquiry" className="scroll-mt-24 rounded-[16px] border border-line bg-paper-raised p-6 shadow-1 md:p-8">
            <h2 className="font-display fs-h3 font-semibold">{str(data.formTitle) || "Send an enquiry"}</h2>
            <EnquiryForm consentText={settings.consentText} privacyPath={settings.privacyPolicyPath} defaultType="general" />
          </div>
        )}
      </div>
    </section>
  );
}

export async function EnquiryFormSection({ data }: { data: Record<string, unknown> }) {
  const settings = await getPublicSettings();
  return (
    <section className="section-y bg-sand-100">
      <div className="container-prose">
        <div id="enquiry" className="scroll-mt-24 rounded-[16px] bg-paper-raised p-6 shadow-1 md:p-8">
          {str(data.title) && <h2 className="font-display fs-h2 font-semibold">{str(data.title)}</h2>}
          {str(data.text) && <p className="mt-2 text-ink-700">{str(data.text)}</p>}
          <EnquiryForm consentText={settings.consentText} privacyPath={settings.privacyPolicyPath} defaultType={str(data.enquiryType) || "general"} />
        </div>
      </div>
    </section>
  );
}
