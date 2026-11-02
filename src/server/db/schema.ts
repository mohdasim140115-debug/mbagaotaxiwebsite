import {
  bigint,
  boolean,
  char,
  datetime,
  decimal,
  index,
  int,
  json,
  mysqlTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  varchar,
  type AnyMySqlColumn,
} from "@/server/db/orm";
import { sql } from "@/server/db/orm";

const id = () => bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey();
const fk = (name: string) => bigint(name, { mode: "number", unsigned: true });
const createdAt = () => timestamp("created_at", { mode: "date" }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { mode: "date" }).notNull().default(sql`CURRENT_TIMESTAMP`).onUpdateNow();

export const STATUSES = ["draft", "published", "archived"] as const;
export type Status = (typeof STATUSES)[number];
const status = () => varchar("status", { length: 16, enum: STATUSES }).notNull().default("draft");

// Columns shared by every editable content table: optimistic locking + authorship.
const editable = () => ({
  version: int("version").notNull().default(1),
  createdBy: fk("created_by").references(() => adminUsers.id, { onDelete: "set null" }),
  updatedBy: fk("updated_by").references(() => adminUsers.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/* ------------------------------------------------------------------ access */

export const roles = mysqlTable("roles", {
  key: varchar("key", { length: 32 }).primaryKey(),
  name: varchar("name", { length: 64 }).notNull(),
  description: varchar("description", { length: 255 }).notNull().default(""),
});

export const permissions = mysqlTable("permissions", {
  key: varchar("key", { length: 64 }).primaryKey(),
  description: varchar("description", { length: 255 }).notNull().default(""),
});

export const rolePermissions = mysqlTable(
  "role_permissions",
  {
    roleKey: varchar("role_key", { length: 32 })
      .notNull()
      .references(() => roles.key, { onDelete: "cascade" }),
    permissionKey: varchar("permission_key", { length: 64 })
      .notNull()
      .references(() => permissions.key, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.roleKey, t.permissionKey] })],
);

export const adminUsers = mysqlTable(
  "admin_users",
  {
    id: id(),
    email: varchar("email", { length: 191 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    roleKey: varchar("role_key", { length: 32 })
      .notNull()
      .references(() => roles.key, { onDelete: "restrict" }),
    isActive: boolean("is_active").notNull().default(true),
    failedLogins: int("failed_logins").notNull().default(0),
    lockedUntil: datetime("locked_until", { mode: "date" }),
    lastLoginAt: datetime("last_login_at", { mode: "date" }),
    passwordChangedAt: datetime("password_changed_at", { mode: "date" }),
    mustChangePassword: boolean("must_change_password").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("admin_users_email_uq").on(t.email)],
);

export const adminSessions = mysqlTable(
  "admin_sessions",
  {
    id: id(),
    userId: fk("user_id")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),
    tokenHash: char("token_hash", { length: 64 }).notNull(),
    ip: varchar("ip", { length: 64 }),
    userAgent: varchar("user_agent", { length: 255 }),
    createdAt: createdAt(),
    lastSeenAt: datetime("last_seen_at", { mode: "date" }).notNull(),
    expiresAt: datetime("expires_at", { mode: "date" }).notNull(),
    revokedAt: datetime("revoked_at", { mode: "date" }),
  },
  (t) => [uniqueIndex("admin_sessions_token_uq").on(t.tokenHash), index("admin_sessions_user_idx").on(t.userId)],
);

export const passwordResetTokens = mysqlTable(
  "password_reset_tokens",
  {
    id: id(),
    userId: fk("user_id")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),
    tokenHash: char("token_hash", { length: 64 }).notNull(),
    expiresAt: datetime("expires_at", { mode: "date" }).notNull(),
    usedAt: datetime("used_at", { mode: "date" }),
    createdBy: fk("created_by").references(() => adminUsers.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("password_reset_token_uq").on(t.tokenHash)],
);

export const loginAttempts = mysqlTable(
  "login_attempts",
  {
    id: id(),
    email: varchar("email", { length: 191 }).notNull(),
    ipHash: char("ip_hash", { length: 64 }).notNull(),
    success: boolean("success").notNull(),
    reason: varchar("reason", { length: 64 }),
    createdAt: createdAt(),
  },
  (t) => [index("login_attempts_ip_idx").on(t.ipHash, t.createdAt), index("login_attempts_email_idx").on(t.email, t.createdAt)],
);

export const auditLogs = mysqlTable(
  "audit_logs",
  {
    id: id(),
    userId: fk("user_id").references(() => adminUsers.id, { onDelete: "set null" }),
    action: varchar("action", { length: 64 }).notNull(),
    entityType: varchar("entity_type", { length: 48 }),
    entityId: varchar("entity_id", { length: 64 }),
    summary: varchar("summary", { length: 500 }).notNull().default(""),
    ipHash: char("ip_hash", { length: 64 }),
    createdAt: createdAt(),
  },
  (t) => [index("audit_entity_idx").on(t.entityType, t.entityId), index("audit_created_idx").on(t.createdAt)],
);

/* ------------------------------------------------------------------ media */

export const LICENCE_STATUSES = ["owner", "licensed", "pending", "do_not_use"] as const;

export const media = mysqlTable(
  "media",
  {
    id: id(),
    filename: varchar("filename", { length: 191 }).notNull(),
    storageKey: varchar("storage_key", { length: 191 }).notNull(),
    mime: varchar("mime", { length: 64 }).notNull(),
    bytes: int("bytes").notNull(),
    width: int("width").notNull(),
    height: int("height").notNull(),
    altText: varchar("alt_text", { length: 300 }).notNull().default(""),
    caption: varchar("caption", { length: 300 }).notNull().default(""),
    credit: varchar("credit", { length: 300 }).notNull().default(""),
    licenceStatus: varchar("licence_status", { length: 16, enum: LICENCE_STATUSES }).notNull().default("pending"),
    sourceUrl: varchar("source_url", { length: 1000 }),
    sha256: char("sha256", { length: 64 }).notNull(),
    ...editable(),
  },
  (t) => [uniqueIndex("media_storage_key_uq").on(t.storageKey), index("media_sha_idx").on(t.sha256)],
);

export const mediaUsages = mysqlTable(
  "media_usages",
  {
    id: id(),
    mediaId: fk("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    entityType: varchar("entity_type", { length: 48 }).notNull(),
    entityId: bigint("entity_id", { mode: "number", unsigned: true }).notNull(),
    field: varchar("field", { length: 64 }).notNull(),
  },
  (t) => [
    index("media_usage_media_idx").on(t.mediaId),
    uniqueIndex("media_usage_uq").on(t.entityType, t.entityId, t.field, t.mediaId),
  ],
);

/* ------------------------------------------------------------------ pages */

export const pages = mysqlTable(
  "pages",
  {
    id: id(),
    path: varchar("path", { length: 191 }).notNull(),
    title: varchar("title", { length: 191 }).notNull(),
    template: varchar("template", { length: 32 }).notNull().default("generic"),
    status: status(),
    isSystem: boolean("is_system").notNull().default(false),
    publishedAt: datetime("published_at", { mode: "date" }),
    scheduledAt: datetime("scheduled_at", { mode: "date" }),
    // Snapshot of {title, sections[]} served publicly; the working copy lives in page_sections.
    publishedData: json("published_data"),
    hasUnpublishedChanges: boolean("has_unpublished_changes").notNull().default(false),
    sourceUrl: varchar("source_url", { length: 500 }),
    ...editable(),
  },
  (t) => [uniqueIndex("pages_path_uq").on(t.path), index("pages_status_idx").on(t.status)],
);

export const pageSections = mysqlTable(
  "page_sections",
  {
    id: id(),
    pageId: fk("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 32 }).notNull(),
    position: int("position").notNull(),
    isEnabled: boolean("is_enabled").notNull().default(true),
    data: json("data").notNull(),
  },
  (t) => [index("page_sections_page_idx").on(t.pageId, t.position)],
);

export const contentRevisions = mysqlTable(
  "content_revisions",
  {
    id: id(),
    entityType: varchar("entity_type", { length: 48 }).notNull(),
    entityId: bigint("entity_id", { mode: "number", unsigned: true }).notNull(),
    version: int("version").notNull(),
    snapshot: json("snapshot").notNull(),
    changeSummary: varchar("change_summary", { length: 300 }).notNull().default(""),
    editorId: fk("editor_id").references(() => adminUsers.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("revisions_entity_idx").on(t.entityType, t.entityId, t.version)],
);

export const seoMetadata = mysqlTable(
  "seo_metadata",
  {
    id: id(),
    entityType: varchar("entity_type", { length: 48 }).notNull(),
    entityId: bigint("entity_id", { mode: "number", unsigned: true }).notNull(),
    metaTitle: varchar("meta_title", { length: 191 }).notNull().default(""),
    metaDescription: varchar("meta_description", { length: 320 }).notNull().default(""),
    canonicalUrl: varchar("canonical_url", { length: 500 }).notNull().default(""),
    robotsIndex: boolean("robots_index").notNull().default(true),
    robotsFollow: boolean("robots_follow").notNull().default(true),
    ogTitle: varchar("og_title", { length: 191 }).notNull().default(""),
    ogDescription: varchar("og_description", { length: 320 }).notNull().default(""),
    ogImageId: fk("og_image_id").references(() => media.id, { onDelete: "set null" }),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("seo_entity_uq").on(t.entityType, t.entityId)],
);

export const navigationItems = mysqlTable(
  "navigation_items",
  {
    id: id(),
    menu: varchar("menu", { length: 16, enum: ["header", "footer", "legal"] }).notNull(),
    parentId: fk("parent_id").references((): AnyMySqlColumn => navigationItems.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 80 }).notNull(),
    href: varchar("href", { length: 500 }).notNull(),
    position: int("position").notNull().default(0),
    isVisible: boolean("is_visible").notNull().default(true),
    openInNewTab: boolean("open_in_new_tab").notNull().default(false),
    ...editable(),
  },
  (t) => [index("nav_menu_idx").on(t.menu, t.parentId, t.position)],
);

/* ------------------------------------------------------------------ catalogue */

export const packages = mysqlTable(
  "packages",
  {
    id: id(),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 160 }).notNull(),
    summary: varchar("summary", { length: 500 }).notNull().default(""),
    description: text("description").notNull(),
    destination: varchar("destination", { length: 160 }).notNull().default(""),
    durationLabel: varchar("duration_label", { length: 60 }).notNull().default(""),
    stopsLabel: varchar("stops_label", { length: 60 }).notNull().default(""),
    pricePrefix: varchar("price_prefix", { length: 40 }).notNull().default(""),
    priceAmount: decimal("price_amount", { precision: 10, scale: 2, mode: "number" }),
    priceSuffix: varchar("price_suffix", { length: 40 }).notNull().default(""),
    priceText: varchar("price_text", { length: 80 }).notNull().default(""),
    badge: varchar("badge", { length: 40 }).notNull().default(""),
    highlights: json("highlights").$type<string[]>().notNull(),
    itinerary: json("itinerary").$type<{ title: string; text: string }[]>().notNull(),
    inclusions: json("inclusions").$type<string[]>().notNull(),
    exclusions: json("exclusions").$type<string[]>().notNull(),
    ctaLabel: varchar("cta_label", { length: 60 }).notNull().default("Book"),
    whatsappMessage: varchar("whatsapp_message", { length: 300 }).notNull().default(""),
    hasDetailPage: boolean("has_detail_page").notNull().default(false),
    isFeatured: boolean("is_featured").notNull().default(false),
    position: int("position").notNull().default(0),
    status: status(),
    notes: text("notes"),
    sourceUrl: varchar("source_url", { length: 500 }),
    ...editable(),
  },
  (t) => [uniqueIndex("packages_slug_uq").on(t.slug), index("packages_status_idx").on(t.status, t.position)],
);

export const packageImages = mysqlTable(
  "package_images",
  {
    packageId: fk("package_id")
      .notNull()
      .references(() => packages.id, { onDelete: "cascade" }),
    mediaId: fk("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "restrict" }),
    position: int("position").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.packageId, t.mediaId] })],
);

