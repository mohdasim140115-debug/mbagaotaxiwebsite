



import type { PublicSettings } from "@/lib/cms/settings-def";

const SITE_URL = "https://mbatravelsgoa.in";

export function siteUrl(path = "/") {
  const base = SITE_URL.replace(/\/+$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

const ORG_ID = () => siteUrl("/#organization");

/**
 * Business entity. Only facts published by the business are included.
 * No ratings or review counts are emitted.
 */
export function organizationJsonLd(s: PublicSettings, logoUrl?: string) {
  const sameAs = [s.facebookUrl, s.instagramUrl, s.googleBusinessUrl].filter(Boolean);
  const hasAddress = s.streetAddress || s.addressLocality || s.postalCode;

  return {
    "@context": "https://schema.org",
    "@type": s.businessType,
    "@id": ORG_ID(),
    name: s.businessName,
    ...(s.legalName ? { legalName: s.legalName } : {}),
    ...(s.alternateName ? { alternateName: s.alternateName } : {}),
    url: siteUrl("/"),
    ...(logoUrl ? { logo: siteUrl(logoUrl), image: siteUrl(logoUrl) } : {}),
    telephone: s.phone.replace(/\s/g, ""),
    ...(s.email ? { email: s.email } : {}),
    ...(hasAddress
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: s.streetAddress,
            addressLocality: s.addressLocality,
            addressRegion: s.addressRegion,
            postalCode: s.postalCode,
            addressCountry: s.addressCountry,
          },
        }
      : {}),
    ...(s.openingHoursSchema ? { openingHours: s.openingHoursSchema } : {}),
    areaServed: { "@type": "State", name: "Goa" },
    ...(sameAs.length ? { sameAs } : {}),
  };
}

export function websiteJsonLd(s: PublicSettings) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": siteUrl("/#website"),
    url: siteUrl("/"),
    name: s.businessName,
    ...(s.alternateName ? { alternateName: s.alternateName } : {}),
    publisher: { "@id": ORG_ID() },
    inLanguage: "en-IN",
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: siteUrl(it.path),
    })),
  };
}

/** FAQPage only when questions and answers are visible on the same page. */
export function faqJsonLd(faqs: { question: string; answer: string }[]) {
  if (!faqs.length) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  };
}

export function serviceJsonLd(
  name: string,
  description: string,
  path: string,
  offers?: { price: number; description: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    url: siteUrl(path),
    provider: { "@id": ORG_ID() },
    areaServed: { "@type": "State", name: "Goa" },
    ...(offers && offers.length
      ? {
          offers: offers.map((o) => ({
            "@type": "Offer",
            price: o.price,
            priceCurrency: "INR",
            description: o.description,
          })),
        }
      : {}),
  };
}

export function touristTripJsonLd(p: {
  name: string;
  description: string;
  path: string;
  price: number | null;
  itinerary: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: p.name,
    description: p.description,
    url: siteUrl(p.path),
    provider: { "@id": ORG_ID() },
    ...(p.itinerary.length
      ? {
          itinerary: {
            "@type": "ItemList",
            itemListElement: p.itinerary.map((name, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name,
            })),
          },
        }
      : {}),
    ...(p.price !== null
      ? {
          offers: {
            "@type": "Offer",
            price: p.price,
            priceCurrency: "INR",
            url: siteUrl(p.path),
          },
        }
      : {}),
  };
}

export function blogPostingJsonLd(p: {
  title: string;
  description: string;
  path: string;
  image?: string;
  published: string | null;
  modified: string;
  author: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: p.title,
    description: p.description,
    mainEntityOfPage: siteUrl(p.path),
    url: siteUrl(p.path),
    ...(p.image ? { image: siteUrl(p.image) } : {}),
    ...(p.published ? { datePublished: p.published } : {}),
    dateModified: p.modified,
    author: p.author
      ? { "@type": "Person", name: p.author }
      : { "@id": ORG_ID() },
    publisher: { "@id": ORG_ID() },
    inLanguage: "en-IN",
  };
}
