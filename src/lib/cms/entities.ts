import { FARE_TYPE_OPTIONS } from "./fares";
import type { FieldDef } from "./fields";

export type EntityKey = "posts" | "packages" | "services" | "vehicles" | "hotels" | "destinations" | "testimonials" | "faqs";

export type EntityDef = {
  key: EntityKey;
  label: string;
  singular: string;
  /** Column used as the record's display name. */
  titleField: string;
  /** Field the slug is generated from (if the entity has a slug). */
  slugFrom?: string;
  fields: FieldDef[];
  listColumns: { field: string; label: string }[];
  /** Child-table image list (packages/vehicles/hotels) vs. single imageId column. */
  imagesField?: "images";
  /** Public URL used for "view on site" and SEO (null = appears only inside sections). */
  publicPath?: (row: { slug?: string; hasDetailPage?: boolean }) => string | null;
  hasSeo?: boolean;
  help?: string;
};

const position: FieldDef = { name: "position", label: "Display order (lower first)", type: "number", min: 0, max: 9999 };
const slug: FieldDef = { name: "slug", label: "URL slug", type: "text", max: 160, help: "Lowercase letters, numbers and hyphens. Leave blank to generate." };
const whatsappMessage: FieldDef = {
  name: "whatsappMessage",
  label: "Prefilled WhatsApp message",
  type: "text",
  max: 300,
  help: "Used when the booking button opens WhatsApp.",
};