export const services = mysqlTable(
  "services",
  {
    id: id(),
    title: varchar("title", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull(),
    category: varchar("category", { length: 60 }).notNull().default(""),
    summary: varchar("summary", { length: 500 }).notNull().default(""),
    features: json("features").$type<string[]>().notNull(),
    icon: varchar("icon", { length: 40 }).notNull().default("sparkles"),
    imageId: fk("image_id").references(() => media.id, { onDelete: "set null" }),
    ctaLabel: varchar("cta_label", { length: 60 }).notNull().default("Book Now"),
    whatsappMessage: varchar("whatsapp_message", { length: 300 }).notNull().default(""),
    position: int("position").notNull().default(0),
    status: status(),
    sourceUrl: varchar("source_url", { length: 500 }),
    ...editable(),
  },
  (t) => [uniqueIndex("services_slug_uq").on(t.slug)],
);

export const vehicles = mysqlTable(
  "vehicles",
  {
    id: id(),
    name: varchar("name", { length: 80 }).notNull(),
    slug: varchar("slug", { length: 80 }).notNull(),
    fullName: varchar("full_name", { length: 120 }).notNull().default(""),
    vehicleClass: varchar("vehicle_class", { length: 60 }).notNull().default(""),
    seatsLabel: varchar("seats_label", { length: 40 }).notNull().default(""),
    seats: int("seats"),
    airportLabel: varchar("airport_label", { length: 80 }).notNull().default(""),
    luggage: varchar("luggage", { length: 80 }).notNull().default(""),
    badge: varchar("badge", { length: 40 }).notNull().default(""),
    features: json("features").$type<string[]>().notNull(),
    airportFeatures: json("airport_features").$type<string[]>().notNull(),
    whatsappMessage: varchar("whatsapp_message", { length: 300 }).notNull().default(""),
    description: text("description"),
    hasDetailPage: boolean("has_detail_page").notNull().default(false),
    position: int("position").notNull().default(0),
    status: status(),
    sourceUrl: varchar("source_url", { length: 500 }),
    ...editable(),
  },
  (t) => [uniqueIndex("vehicles_slug_uq").on(t.slug)],
);

export const posts = mysqlTable(
  "posts",
  {
    id: id(),
    title: varchar("title", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 200 }).notNull(),
    excerpt: varchar("excerpt", { length: 500 }).notNull().default(""),
    body: text("body"),
    imageId: fk("image_id").references(() => media.id, { onDelete: "set null" }),
    category: varchar("category", { length: 60 }).notNull().default(""),
    authorName: varchar("author_name", { length: 120 }).notNull().default(""),
    publishedAt: datetime("published_at", { mode: "date" }),
    position: int("position").notNull().default(0),
    status: status(),
    ...editable(),
  },
  (t) => [uniqueIndex("posts_slug_uq").on(t.slug), index("posts_status_idx").on(t.status, t.publishedAt)],
);

