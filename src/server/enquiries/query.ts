import "server-only";
import { and, desc, eq, gte, like, lte, or, sql, type SQL } from "drizzle-orm";
import { db, schema } from "../db/client";

export type EnquiryFilters = { q?: string; status?: string; type?: string; from?: string; to?: string; page?: number };
export const ENQUIRY_PAGE_SIZE = 25;

export function enquiryWhere(f: EnquiryFilters): SQL | undefined {
  const conds: SQL[] = [];
  if (f.status && (schema.ENQUIRY_STATUSES as readonly string[]).includes(f.status)) conds.push(eq(schema.enquiries.status, f.status as (typeof schema.ENQUIRY_STATUSES)[number]));
  if (f.type) conds.push(eq(schema.enquiries.type, f.type));
  if (f.from && /^\d{4}-\d{2}-\d{2}$/.test(f.from)) conds.push(gte(schema.enquiries.createdAt, new Date(`${f.from}T00:00:00+05:30`)));
  if (f.to && /^\d{4}-\d{2}-\d{2}$/.test(f.to)) conds.push(lte(schema.enquiries.createdAt, new Date(`${f.to}T23:59:59+05:30`)));
  if (f.q) {
    const term = `%${f.q.slice(0, 100)}%`;
    conds.push(or(like(schema.enquiries.name, term), like(schema.enquiries.phone, term), like(schema.enquiries.email, term), like(schema.enquiries.message, term), like(schema.enquiries.subject, term))!);
  }
  return conds.length ? and(...conds) : undefined;
}

export async function listEnquiries(f: EnquiryFilters) {
  const where = enquiryWhere(f);
  const page = Math.max(1, f.page ?? 1);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({ e: schema.enquiries, assignee: schema.adminUsers.name })
      .from(schema.enquiries)
      .leftJoin(schema.adminUsers, eq(schema.adminUsers.id, schema.enquiries.assignedTo))
      .where(where)
      .orderBy(desc(schema.enquiries.createdAt))
      .limit(ENQUIRY_PAGE_SIZE)
      .offset((page - 1) * ENQUIRY_PAGE_SIZE),
    db.select({ total: sql<number>`COUNT(*)` }).from(schema.enquiries).where(where),
  ]);
  return { rows, total: Number(total), page, pages: Math.max(1, Math.ceil(Number(total) / ENQUIRY_PAGE_SIZE)) };
}
