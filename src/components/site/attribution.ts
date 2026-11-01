"use client";

const KEY = "mba_attribution";
export type Attribution = {
  landingPage: string;
  referrer: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm: string;
  utmContent: string;
};

/** First-touch attribution for this browser session (no cookies, no personal data). */
export function captureAttribution() {
  try {
    if (sessionStorage.getItem(KEY)) return;
    const url = new URL(window.location.href);
    const p = url.searchParams;
    const data: Attribution = {
      landingPage: (url.pathname + url.search).slice(0, 500),
      referrer: document.referrer && !document.referrer.startsWith(url.origin) ? document.referrer.slice(0, 500) : "",
      utmSource: p.get("utm_source") ?? "",
      utmMedium: p.get("utm_medium") ?? "",
      utmCampaign: p.get("utm_campaign") ?? "",
      utmTerm: p.get("utm_term") ?? "",
      utmContent: p.get("utm_content") ?? "",
    };
    sessionStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage blocked: attribution is optional */
  }
}

export function readAttribution(): Attribution {
  const empty: Attribution = { landingPage: "", referrer: "", utmSource: "", utmMedium: "", utmCampaign: "", utmTerm: "", utmContent: "" };
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? { ...empty, ...JSON.parse(raw) } : { ...empty, landingPage: window.location.pathname };
  } catch {
    return { ...empty, landingPage: window.location.pathname };
  }
}
