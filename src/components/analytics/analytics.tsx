"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

type Provider = { provider: string; publicId: string; conversionLabel: string; requiresConsent: boolean };
const CONSENT_KEY = "mba_analytics_consent";
const ID_PATTERN = /^[A-Za-z0-9_-]{3,40}$/;

function readConsent(): "granted" | "denied" | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

export function Analytics({ providers, privacyPath }: { providers: Provider[]; privacyPath: string }) {
  // IDs come from the CMS; validate format before interpolating into script tags.
  const valid = providers.filter((p) => ID_PATTERN.test(p.publicId) && p.provider !== "gsc_verification");
  const needsConsent = valid.some((p) => p.requiresConsent);
  const [consent, setConsent] = useState<"granted" | "denied" | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Browser-only storage is read after hydration on purpose, to avoid a server/client mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConsent(readConsent());
    setReady(true);
  }, []);

  const allowed = (p: Provider) => !p.requiresConsent || consent === "granted";
  const gtm = valid.find((p) => p.provider === "gtm" && allowed(p));
  const ga4 = valid.find((p) => p.provider === "ga4" && allowed(p));
  const ads = valid.find((p) => p.provider === "google_ads" && allowed(p));
  const meta = valid.find((p) => p.provider === "meta_pixel" && allowed(p));

  useEffect(() => {
    if (!ready) return;
    window.__mbaAnalytics = {
      gtm: !!gtm,
      ga4: !!ga4,
      meta: !!meta,
      adsSendTo: ads && ads.conversionLabel ? `${ads.publicId}/${ads.conversionLabel}` : "",
    };
  }, [ready, gtm, ga4, meta, ads]);

  if (!valid.length || !ready) return null;

  const decide = (value: "granted" | "denied") => {
    try {
      localStorage.setItem(CONSENT_KEY, value);
    } catch {
      /* storage unavailable: decision applies to this page view only */
    }
    setConsent(value);
  };

  const gtagId = ga4?.publicId ?? ads?.publicId;

  return (
    <>
      {gtm && (
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm.publicId}');`}
        </Script>
      )}
      {!gtm && gtagId && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gtagId}`} strategy="afterInteractive" />
          <Script id="gtag-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());${ga4 ? `gtag('config','${ga4.publicId}',{anonymize_ip:true});` : ""}${ads ? `gtag('config','${ads.publicId}');` : ""}`}
          </Script>
        </>
      )}
      {meta && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${meta.publicId}');fbq('track','PageView');`}
        </Script>
      )}
      {needsConsent && consent === null && (
        <div
          role="dialog"
          aria-live="polite"
          aria-label="Cookie consent"
          className="fixed inset-x-3 bottom-20 z-[70] mx-auto max-w-xl rounded-[10px] border border-line bg-paper-raised p-4 text-sm shadow-3 md:bottom-4"
        >
          <p className="text-ink-700">
            We use analytics cookies to understand how visitors use this site. No personal details are shared.
            {privacyPath && (
              <>
                {" "}
                <a className="underline" href={privacyPath}>
                  Privacy policy
                </a>
              </>
            )}
          </p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => decide("granted")} className="h-10 rounded-[10px] bg-ocean-800 px-4 font-semibold text-white">
              Accept
            </button>
            <button type="button" onClick={() => decide("denied")} className="h-10 rounded-[10px] border border-line px-4 font-semibold">
              Decline
            </button>
          </div>
        </div>
      )}
    </>
  );
}