export const FARE_TYPES = ["airport_transfer", "package_8h_80km", "extra_hour", "extra_km", "outstation", "other"] as const;

export const vehicleFares = mysqlTable(
  "vehicle_fares",
  {
    id: id(),
    vehicleId: fk("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    fareType: varchar("fare_type", { length: 24, enum: FARE_TYPES }).notNull(),
    label: varchar("label", { length: 60 }).notNull().default(""),
    amount: decimal("amount", { precision: 10, scale: 2, mode: "number" }).notNull(),
    unitLabel: varchar("unit_label", { length: 40 }).notNull().default(""),
    notes: varchar("notes", { length: 255 }).notNull().default(""),
    position: int("position").notNull().default(0),
  },
  (t) => [uniqueIndex("vehicle_fare_uq").on(t.vehicleId, t.fareType)],
);

export const vehicleImages = mysqlTable(
  "vehicle_images",
  {
    vehicleId: fk("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    mediaId: fk("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "restrict" }),
    position: int("position").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.vehicleId, t.mediaId] })],
);

export const hotels = mysqlTable(
  "hotels",
  {
    id: id(),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 160 }).notNull(),
    location: varchar("location", { length: 160 }).notNull().default(""),
    category: varchar("category", { length: 60 }).notNull().default(""),
    description: text("description").notNull(),
    pricePrefix: varchar("price_prefix", { length: 40 }).notNull().default(""),
    priceAmount: decimal("price_amount", { precision: 10, scale: 2, mode: "number" }),
    priceUnit: varchar("price_unit", { length: 40 }).notNull().default(""),
    amenities: json("amenities").$type<string[]>().notNull(),
    whatsappMessage: varchar("whatsapp_message", { length: 300 }).notNull().default(""),
    position: int("position").notNull().default(0),
    status: status(),
    sourceUrl: varchar("source_url", { length: 500 }),
    ...editable(),
  },
  (t) => [uniqueIndex("hotels_slug_uq").on(t.slug)],
);