export const ENTITIES: Record<EntityKey, EntityDef> = {
  packages: {
    key: "packages",
    label: "Packages",
    singular: "Package",
    titleField: "name",
    slugFrom: "name",
    imagesField: "images",
    hasSeo: true,
    publicPath: (r) => (r.hasDetailPage && r.slug ? `/packages/${r.slug}/` : null),
    help: "Prices are shown exactly as entered. Leave the amount empty and use “Price text” for wording such as “Custom Pricing”.",
    listColumns: [
      { field: "name", label: "Name" },
      { field: "priceDisplay", label: "Price" },
      { field: "durationLabel", label: "Duration" },
    ],
    fields: [
      { name: "name", label: "Package name", type: "text", required: true, max: 160 },
      slug,
      { name: "summary", label: "Card summary / stops", type: "text", max: 500 },
      { name: "durationLabel", label: "Duration label (e.g. Full Day)", type: "text", max: 60 },
      { name: "stopsLabel", label: "Second chip (e.g. 5 Stops)", type: "text", max: 60 },
      { name: "badge", label: "Badge (e.g. Popular)", type: "text", max: 40 },
      { name: "pricePrefix", label: "Price prefix (e.g. Starts From)", type: "text", max: 40 },
      { name: "priceAmount", label: "Price amount (₹)", type: "number", min: 0, step: 1 },
      { name: "priceSuffix", label: "Price unit (e.g. /Person)", type: "text", max: 40 },
      { name: "priceText", label: "Price text when no amount (e.g. Custom Pricing)", type: "text", max: 80 },
      { name: "images", label: "Images (first is the card image)", type: "mediaList" },
      { name: "destination", label: "Destination / region", type: "text", max: 160 },
      { name: "description", label: "Detail page description", type: "textarea", max: 10000, rows: 6 },
      { name: "highlights", label: "Highlights", type: "stringList" },
      { name: "itinerary", label: "Itinerary", type: "repeater", itemLabel: "Stop", fields: [{ name: "title", label: "Title", type: "text", required: true, max: 160 }, { name: "text", label: "Details", type: "textarea", max: 1000 }] },
      { name: "inclusions", label: "Inclusions", type: "stringList" },
      { name: "exclusions", label: "Exclusions", type: "stringList" },
      { name: "ctaLabel", label: "Booking button label", type: "text", max: 60 },
      whatsappMessage,
      { name: "hasDetailPage", label: "Publish a detail page for this package", type: "boolean", help: "Only enable when itinerary/inclusions have been supplied by the business." },
      { name: "isFeatured", label: "Featured", type: "boolean" },
      position,
      { name: "notes", label: "Internal notes (not shown publicly)", type: "textarea", max: 4000, rows: 3 },
    ],
  },
  services: {
    key: "services",
    label: "Services",
    singular: "Service",
    titleField: "title",
    slugFrom: "title",
    listColumns: [
      { field: "title", label: "Title" },
      { field: "summary", label: "Summary" },
    ],
    fields: [
      { name: "title", label: "Title", type: "text", required: true, max: 120 },
      slug,
      { name: "category", label: "Category", type: "text", max: 60 },
      { name: "summary", label: "Summary", type: "textarea", max: 500, rows: 2 },
      { name: "features", label: "Feature bullets", type: "stringList" },
      { name: "icon", label: "Icon", type: "select", options: ICON_OPTIONS() },
      { name: "imageId", label: "Image (optional)", type: "media" },
      { name: "ctaLabel", label: "Booking button label", type: "text", max: 60 },
      whatsappMessage,
      position,
    ],
  },
  vehicles: {
    key: "vehicles",
    label: "Fleet",
    singular: "Vehicle",
    titleField: "name",
    slugFrom: "name",
    imagesField: "images",
    help: "Fares are shown exactly as entered. Only enter specifications and rates confirmed by the business.",
    hasSeo: true,
    publicPath: (r) => (r.hasDetailPage && r.slug ? `/taxi-services/${r.slug}/` : null),
    listColumns: [
      { field: "name", label: "Vehicle" },
      { field: "seatsLabel", label: "Seats" },
      { field: "fareSummary", label: "Fares" },
    ],
    fields: [
      { name: "name", label: "Card name (e.g. Dzire)", type: "text", required: true, max: 80 },
      slug,
      { name: "fullName", label: "Full name (e.g. Maruti Dzire)", type: "text", max: 120 },
      { name: "seatsLabel", label: "Seats label (e.g. 4 Seater)", type: "text", max: 40 },
      { name: "seats", label: "Seating capacity (number)", type: "number", min: 1, max: 60 },
      { name: "vehicleClass", label: "Class (e.g. Sedan)", type: "text", max: 60 },
      { name: "airportLabel", label: "Airport card subtitle (e.g. 4 Seater Sedan)", type: "text", max: 80 },
      { name: "luggage", label: "Luggage capacity (only if verified)", type: "text", max: 80 },
      { name: "badge", label: "Card badge (e.g. BOARDING PASS)", type: "text", max: 40 },
      { name: "images", label: "Images (first is the card image)", type: "mediaList" },
      {
        name: "fares",
        label: "Fares",
        type: "repeater",
        itemLabel: "Fare",
        fields: [
          { name: "fareType", label: "Fare type", type: "select", options: FARE_TYPE_OPTIONS },
          { name: "label", label: "Label (e.g. Airport Pickup)", type: "text", max: 60 },
          { name: "amount", label: "Amount (₹)", type: "number", required: true, min: 0 },
          { name: "unitLabel", label: "Unit (e.g. / Hour)", type: "text", max: 40 },
          { name: "notes", label: "Notes", type: "text", max: 255 },
        ],
      },
      { name: "features", label: "Fleet card features", type: "stringList" },
      { name: "airportFeatures", label: "Airport card features", type: "stringList" },
      { name: "description", label: "Detail page description (optional extra text)", type: "textarea", max: 10000, rows: 6, help: "Shown on the vehicle’s own page. Use a blank line between paragraphs, “## ” for a heading and “- ” for bullet points." },
      { name: "hasDetailPage", label: "Show a detail page for this vehicle", type: "boolean", help: "The fleet card then links to /taxi-services/<slug>/ with fares, features and its own SEO." },
      whatsappMessage,
      position,
    ],
  },
  hotels: {
    key: "hotels",
    label: "Hotels",
    singular: "Hotel",
    titleField: "name",
    slugFrom: "name",
    imagesField: "images",
    help: "Only list facilities and prices verified or supplied by the business.",
    listColumns: [
      { field: "name", label: "Hotel" },
      { field: "priceDisplay", label: "Price" },
    ],
    fields: [
      { name: "name", label: "Hotel name", type: "text", required: true, max: 160 },
      slug,
      { name: "location", label: "Location", type: "text", max: 160 },
      { name: "category", label: "Category", type: "text", max: 60 },
      { name: "description", label: "Description", type: "textarea", required: true, max: 4000, rows: 4 },
      { name: "pricePrefix", label: "Price prefix (e.g. Starting From)", type: "text", max: 40 },
      { name: "priceAmount", label: "Price amount (₹)", type: "number", min: 0 },
      { name: "priceUnit", label: "Price unit (e.g. / night) — confirm with business", type: "text", max: 40 },
      { name: "amenities", label: "Facilities", type: "stringList" },
      { name: "images", label: "Images", type: "mediaList" },
      whatsappMessage,
      position,
    ],
  },
  destinations: {
    key: "destinations",
    label: "Destinations",
    singular: "Destination",
    titleField: "title",
    slugFrom: "title",
    listColumns: [
      { field: "title", label: "Title" },
      { field: "summary", label: "Summary" },
    ],
    fields: [
      { name: "title", label: "Title", type: "text", required: true, max: 120 },
      slug,
      { name: "summary", label: "Summary", type: "textarea", max: 500, rows: 2 },
      { name: "imageId", label: "Image", type: "media" },
      position,
    ],
  },
  testimonials: {
    key: "testimonials",
    label: "Testimonials",
    singular: "Testimonial",
    titleField: "authorName",
    help: "Never publish invented reviews. Star ratings and review markup only appear for testimonials marked as verified.",
    listColumns: [
      { field: "authorName", label: "Author" },
      { field: "authorLocation", label: "Location" },
      { field: "verifiedDisplay", label: "Verified" },
    ],
    fields: [
      { name: "authorName", label: "Customer name", type: "text", required: true, max: 120 },
      { name: "authorLocation", label: "Location", type: "text", max: 120 },
      { name: "quote", label: "Review text", type: "textarea", required: true, max: 2000, rows: 4 },
      { name: "rating", label: "Rating (1–5, only if given by the customer)", type: "number", min: 1, max: 5 },
      { name: "reviewDate", label: "Review date (YYYY-MM-DD)", type: "text", max: 10 },
      { name: "source", label: "Source (e.g. Google, WhatsApp, direct)", type: "text", max: 60 },
      { name: "isVerified", label: "Verified genuine customer review (permission to publish obtained)", type: "boolean" },
      position,
    ],
  },
  posts: {
    key: "posts",
    label: "Blog posts",
    singular: "Blog post",
    titleField: "title",
    slugFrom: "title",
    hasSeo: true,
    publicPath: (r) => (r.slug ? `/blog/${r.slug}/` : null),
    help: "Write real, useful articles. Posts appear on /blog/ once published, and each has its own SEO settings below.",
    listColumns: [
      { field: "title", label: "Title" },
      { field: "category", label: "Category" },
    ],
    fields: [
      { name: "title", label: "Title", type: "text", required: true, max: 200 },
      slug,
      { name: "excerpt", label: "Short summary (shown on the blog list and as default meta description)", type: "textarea", max: 500, rows: 2 },
      { name: "imageId", label: "Cover image", type: "media" },
      { name: "category", label: "Category", type: "text", max: 60 },
      { name: "authorName", label: "Author name", type: "text", max: 120 },
      { name: "body", label: "Article", type: "textarea", required: true, max: 50000, rows: 16, help: "Blank line between paragraphs · “## ” starts a heading · “### ” a sub-heading · “- ” makes a bullet list." },
      position,
    ],
  },
  faqs: {
    key: "faqs",
    label: "FAQs",
    singular: "FAQ",
    titleField: "question",
    listColumns: [
      { field: "question", label: "Question" },
      { field: "category", label: "Category" },
    ],
    fields: [
      { name: "question", label: "Question", type: "text", required: true, max: 300 },
      { name: "answer", label: "Answer", type: "textarea", required: true, max: 4000, rows: 4 },
      { name: "category", label: "Category", type: "text", max: 60, help: "FAQ sections show one category (e.g. general)." },
      position,
    ],
  },
};

export const ENTITY_KEYS = Object.keys(ENTITIES) as EntityKey[];
export function isEntityKey(k: string): k is EntityKey {
  return k in ENTITIES;
}

function ICON_OPTIONS() {
  return [
    "plane-takeoff", "train-front", "bus", "car-taxi-front", "hotel", "umbrella", "ship", "briefcase",
    "map-pinned", "wallet", "shield-check", "headset", "sparkles", "car", "palmtree", "camera",
  ].map((v) => ({ value: v, label: v }));
}
