import { z } from "zod";

/**
 * Global site settings. Defaults are taken from the live site (docs/source-snapshot):
 * the phone/WhatsApp number +91 93220 73068 is the one used by tel: links, the schema.org
 * telephone and the Contact page's "verified business WhatsApp number" link. Conflicting
 * numbers found elsewhere on the old site are recorded in docs/open-questions.md (Q1).
 */
export const settingsSchema = z.object({
  businessName: z.string().trim().min(1).max(120).default("MBA Travels Goa"),
  legalName: z.string().trim().max(160).default("MBA Travels Goa"),
  alternateName: z.string().trim().max(160).default("MBA Taxi wala Goa"),
  tagline: z.string().trim().max(200).default(""),
  logoMediaId: z.number().int().positive().nullable().default(null),
  faviconMediaId: z.number().int().positive().nullable().default(null),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ]{8,20}$/, "Use international format, e.g. +91 93220 73068")
    .default("+91 93220 73068"),
  whatsapp: z
    .string()
    .trim()
    .regex(/^[0-9]{8,15}$/, "Digits only with country code, e.g. 919322073068")
    .default("919322073068"),
  whatsappDefaultMessage: z.string().trim().max(300).default("Hi, I would like to plan my Goa trip."),
  bookingMode: z.enum(["whatsform", "enquiry", "whatsapp"]).default("whatsform"),
  bookingFormUrl: z
    .string()
    .trim()
    .max(300)
    .refine((v) => v === "" || /^https:\/\//.test(v), "Must be an https:// URL")
    .default("https://whatsform.com/kkpjba"),
  email: z.union([z.literal(""), z.string().trim().email()]).default("mbatravels12@gmail.com"),
  showEmail: z.boolean().default(true),
  streetAddress: z.string().trim().max(200).default("Mollembhat"),
  addressLocality: z.string().trim().max(120).default("Saligao"),
  addressRegion: z.string().trim().max(120).default("Goa"),
  postalCode: z.string().trim().max(20).default("403511"),
  addressCountry: z.string().trim().max(2).default("IN"),
  showAddress: z.boolean().default(true),
  openingHoursText: z.string().trim().max(120).default("Open 24×7"),
  openingHoursSchema: z.string().trim().max(200).default("Mo-Su 00:00-23:59"),
  facebookUrl: z.union([z.literal(""), z.string().trim().url()]).default("https://www.facebook.com/share/1BkLm8wkYC/"),
  instagramUrl: z.union([z.literal(""), z.string().trim().url()]).default(""),
  googleBusinessUrl: z.union([z.literal(""), z.string().trim().url()]).default(""),
  footerAbout: z.string().trim().max(600).default(""),
  copyrightText: z.string().trim().max(200).default("Copyright © {year} MBA Travels Goa"),
  titleTemplate: z.string().trim().max(120).default("%s - MBA Travels Goa"),
  defaultMetaDescription: z
    .string()
    .trim()
    .max(320)
    .default(
      "Book reliable Goa taxi service, airport transfers, sightseeing tours and travel services with MBA Travels Goa. Safe, comfortable and affordable Goa travel.",
    ),
  defaultOgImageId: z.number().int().positive().nullable().default(null),
  businessType: z.enum(["TravelAgency", "TaxiService", "LocalBusiness"]).default("TravelAgency"),
  enquiryNotifyEmail: z.union([z.literal(""), z.string().trim().email()]).default(""),
  enquiryRetentionMonths: z.number().int().min(1).max(120).default(24),
  consentText: z
    .string()
    .trim()
    .max(400)
    .default("I agree that MBA Travels Goa may contact me about this enquiry by phone, WhatsApp or email."),
  privacyPolicyPath: z.string().trim().max(200).default(""),
});

export type SiteSettings = z.infer<typeof settingsSchema>;
export const DEFAULT_SETTINGS: SiteSettings = settingsSchema.parse({});

/** Keys that must never be returned to the browser. (Secrets live in env vars, not here.) */
export const PRIVATE_SETTING_KEYS = ["enquiryNotifyEmail", "enquiryRetentionMonths"] as const;
export type PublicSettings = Omit<SiteSettings, (typeof PRIVATE_SETTING_KEYS)[number]>;

export function telHref(phone: string) {
  return `tel:${phone.replace(/[^0-9+]/g, "")}`;
}

export function whatsappHref(number: string, message?: string) {
  const base = `https://wa.me/${number.replace(/[^0-9]/g, "")}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
