import { z } from "zod";
import { collectMediaIds, defaultsFor, fieldsToZod, HEADING_LEVELS, type FieldDef } from "./fields";

const heading: FieldDef[] = [
  { name: "eyebrow", label: "Eyebrow (small label above heading)", type: "text", max: 80 },
  { name: "title", label: "Heading", type: "text", max: 200 },
  { name: "headingLevel", label: "Heading level", type: "select", options: HEADING_LEVELS },
  { name: "description", label: "Intro text", type: "textarea", max: 1000, rows: 3 },
];

const titleText: FieldDef[] = [
  { name: "title", label: "Title", type: "text", required: true, max: 120 },
  { name: "text", label: "Text", type: "textarea", max: 600, rows: 2 },
];

export const SECTION_TYPES = {
  hero: {
    label: "Hero slider",
    description: "Full-width image slider with the page's main heading and buttons.",
    fields: [
      { name: "eyebrow", label: "Eyebrow", type: "text", max: 80 },
      { name: "title", label: "Heading (H1)", type: "text", required: true, max: 200 },
      { name: "description", label: "Description", type: "textarea", max: 600, rows: 3 },
      { name: "slides", label: "Slides", type: "repeater", itemLabel: "Slide", max: 8, fields: [{ name: "mediaId", label: "Image", type: "media", required: true }] },
      { name: "primaryCta", label: "Primary button", type: "cta" },
      { name: "secondaryCta", label: "Secondary button", type: "cta" },
      { name: "showScrollCue", label: "Show “Scroll” cue", type: "boolean" },      { name: "cards", label: "Hero image cards (bottom-right). Leave empty to show the first 4 packages instead.", type: "repeater", itemLabel: "Card", max: 4, fields: [{ name: "mediaId", label: "Image", type: "media", required: true }, { name: "link", label: "Card text and link (button text = card title)", type: "cta" }] },
      { name: "stats", label: "Statistics strip below the hero (only figures you can substantiate)", type: "repeater", itemLabel: "Figure", max: 4, fields: [{ name: "value", label: "Value", type: "text", required: true, max: 20 }, { name: "label", label: "Label", type: "text", required: true, max: 60 }, { name: "icon", label: "Icon name", type: "text", max: 40, help: "e.g. users, car, clock, route, building-2" }] },
      { name: "promoEyebrow", label: "Promo card: small label", type: "text", max: 60 },
      { name: "promoTitle", label: "Promo card: heading", type: "text", max: 120 },
      { name: "promoText", label: "Promo card: text", type: "text", max: 200 },
      { name: "promoMediaId", label: "Promo card: image", type: "media" },
      { name: "promoCta", label: "Promo card: link", type: "cta" },
    ],
  },
  page_header: {
    label: "Page header",
    description: "Compact banner with the page heading (use H1 on pages without a hero).",
    fields: [...heading, { name: "mediaId", label: "Background image (optional)", type: "media" }],
  },
  services: {
    label: "Services grid",
    description: "Shows published services from the Services manager, in their display order.",
    fields: [...heading],
  },
  packages: {
    label: "Package grid",
    description: "Shows selected packages. Price overrides keep page-specific wording.",
    fields: [
      ...heading,
      {
        name: "items",
        label: "Packages (leave empty to show all published)",
        type: "repeater",
        itemLabel: "Package",
        fields: [
          { name: "packageId", label: "Package", type: "ref", entity: "packages", required: true },
          { name: "priceOverride", label: "Price text override (e.g. “Starts From ₹2,500”)", type: "text", max: 80 },
          { name: "unitOverride", label: "Price unit override (e.g. “/Person”)", type: "text", max: 40 },
          { name: "hidePrice", label: "Hide price on this card", type: "boolean" },
        ],
      },
      { name: "showCallButton", label: "Show “Call Now” button on cards", type: "boolean" },
    ],
  },
  feature_split: {
    label: "Image + features",
    description: "Image beside a heading, text and a checklist of features.",
    fields: [
      ...heading,
      { name: "mediaId", label: "Image", type: "media" },
      { name: "features", label: "Features", type: "repeater", itemLabel: "Feature", fields: titleText },
      { name: "cta", label: "Button", type: "cta" },
    ],
  },
  fleet: {
    label: "Fleet (taxi fares)",
    description: "Published vehicles with their fares from the Fleet manager.",
    fields: [...heading, { name: "showCallButton", label: "Show “Call Now” button on cards", type: "boolean" }],
  },
  airport: {
    label: "Airport transfers",
    description: "Airport transfer block. Vehicle prices come from each vehicle’s airport fare.",
    fields: [
      ...heading,
      { name: "mediaId", label: "Image", type: "media" },
      { name: "badgeTitle", label: "Image badge title", type: "text", max: 80 },
      { name: "badgeText", label: "Image badge text", type: "text", max: 120 },
      { name: "introTitle", label: "Intro heading", type: "text", max: 160 },
      { name: "introText", label: "Intro text", type: "textarea", max: 600 },
      { name: "features", label: "Features", type: "repeater", itemLabel: "Feature", fields: titleText },
      { name: "ctaTitle", label: "Closing call-to-action heading", type: "text", max: 160 },
      { name: "ctaText", label: "Closing call-to-action text", type: "textarea", max: 600 },
      { name: "cta", label: "Closing button", type: "cta" },
      { name: "cardCta", label: "Vehicle card button", type: "cta" },
    ],
  },
  destinations: {
    label: "Destinations / experiences",
    description: "Published destinations from the Destinations manager.",
    fields: [...heading],
  },
  testimonials: {
    label: "Testimonials",
    description: "Published testimonials. Star ratings only show for verified reviews.",
    fields: [...heading],
  },
  faq: {
    label: "FAQ accordion",
    description: "Published FAQs in the chosen category. Eligible for FAQPage structured data.",
    fields: [
      ...heading,
      { name: "category", label: "FAQ category", type: "text", max: 60 },
      { name: "asideTitle", label: "Side card heading", type: "text", max: 120 },
      { name: "asideText", label: "Side card text", type: "textarea", max: 600 },
      { name: "asideCta", label: "Side card button", type: "cta" },
    ],
  },
  rich_text: {
    label: "Text block",
    description: "Heading and paragraphs. Separate paragraphs with a blank line; lines starting with “- ” become a list.",
    fields: [
      ...heading.filter((f) => f.name !== "description"),
      { name: "body", label: "Body", type: "textarea", max: 20000, rows: 10 },
      { name: "width", label: "Width", type: "select", options: [{ value: "prose", label: "Readable column" }, { value: "wide", label: "Wide" }] },
      { name: "background", label: "Background", type: "select", options: [{ value: "paper", label: "Paper" }, { value: "sand", label: "Sand" }] },
    ],
  },
  about_intro: {
    label: "About intro",
    description: "Two images with an experience badge, heading, paragraphs, highlights and a button.",
    fields: [
      ...heading.filter((f) => f.name !== "description"),
      { name: "images", label: "Images (first is large, second is inset)", type: "mediaList" },
      { name: "badgeValue", label: "Badge value (e.g. 8+)", type: "text", max: 20 },
      { name: "badgeLabel", label: "Badge label", type: "text", max: 60 },
      { name: "body", label: "Paragraphs (blank line between)", type: "textarea", max: 4000, rows: 6 },
      { name: "highlights", label: "Highlights", type: "stringList" },
      { name: "cta", label: "Button", type: "cta" },
    ],
  },
  feature_cards: {
    label: "Feature cards",
    description: "Grid of icon cards.",
    fields: [
      ...heading,
      {
        name: "items",
        label: "Cards",
        type: "repeater",
        itemLabel: "Card",
        fields: [...titleText, { name: "icon", label: "Icon name", type: "text", max: 40, help: "e.g. map-pinned, wallet, shield-check, headset" }],
      },
    ],
  },
  stats: {
    label: "Story + statistics",
    description: "Heading, paragraphs and a row of figures. Only show figures you can substantiate.",
    fields: [
      ...heading.filter((f) => f.name !== "description"),
      { name: "body", label: "Paragraphs (blank line between)", type: "textarea", max: 4000, rows: 5 },
      { name: "items", label: "Figures", type: "repeater", itemLabel: "Figure", fields: [{ name: "value", label: "Value", type: "text", required: true, max: 20 }, { name: "label", label: "Label", type: "text", required: true, max: 60 }] },
    ],
  },
  cta_band: {
    label: "Call-to-action band",
    description: "Prominent banner with heading, text and up to two buttons.",
    fields: [
      { name: "title", label: "Heading", type: "text", required: true, max: 160 },
      { name: "text", label: "Text", type: "textarea", max: 600 },
      { name: "primaryCta", label: "Primary button", type: "cta" },
      { name: "secondaryCta", label: "Secondary button", type: "cta" },
    ],
  },
  hotels: {
    label: "Hotels grid",
    description: "Published hotels from the Hotels manager.",
    fields: [...heading],
  },
  contact: {
    label: "Contact details",
    description: "Contact intro, service list, booking box and the enquiry form. Phone/WhatsApp come from Site settings.",
    fields: [
      { name: "title", label: "Heading", type: "text", max: 160 },
      { name: "text", label: "Intro text", type: "textarea", max: 1000 },
      { name: "servicesTitle", label: "Services list heading", type: "text", max: 120 },
      { name: "servicesList", label: "Services list", type: "stringList" },
      { name: "bookTitle", label: "Booking box heading", type: "text", max: 120 },
      { name: "bookText", label: "Booking box text", type: "textarea", max: 600 },
      { name: "bookCta", label: "Booking box button", type: "cta" },
      { name: "bookNote", label: "Booking box note", type: "text", max: 200 },
      { name: "showForm", label: "Show enquiry form", type: "boolean" },
      { name: "formTitle", label: "Form heading", type: "text", max: 120 },
    ],
  },
  gallery: {
    label: "Gallery",
    description: "Image grid with captions and a lightbox.",
    fields: [...heading, { name: "images", label: "Images", type: "repeater", itemLabel: "Image", fields: [{ name: "mediaId", label: "Image", type: "media", required: true }, { name: "caption", label: "Caption", type: "text", max: 200 }] }],
  },
  blog_posts: {
    label: "Blog posts list",
    description: "Cards for the newest published blog posts (Admin → Blog posts).",
    fields: [...heading, { name: "limit", label: "How many posts to show", type: "number", min: 1, max: 50 }],
  },
  enquiry_form: {
    label: "Enquiry form",
    description: "Stand-alone enquiry form that saves to the Enquiries dashboard.",
    fields: [
      { name: "title", label: "Heading", type: "text", max: 160 },
      { name: "text", label: "Text", type: "textarea", max: 600 },
      { name: "enquiryType", label: "Enquiry type", type: "select", options: [{ value: "general", label: "General" }, { value: "taxi", label: "Taxi" }, { value: "airport", label: "Airport transfer" }, { value: "package", label: "Package" }, { value: "hotel", label: "Hotel" }] },
    ],
  },
} satisfies Record<string, { label: string; description: string; fields: FieldDef[] }>;

export type SectionType = keyof typeof SECTION_TYPES;
export const SECTION_TYPE_KEYS = Object.keys(SECTION_TYPES) as SectionType[];

const sectionSchemas = Object.fromEntries(
  SECTION_TYPE_KEYS.map((k) => [k, fieldsToZod(SECTION_TYPES[k].fields)]),
) as Record<SectionType, z.ZodObject>;

export function sectionSchema(type: SectionType) {
  return sectionSchemas[type];
}

export function isSectionType(t: string): t is SectionType {
  return t in SECTION_TYPES;
}

export function sectionDefaults(type: SectionType) {
  return defaultsFor(SECTION_TYPES[type].fields);
}

export function sectionMediaIds(type: SectionType, data: Record<string, unknown>) {
  return collectMediaIds(SECTION_TYPES[type].fields, data);
}

export type SectionData = Record<string, unknown>;
export type Section = { id?: number; type: SectionType; isEnabled: boolean; data: SectionData };
