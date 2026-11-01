import { z } from "zod";

/**
 * Declarative field definitions. One definition drives three things:
 * server-side validation (toZod), the admin form UI, and default values.
 */
export type FieldDef =
  | { name: string; label: string; type: "text"; required?: boolean; max?: number; help?: string; placeholder?: string }
  | { name: string; label: string; type: "textarea"; required?: boolean; max?: number; help?: string; rows?: number }
  | { name: string; label: string; type: "number"; required?: boolean; min?: number; max?: number; help?: string; step?: number }
  | { name: string; label: string; type: "boolean"; help?: string }
  | { name: string; label: string; type: "select"; options: readonly { value: string; label: string }[]; required?: boolean; help?: string }
  | { name: string; label: string; type: "stringList"; help?: string; max?: number }
  | { name: string; label: string; type: "media"; required?: boolean; help?: string }
  | { name: string; label: string; type: "mediaList"; help?: string }
  | { name: string; label: string; type: "cta"; help?: string }
  | { name: string; label: string; type: "ref"; entity: RefEntity; required?: boolean; help?: string }
  | { name: string; label: string; type: "repeater"; fields: FieldDef[]; itemLabel?: string; help?: string; max?: number };

export type RefEntity = "packages" | "services" | "vehicles" | "hotels" | "destinations" | "faqs" | "testimonials";

export const CTA_KINDS = [
  { value: "booking", label: "Booking (uses site booking setting)" },
  { value: "whatsapp", label: "WhatsApp chat" },
  { value: "call", label: "Phone call" },
  { value: "enquiry", label: "Enquiry form" },
  { value: "link", label: "Link (internal path or URL)" },
] as const;
export type CtaKind = (typeof CTA_KINDS)[number]["value"];

export const ctaSchema = z.object({
  label: z.string().trim().max(60).default(""),
  kind: z.enum(["booking", "whatsapp", "call", "enquiry", "link"]).default("link"),
  href: z
    .string()
    .trim()
    .max(500)
    .default("")
    .refine((v) => v === "" || v.startsWith("/") || v.startsWith("#") || /^https?:\/\//.test(v), {
      message: "Use an internal path (/about-us/), #anchor, or a full http(s) URL",
    }),
  message: z.string().trim().max(300).default(""),
});
export type Cta = z.infer<typeof ctaSchema>;

const mediaId = z.coerce.number().int().positive();

export function fieldToZod(f: FieldDef): z.ZodType {
  switch (f.type) {
    case "text":
    case "textarea": {
      let s = z.string().trim().max(f.max ?? (f.type === "text" ? 300 : 20000));
      if (f.required) s = s.min(1, `${f.label} is required`);
      // null (e.g. from an older revision snapshot) is treated as empty.
      return z.preprocess((v) => (v === null ? undefined : v), s.default(""));
    }
    case "number": {
      let n = z.coerce.number();
      if (f.min !== undefined) n = n.min(f.min);
      if (f.max !== undefined) n = n.max(f.max);
      return f.required ? n : n.nullable().default(null);
    }
    case "boolean":
      return z.coerce.boolean().default(false);
    case "select": {
      const values = f.options.map((o) => o.value) as [string, ...string[]];
      return z.enum(values).default(values[0]);
    }
    case "stringList":
      return z.array(z.string().trim().min(1).max(300)).max(f.max ?? 50).default([]);
    case "media":
      return f.required ? mediaId : mediaId.nullable().default(null);
    case "mediaList":
      return z.array(mediaId).max(40).default([]);
    case "cta":
      return ctaSchema.default({ label: "", kind: "link", href: "", message: "" });
    case "ref":
      return f.required ? z.coerce.number().int().positive() : z.coerce.number().int().positive().nullable().default(null);
    case "repeater":
      return z.array(fieldsToZod(f.fields)).max(f.max ?? 50).default([]);
  }
}

export function fieldsToZod(fields: FieldDef[]) {
  const shape: Record<string, z.ZodType> = {};
  for (const f of fields) shape[f.name] = fieldToZod(f);
  return z.object(shape);
}

export function defaultsFor(fields: FieldDef[]): Record<string, unknown> {
  return fieldsToZod(fields).parse({}) as Record<string, unknown>;
}

/** Collects media ids referenced anywhere in a value described by `fields` (for usage tracking). */
export function collectMediaIds(fields: FieldDef[], value: Record<string, unknown>): number[] {
  const out: number[] = [];
  for (const f of fields) {
    const v = value?.[f.name];
    if (f.type === "media" && typeof v === "number") out.push(v);
    if (f.type === "mediaList" && Array.isArray(v)) out.push(...(v as number[]));
    if (f.type === "repeater" && Array.isArray(v)) for (const item of v) out.push(...collectMediaIds(f.fields, item));
  }
  return out;
}

export const HEADING_LEVELS = [
  { value: "h2", label: "H2 (section heading)" },
  { value: "h1", label: "H1 (main page heading — one per page)" },
] as const;