export const hotelImages = mysqlTable(
  "hotel_images",
  {
    hotelId: fk("hotel_id")
      .notNull()
      .references(() => hotels.id, { onDelete: "cascade" }),
    mediaId: fk("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "restrict" }),
    position: int("position").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.hotelId, t.mediaId] })],
);

export const destinations = mysqlTable(
  "destinations",
  {
    id: id(),
    title: varchar("title", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull(),
    summary: varchar("summary", { length: 500 }).notNull().default(""),
    imageId: fk("image_id").references(() => media.id, { onDelete: "set null" }),
    position: int("position").notNull().default(0),
    status: status(),
    sourceUrl: varchar("source_url", { length: 500 }),
    ...editable(),
  },
  (t) => [uniqueIndex("destinations_slug_uq").on(t.slug)],
);

export const testimonials = mysqlTable("testimonials", {
  id: id(),
  authorName: varchar("author_name", { length: 120 }).notNull(),
  authorLocation: varchar("author_location", { length: 120 }).notNull().default(""),
  quote: text("quote").notNull(),
  rating: int("rating"),
  reviewDate: datetime("review_date", { mode: "date" }),
  source: varchar("source", { length: 60 }).notNull().default(""),
  isVerified: boolean("is_verified").notNull().default(false),
  position: int("position").notNull().default(0),
  status: status(),
  sourceUrl: varchar("source_url", { length: 500 }),
  ...editable(),
});

export const faqs = mysqlTable(
  "faqs",
  {
    id: id(),
    question: varchar("question", { length: 300 }).notNull(),
    answer: text("answer").notNull(),
    category: varchar("category", { length: 60 }).notNull().default("general"),
    position: int("position").notNull().default(0),
    status: status(),
    sourceUrl: varchar("source_url", { length: 500 }),
    ...editable(),
  },
  (t) => [index("faqs_category_idx").on(t.category, t.position)],
);

/* ------------------------------------------------------------------ leads */

export const ENQUIRY_STATUSES = ["new", "contacted", "quoted", "booked", "closed", "spam"] as const;

export const enquiries = mysqlTable(
  "enquiries",
  {
    id: id(),
    type: varchar("type", { length: 24 }).notNull().default("general"),
    name: varchar("name", { length: 120 }).notNull().default(""),
    phone: varchar("phone", { length: 32 }).notNull(),
    email: varchar("email", { length: 191 }).notNull().default(""),
    travelDate: varchar("travel_date", { length: 32 }).notNull().default(""),
    pickup: varchar("pickup", { length: 191 }).notNull().default(""),
    dropoff: varchar("dropoff", { length: 191 }).notNull().default(""),
    travellers: int("travellers"),
    subject: varchar("subject", { length: 191 }).notNull().default(""),
    message: text("message").notNull(),
    landingPage: varchar("landing_page", { length: 500 }).notNull().default(""),
    referrer: varchar("referrer", { length: 500 }).notNull().default(""),
    utmSource: varchar("utm_source", { length: 120 }).notNull().default(""),
    utmMedium: varchar("utm_medium", { length: 120 }).notNull().default(""),
    utmCampaign: varchar("utm_campaign", { length: 120 }).notNull().default(""),
    utmTerm: varchar("utm_term", { length: 120 }).notNull().default(""),
    utmContent: varchar("utm_content", { length: 120 }).notNull().default(""),
    consentAt: datetime("consent_at", { mode: "date" }),
    status: varchar("status", { length: 16, enum: ENQUIRY_STATUSES }).notNull().default("new"),
    isRead: boolean("is_read").notNull().default(false),
    assignedTo: fk("assigned_to").references(() => adminUsers.id, { onDelete: "set null" }),
    duplicateOf: fk("duplicate_of").references((): AnyMySqlColumn => enquiries.id, { onDelete: "set null" }),
    ipHash: char("ip_hash", { length: 64 }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("enquiries_status_idx").on(t.status, t.createdAt), index("enquiries_phone_idx").on(t.phone)],
);

export const enquiryNotes = mysqlTable("enquiry_notes", {
  id: id(),
  enquiryId: fk("enquiry_id")
    .notNull()
    .references(() => enquiries.id, { onDelete: "cascade" }),
  authorId: fk("author_id").references(() => adminUsers.id, { onDelete: "set null" }),
  body: text("body").notNull(),
  createdAt: createdAt(),
});

export const enquiryEvents = mysqlTable("enquiry_events", {
  id: id(),
  enquiryId: fk("enquiry_id")
    .notNull()
    .references(() => enquiries.id, { onDelete: "cascade" }),
  userId: fk("user_id").references(() => adminUsers.id, { onDelete: "set null" }),
  event: varchar("event", { length: 32 }).notNull(),
  fromValue: varchar("from_value", { length: 120 }).notNull().default(""),
  toValue: varchar("to_value", { length: 120 }).notNull().default(""),
  createdAt: createdAt(),
});

/* ------------------------------------------------------------------ configuration */

export const redirects = mysqlTable(
  "redirects",
  {
    id: id(),
    sourcePath: varchar("source_path", { length: 191 }).notNull(),
    destination: varchar("destination", { length: 500 }).notNull().default(""),
    statusCode: int("status_code").notNull().default(301),
    isActive: boolean("is_active").notNull().default(true),
    hits: int("hits").notNull().default(0),
    lastHitAt: datetime("last_hit_at", { mode: "date" }),
    note: varchar("note", { length: 300 }).notNull().default(""),
    ...editable(),
  },
  (t) => [uniqueIndex("redirects_source_uq").on(t.sourcePath)],
);

export const siteSettings = mysqlTable("site_settings", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: json("value"),
  isPublic: boolean("is_public").notNull().default(true),
  updatedBy: fk("updated_by").references(() => adminUsers.id, { onDelete: "set null" }),
  updatedAt: updatedAt(),
});

export const ANALYTICS_PROVIDERS = ["ga4", "gtm", "google_ads", "meta_pixel", "gsc_verification"] as const;

export const analyticsConfiguration = mysqlTable(
  "analytics_configuration",
  {
    id: id(),
    provider: varchar("provider", { length: 24, enum: ANALYTICS_PROVIDERS }).notNull(),
    publicId: varchar("public_id", { length: 120 }).notNull().default(""),
    conversionLabel: varchar("conversion_label", { length: 120 }).notNull().default(""),
    isEnabled: boolean("is_enabled").notNull().default(false),
    requiresConsent: boolean("requires_consent").notNull().default(true),
    updatedBy: fk("updated_by").references(() => adminUsers.id, { onDelete: "set null" }),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("analytics_provider_uq").on(t.provider)],
);

export const rateLimits = mysqlTable(
  "rate_limits",
  {
    bucket: varchar("bucket", { length: 32 }).notNull(),
    key: char("key", { length: 64 }).notNull(),
    count: int("count").notNull().default(0),
    windowStart: datetime("window_start", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.bucket, t.key] })],
);

export const migrationMap = mysqlTable(
  "migration_map",
  {
    id: id(),
    sourceUrl: varchar("source_url", { length: 500 }).notNull(),
    sourceRef: varchar("source_ref", { length: 300 }).notNull().default(""),
    entityType: varchar("entity_type", { length: 48 }).notNull(),
    entityId: bigint("entity_id", { mode: "number", unsigned: true }),
    status: varchar("status", { length: 24 }).notNull().default("migrated"),
    discrepancy: text("discrepancy"),
    approvalRequired: boolean("approval_required").notNull().default(false),
    verifiedAt: datetime("verified_at", { mode: "date" }),
    createdAt: createdAt(),
  },
  (t) => [index("migration_entity_idx").on(t.entityType, t.entityId)],
);
