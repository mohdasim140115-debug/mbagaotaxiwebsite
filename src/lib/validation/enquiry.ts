import { z } from "zod";

export const ENQUIRY_TYPES = ["general", "taxi", "airport", "package", "hotel"] as const;

const optionalText = (max: number) => z.string().trim().max(max).default("");

/** Shared by the browser form and the API route, so both validate identically. */
export const enquirySchema = z.object({
  type: z.enum(ENQUIRY_TYPES).default("general"),
  name: z.string().trim().max(120, "Name is too long").default(""),
  phone: z
    .string()
    .trim()
    .min(1, "Please enter your phone number")
    .max(32)
    .refine((v) => /^\+?[0-9\s\-()]+$/.test(v), "Use digits only, e.g. +91 98765 43210")
    .refine((v) => {
      const digits = v.replace(/\D/g, "").length;
      return digits >= 8 && digits <= 15;
    }, "Enter a valid phone number with 8–15 digits"),
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email address").max(191)]).default(""),
  travelDate: optionalText(32),
  pickup: optionalText(191),
  dropoff: optionalText(191),
  travellers: z
    .union([z.literal(""), z.coerce.number().int().min(1, "At least 1").max(99, "Maximum 99")])
    .default(""),
  subject: optionalText(191),
  message: optionalText(2000),
  consent: z.literal(true, { error: "Please confirm we may contact you about this enquiry" }),
  // Attribution (first-touch, captured in the browser)
  landingPage: optionalText(500),
  referrer: optionalText(500),
  utmSource: optionalText(120),
  utmMedium: optionalText(120),
  utmCampaign: optionalText(120),
  utmTerm: optionalText(120),
  utmContent: optionalText(120),
  // Spam controls
  company: z.string().max(0, "Spam detected").default(""), // honeypot: must stay empty
  startedAt: z.coerce.number().int().default(0),
});

export type EnquiryInput = z.input<typeof enquirySchema>;
export type Enquiry = z.output<typeof enquirySchema>;
