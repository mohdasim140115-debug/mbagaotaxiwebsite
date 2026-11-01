import "server-only";
import { and, eq, gt } from "drizzle-orm";
import nodemailer from "nodemailer";
import { db, schema } from "../db/client";
import { getAllSettings } from "../cms/settings";
import type { Enquiry } from "@/lib/validation/enquiry";

const MIN_FILL_MS = 2500; // humans take longer than this to fill the form

export function looksAutomated(input: Pick<Enquiry, "company" | "startedAt">, now = Date.now()) {
  if (input.company) return true;
  if (!input.startedAt || now - input.startedAt < MIN_FILL_MS) return true;
  return false;
}

export async function createEnquiry(input: Enquiry, ipHash: string) {
  const digits = input.phone.replace(/\D/g, "");
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [dup] = await db
    .select({ id: schema.enquiries.id })
    .from(schema.enquiries)
    .where(and(eq(schema.enquiries.phone, input.phone), gt(schema.enquiries.createdAt, since)))
    .limit(1);
  const [res] = await db.insert(schema.enquiries).values({
    type: input.type,
    name: input.name,
    phone: input.phone,
    email: input.email,
    travelDate: input.travelDate,
    pickup: input.pickup,
    dropoff: input.dropoff,
    travellers: input.travellers === "" ? null : input.travellers,
    subject: input.subject,
    message: input.message,
    landingPage: input.landingPage,
    referrer: input.referrer,
    utmSource: input.utmSource,
    utmMedium: input.utmMedium,
    utmCampaign: input.utmCampaign,
    utmTerm: input.utmTerm,
    utmContent: input.utmContent,
    consentAt: new Date(),
    duplicateOf: dup?.id ?? null,
    ipHash,
  });
  await db.insert(schema.enquiryEvents).values({ enquiryId: res.insertId, event: "created", toValue: "new" });
  return { id: res.insertId, duplicate: !!dup, digits };
}

/** Sends a short notification. Failures are logged, never surfaced to the customer. */
export async function notifyNewEnquiry(id: number, input: Enquiry) {
  const settings = await getAllSettings();
  const to = settings.enquiryNotifyEmail;
  if (!to || !process.env.SMTP_HOST) return;
  try {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
    const site = process.env.SITE_URL ?? "";
    await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject: `New ${input.type} enquiry #${id}`,
      text: [
        `Name: ${input.name || "—"}`,
        `Phone: ${input.phone}`,
        `Email: ${input.email || "—"}`,
        `Travel date: ${input.travelDate || "—"}`,
        `Pickup: ${input.pickup || "—"}  Destination: ${input.dropoff || "—"}`,
        `Passengers: ${input.travellers || "—"}`,
        `Subject: ${input.subject || "—"}`,
        "",
        input.message || "(no message)",
        "",
        `Open in admin: ${site}/admin/enquiries/${id}/`,
      ].join("\n"),
    });
  } catch (err) {
    console.error("[enquiry] notification email failed", err);
  }
}
