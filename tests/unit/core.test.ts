import { describe, expect, it } from "vitest";
import { matchRedirect, normaliseSource, validateRedirect } from "@/lib/redirects";
import { enquirySchema } from "@/lib/validation/enquiry";
import { formatInr, formatPrice } from "@/lib/cms/fares";
import { parseBody, slugify } from "@/lib/utils";
import { resolveCta } from "@/lib/cms/cta";
import { DEFAULT_SETTINGS, whatsappHref } from "@/lib/cms/settings-def";
import { sectionSchema, sectionMediaIds } from "@/lib/cms/sections";
import { fieldsToZod } from "@/lib/cms/fields";
import { ENTITIES } from "@/lib/cms/entities";

describe("redirect validation", () => {
  const others = [
    { sourcePath: "/a/", destination: "/b/", statusCode: 301 },
    { sourcePath: "/b/", destination: "/c/", statusCode: 301 },
  ];
  it("rejects self-redirects", () => {
    expect(validateRedirect({ sourcePath: "/x/", destination: "/x/", statusCode: 301 }, [], [])).toMatch(/itself/);
  });
  it("rejects loops", () => {
    expect(validateRedirect({ sourcePath: "/c/", destination: "/a/", statusCode: 301 }, others, [])).toMatch(/loop/);
  });
  it("rejects chains", () => {
    expect(validateRedirect({ sourcePath: "/z/", destination: "/a/", statusCode: 301 }, others, [])).toMatch(/redirect chain/);
  });
  it("warns when redirecting a live page", () => {
    expect(validateRedirect({ sourcePath: "/about-us/", destination: "/", statusCode: 301 }, [], ["/about-us/"])).toBe("WARN_EXISTING_PAGE");
  });
  it("blocks system paths and allows 410 without destination", () => {
    expect(validateRedirect({ sourcePath: "/admin/x", destination: "/", statusCode: 301 }, [], [])).toMatch(/system/);
    expect(validateRedirect({ sourcePath: "/gone/", destination: "", statusCode: 410 }, [], [])).toBeNull();
  });
  it("normalises full URLs and matches query-string sources", () => {
    expect(normaliseSource("https://mbatravelsgoa.com/?page_id=84")).toBe("/?page_id=84");
    const rules = [{ id: 1, sourcePath: "/?page_id=84", destination: "/about-us/", statusCode: 301 }, { id: 2, sourcePath: "/old/", destination: "/new/", statusCode: 301 }];
    expect(matchRedirect(rules, "/", "?page_id=84")?.id).toBe(1);
    expect(matchRedirect(rules, "/old", "")?.id).toBe(2);
    expect(matchRedirect(rules, "/", "")).toBeNull();
  });
});

describe("enquiry validation", () => {
  const base = { phone: "+91 98765 43210", consent: true as const };
  it("accepts a minimal valid enquiry (phone + consent, as on the original WhatsForm)", () => {
    expect(enquirySchema.safeParse(base).success).toBe(true);
  });
  it("requires phone and consent", () => {
    expect(enquirySchema.safeParse({ consent: true }).success).toBe(false);
    expect(enquirySchema.safeParse({ phone: "9876543210" }).success).toBe(false);
  });
  it("rejects malformed phone and email", () => {
    expect(enquirySchema.safeParse({ ...base, phone: "12ab" }).success).toBe(false);
    expect(enquirySchema.safeParse({ ...base, phone: "1234" }).success).toBe(false);
    expect(enquirySchema.safeParse({ ...base, email: "not-an-email" }).success).toBe(false);
  });
  it("rejects a filled honeypot", () => {
    expect(enquirySchema.safeParse({ ...base, company: "spam inc" }).success).toBe(false);
  });
});

describe("price formatting matches the original site", () => {
  it("formats rupees with Indian grouping", () => {
    expect(formatInr(1250)).toBe("₹1,250");
    expect(formatInr(17100)).toBe("₹17,100");
    expect(formatInr(100000)).toBe("₹1,00,000");
  });
  it("keeps prefixes and falls back to text", () => {
    expect(formatPrice("Starts From", 2500, "")).toBe("Starts From ₹2,500");
    expect(formatPrice("", null, "Custom Pricing")).toBe("Custom Pricing");
  });
});

describe("content helpers", () => {
  it("parses paragraphs, headings and lists", () => {
    const blocks = parseBody("## Title\n\nPara one\ncontinued\n\n- a\n- b");
    expect(blocks).toEqual([{ kind: "h2", text: "Title" }, { kind: "p", text: "Para one continued" }, { kind: "ul", items: ["a", "b"] }]);
  });
  it("slugifies names", () => {
    expect(slugify("Airport + Sightseeing")).toBe("airport-sightseeing");
    expect(slugify("Hotels & Resorts")).toBe("hotels-and-resorts");
  });
});

describe("booking and contact links", () => {
  it("builds encoded WhatsApp links", () => {
    expect(whatsappHref("91 93220 73068", "Hi MBA Travels, book Dzire")).toBe("https://wa.me/919322073068?text=Hi%20MBA%20Travels%2C%20book%20Dzire");
  });
  it("resolves CTA kinds from settings", () => {
    expect(resolveCta({ label: "Call", kind: "call" }, DEFAULT_SETTINGS)?.href).toBe("tel:+919322073068");
    expect(resolveCta({ label: "Book", kind: "booking" }, DEFAULT_SETTINGS)?.href).toBe("https://whatsform.com/kkpjba");
    expect(resolveCta({ label: "Enquire", kind: "booking" }, { ...DEFAULT_SETTINGS, bookingMode: "enquiry" })?.href).toBe("/goa-taxi-service-contact/#enquiry");
    expect(resolveCta({ label: "", kind: "call" }, DEFAULT_SETTINGS)).toBeNull();
  });
});

describe("CMS schemas", () => {
  it("validates section data and collects media ids", () => {
    const hero = sectionSchema("hero").parse({ title: "Hi", slides: [{ mediaId: 3 }, { mediaId: 5 }] });
    expect(sectionMediaIds("hero", hero as Record<string, unknown>)).toEqual([3, 5]);
    expect(sectionSchema("hero").safeParse({ title: "" }).success).toBe(false);
  });
  it("rejects javascript: URLs in buttons", () => {
    const r = sectionSchema("cta_band").safeParse({ title: "x", primaryCta: { label: "Go", kind: "link", href: "javascript:alert(1)" } });
    expect(r.success).toBe(false);
  });
  it("entity schemas enforce required fields", () => {
    expect(fieldsToZod(ENTITIES.faqs.fields).safeParse({ question: "", answer: "x" }).success).toBe(false);
    expect(fieldsToZod(ENTITIES.testimonials.fields).safeParse({ authorName: "A", quote: "Q", rating: 7 }).success).toBe(false);
  });
});
