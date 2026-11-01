"use client";

type Params = Record<string, string | number | boolean>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    __mbaAnalytics?: { gtm: boolean; ga4: boolean; meta: boolean; adsSendTo: string };
  }
}

const META_EVENTS: Record<string, string> = {
  enquiry_submit: "Lead",
  whatsapp_click: "Contact",
  phone_click: "Contact",
  booking_click: "Contact",
};

/**
 * Sends one event to whichever tools the CMS enabled and consent allows.
 * - GTM present: push to dataLayer only (GTM routes it to GA4/Ads) — avoids double counting.
 * - Otherwise GA4 via gtag directly.
 * Never pass personal data (names, phone numbers, emails, message text) in params.
 */
export function track(event: string, params: Params = {}) {
  if (typeof window === "undefined") return;
  const cfg = window.__mbaAnalytics;
  if (!cfg) return;
  const safe: Params = { ...params, page_path: window.location.pathname };
  if (cfg.gtm) {
    window.dataLayer?.push({ event, ...safe });
  } else if (cfg.ga4 && window.gtag) {
    window.gtag("event", event, safe);
    if (event === "enquiry_submit" && cfg.adsSendTo) window.gtag("event", "conversion", { send_to: cfg.adsSendTo });
  }
  if (cfg.meta && window.fbq && META_EVENTS[event]) window.fbq("track", META_EVENTS[event], { content_name: event });
}
