import type { Cta } from "./fields";
import { telHref, whatsappHref, type PublicSettings } from "./settings-def";

export const ENQUIRY_PATH = "/goa-taxi-service-contact/#enquiry";

export type ResolvedCta = {
  label: string;
  href: string;
  external: boolean;
  kind: Cta["kind"];
  /** Analytics event name fired on click (no personal data). */
  event: "booking_click" | "whatsapp_click" | "phone_click" | "enquiry_click" | null;
};

/**
 * Turns a CMS button into a real link. Phone/WhatsApp numbers always come from Site settings so
 * a single admin edit updates every button on the site.
 */
export function resolveCta(cta: Partial<Cta> | undefined, settings: PublicSettings, contextMessage?: string): ResolvedCta | null {
  if (!cta || !cta.label) return null;
  const message = cta.message || contextMessage || settings.whatsappDefaultMessage;
  switch (cta.kind) {
    case "call":
      return { label: cta.label, href: telHref(settings.phone), external: false, kind: "call", event: "phone_click" };
    case "whatsapp":
      return { label: cta.label, href: whatsappHref(settings.whatsapp, message), external: true, kind: "whatsapp", event: "whatsapp_click" };
    case "enquiry":
      return { label: cta.label, href: cta.href || ENQUIRY_PATH, external: false, kind: "enquiry", event: "enquiry_click" };
    case "booking":
      return resolveBooking(cta.label, settings, message);
    case "link":
    default: {
      if (!cta.href) return null;
      const external = /^https?:\/\//.test(cta.href);
      return { label: cta.label, href: cta.href, external, kind: "link", event: null };
    }
  }
}

export function resolveBooking(label: string, settings: PublicSettings, message?: string): ResolvedCta {
  if (settings.bookingMode === "whatsform" && settings.bookingFormUrl) {
    return { label, href: settings.bookingFormUrl, external: true, kind: "booking", event: "booking_click" };
  }
  if (settings.bookingMode === "whatsapp") {
    return { label, href: whatsappHref(settings.whatsapp, message || settings.whatsappDefaultMessage), external: true, kind: "booking", event: "whatsapp_click" };
  }
  return { label, href: ENQUIRY_PATH, external: false, kind: "booking", event: "enquiry_click" };
}
