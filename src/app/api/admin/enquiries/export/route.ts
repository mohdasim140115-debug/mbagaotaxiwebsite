import { desc } from "drizzle-orm";
import { db, schema } from "@/server/db/client";
import { getCurrentAdmin } from "@/server/auth/session";
import { enquiryWhere } from "@/server/enquiries/query";
import { audit } from "@/server/audit";

/** CSV cells: quote everything and neutralise spreadsheet formula injection (=, +, -, @). */
function cell(v: unknown) {
  let s = v === null || v === undefined ? "" : v instanceof Date ? v.toISOString() : String(v);
  // Plain phone numbers (e.g. +91 90000 11111) are safe and must stay intact.
  const isPlainPhone = /^\+?[\d\s()-]+$/.test(s);
  if (!isPlainPhone && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(req: Request) {
  const user = await getCurrentAdmin();
  if (!user) return new Response("Not signed in", { status: 401 });
  if (!user.permissions.includes("enquiries.export")) return new Response("Forbidden", { status: 403 });
  const p = new URL(req.url).searchParams;
  const where = enquiryWhere({ q: p.get("q") ?? "", status: p.get("status") ?? "", type: p.get("type") ?? "", from: p.get("from") ?? "", to: p.get("to") ?? "" });
  const rows = await db.select().from(schema.enquiries).where(where).orderBy(desc(schema.enquiries.createdAt)).limit(10000);
  const cols = ["id", "createdAt", "status", "type", "name", "phone", "email", "travelDate", "pickup", "dropoff", "travellers", "subject", "message", "landingPage", "referrer", "utmSource", "utmMedium", "utmCampaign", "utmTerm", "utmContent", "consentAt", "duplicateOf"] as const;
  const csv = ["﻿" + cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\r\n");
  await audit(user.id, "enquiry.export", "enquiries", null, `Exported ${rows.length} rows`);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="enquiries-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
