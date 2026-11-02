"use server";

import { and, asc, eq, isNull, lt, ne, sql } from "@/server/db/orm";
import { z } from "zod";
import { db, schema } from "../db/client";
import { audit } from "../audit";
import { getAllSettings, saveSettings } from "../cms/settings";
import { settingsSchema } from "@/lib/cms/settings-def";
import { normaliseSource, validateRedirect } from "@/lib/redirects";
import { hashPassword, passwordPolicyError } from "../auth/password";
import { randomToken, sha256 } from "../crypto";
import { ROLES } from "@/lib/permissions";
import { ValidationError } from "../cms/entity-store";
import { guarded, toId, UserFacingError } from "./guard";

/* ------------------------------------------------------------------ enquiries */

export async function updateEnquiryAction(id: number, patch: { status?: string; assignedTo?: number | null }) {
  return guarded("enquiries.manage", async (user) => {
    const [row] = await db.select().from(schema.enquiries).where(eq(schema.enquiries.id, toId(id))).limit(1);
    if (!row) throw new UserFacingError("Enquiry not found");
    if (patch.status !== undefined) {
      if (!(schema.ENQUIRY_STATUSES as readonly string[]).includes(patch.status)) throw new UserFacingError("Invalid status");
      if (patch.status !== row.status) {
        await db.update(schema.enquiries).set({ status: patch.status as (typeof schema.ENQUIRY_STATUSES)[number] }).where(eq(schema.enquiries.id, id));
        await db.insert(schema.enquiryEvents).values({ enquiryId: id, userId: user.id, event: "status", fromValue: row.status, toValue: patch.status });
      }
    }
    if (patch.assignedTo !== undefined) {
      const to = patch.assignedTo === null ? null : toId(patch.assignedTo);
      await db.update(schema.enquiries).set({ assignedTo: to }).where(eq(schema.enquiries.id, id));
      await db.insert(schema.enquiryEvents).values({ enquiryId: id, userId: user.id, event: "assigned", fromValue: String(row.assignedTo ?? ""), toValue: String(to ?? "") });
    }
    await audit(user.id, "enquiry.update", "enquiries", id, JSON.stringify(patch).slice(0, 200));
    return null;
  }, { message: "Updated" });
}

export async function addEnquiryNoteAction(id: number, body: string) {
  return guarded("enquiries.manage", async (user) => {
    const text = body.trim().slice(0, 4000);
    if (!text) throw new UserFacingError("Write a note first");
    await db.insert(schema.enquiryNotes).values({ enquiryId: toId(id), authorId: user.id, body: text });
    await db.insert(schema.enquiryEvents).values({ enquiryId: id, userId: user.id, event: "note" });
    return null;
  }, { message: "Note added" });
}

export async function deleteEnquiryAction(id: number) {
  return guarded("enquiries.manage", async (user) => {
    await db.delete(schema.enquiries).where(eq(schema.enquiries.id, toId(id)));
    await audit(user.id, "enquiry.delete", "enquiries", id, "Deleted (data deletion request or spam)");
    return null;
  }, { message: "Enquiry deleted" });
}

/* ------------------------------------------------------------------ navigation */

const navSchema = z.array(
  z.object({
    id: z.number().int().positive().optional(),
    menu: z.enum(["header", "footer", "legal"]),
    label: z.string().trim().min(1, "Label required").max(80),
    href: z
      .string()
      .trim()
      .min(1)
      .max(500)
      .refine((v) => v.startsWith("/") || /^https?:\/\//.test(v) || v.startsWith("tel:") || v.startsWith("mailto:"), "Use /path/, https://, tel: or mailto:"),
    isVisible: z.boolean(),
    openInNewTab: z.boolean(),
    parentIndex: z.number().int().min(-1).default(-1),
  }),
);

export async function saveNavigationAction(menu: "header" | "footer" | "legal", items: unknown) {
  return guarded(
    "navigation.manage",
    async (user) => {
      const parsed = navSchema.safeParse(items);
      if (!parsed.success) throw new UserFacingError(parsed.error.issues[0]?.message ?? "Invalid menu");
      // Internal links must resolve to a published page, a package detail page or a known system route.
      const pages = await db.select({ path: schema.pages.path }).from(schema.pages).where(eq(schema.pages.status, "published"));
      const known = new Set(pages.map((p) => p.path).concat(["/image-credits/"]));
      for (const it of parsed.data) {
        const path = it.href.split("#")[0]!;
        if (it.href.startsWith("/") && path && !known.has(path) && !/^\/(packages|blog|taxi-services)\/[a-z0-9-]+\/$/.test(path)) {
          throw new UserFacingError(`“${it.label}” links to ${it.href}, which is not a published page.`);
        }
      }
      await db.transaction(async (tx) => {
        await tx.delete(schema.navigationItems).where(eq(schema.navigationItems.menu, menu));
        const ids: number[] = [];
        for (const [position, it] of parsed.data.entries()) {
          const parentId = it.parentIndex >= 0 && it.parentIndex < ids.length ? ids[it.parentIndex] : null;
          const [res] = await tx.insert(schema.navigationItems).values({ menu, label: it.label, href: it.href, isVisible: it.isVisible, openInNewTab: it.openInNewTab, position, parentId, createdBy: user.id, updatedBy: user.id });
          ids.push(res.insertId);
        }
      });
      await audit(user.id, "navigation.update", "navigation_items", menu, `${menu} menu saved (${parsed.data.length} items)`);
      return null;
    },
    { invalidate: true, message: "Menu saved" },
  );
}

/* ------------------------------------------------------------------ settings & analytics */

export async function saveSettingsAction(values: unknown) {
  return guarded(
    "settings.manage",
    async (user) => {
      const current = await getAllSettings();
      const parsed = settingsSchema.safeParse({ ...current, ...(values as object) });
      if (!parsed.success) {
        const errors: Record<string, string> = {};
        for (const issue of parsed.error.issues) errors[issue.path.join(".")] ??= issue.message;
        throw new ValidationError(errors);
      }
      await saveSettings(parsed.data, user.id);
      const usage = [["logoMediaId", parsed.data.logoMediaId], ["faviconMediaId", parsed.data.faviconMediaId], ["defaultOgImageId", parsed.data.defaultOgImageId]] as const;
      await db.delete(schema.mediaUsages).where(eq(schema.mediaUsages.entityType, "settings"));
      for (const [field, id] of usage) if (id) await db.insert(schema.mediaUsages).values({ mediaId: id, entityType: "settings", entityId: 0, field }).onDuplicateKeyUpdate({ set: { field } });
      await audit(user.id, "settings.update", "site_settings", null, "Site settings saved");
      return null;
    },
    { invalidate: true, message: "Settings saved" },
  );
}

const analyticsSchema = z.array(
  z.object({
    provider: z.enum(schema.ANALYTICS_PROVIDERS),
    publicId: z.string().trim().max(120).refine((v) => v === "" || /^[A-Za-z0-9_-]{3,120}$/.test(v), "IDs may only contain letters, numbers, - and _"),
    conversionLabel: z.string().trim().max(120).refine((v) => v === "" || /^[A-Za-z0-9_-]+$/.test(v), "Invalid conversion label"),
    isEnabled: z.boolean(),
    requiresConsent: z.boolean(),
  }),
);

export async function saveAnalyticsAction(rows: unknown) {
  return guarded(
    "settings.manage",
    async (user) => {
      const parsed = analyticsSchema.safeParse(rows);
      if (!parsed.success) throw new UserFacingError(parsed.error.issues[0]?.message ?? "Invalid analytics settings");
      for (const r of parsed.data) {
        if (r.isEnabled && !r.publicId) throw new UserFacingError(`Enter an ID before enabling ${r.provider}`);
        await db
          .insert(schema.analyticsConfiguration)
          .values({ ...r, updatedBy: user.id })
          .onDuplicateKeyUpdate({ set: { publicId: r.publicId, conversionLabel: r.conversionLabel, isEnabled: r.isEnabled, requiresConsent: r.requiresConsent, updatedBy: user.id } });
      }
      await audit(user.id, "analytics.update", "analytics_configuration", null, parsed.data.filter((r) => r.isEnabled).map((r) => r.provider).join(", ") || "all disabled");
      return null;
    },
    { invalidate: true, message: "Analytics settings saved" },
  );
}

/* ------------------------------------------------------------------ redirects */

const redirectSchema = z.object({
  sourcePath: z.string().trim().min(1).max(191),
  destination: z.string().trim().max(500).default(""),
  statusCode: z.coerce.number().refine((n) => [301, 302, 410].includes(n), "Use 301, 302 or 410"),
  isActive: z.boolean(),
  note: z.string().trim().max(300).default(""),
  confirmExistingPage: z.boolean().default(false),
});

export async function saveRedirectAction(id: number | null, input: unknown) {
  return guarded("redirects.manage", async (user) => {
    const parsed = redirectSchema.safeParse(input);
    if (!parsed.success) throw new UserFacingError(parsed.error.issues[0]?.message ?? "Invalid redirect");
    const v = { ...parsed.data, sourcePath: normaliseSource(parsed.data.sourcePath) };
    const others = await db
      .select({ sourcePath: schema.redirects.sourcePath, destination: schema.redirects.destination, statusCode: schema.redirects.statusCode })
      .from(schema.redirects)
      .where(id ? and(eq(schema.redirects.isActive, true), ne(schema.redirects.id, id)) : eq(schema.redirects.isActive, true));
    if (others.some((o) => o.sourcePath === v.sourcePath)) throw new UserFacingError("A redirect for this source path already exists.");
    const pages = await db.select({ path: schema.pages.path }).from(schema.pages).where(eq(schema.pages.status, "published"));
    const problem = v.isActive ? validateRedirect(v, others, pages.map((p) => p.path)) : null;
    if (problem === "WARN_EXISTING_PAGE" && !v.confirmExistingPage) {
      throw new UserFacingError("This source path is a live published page. Redirecting it will hide the page from visitors and search engines. Tick “I understand” to proceed.");
    }
    if (problem && problem !== "WARN_EXISTING_PAGE") throw new UserFacingError(problem);
    const row = { sourcePath: v.sourcePath, destination: v.statusCode === 410 ? "" : v.destination, statusCode: v.statusCode, isActive: v.isActive, note: v.note, updatedBy: user.id };
    let rid = id;
    if (id) await db.update(schema.redirects).set(row).where(eq(schema.redirects.id, toId(id)));
    else rid = (await db.insert(schema.redirects).values({ ...row, createdBy: user.id }))[0].insertId;
    await audit(user.id, id ? "redirect.update" : "redirect.create", "redirects", rid, `${v.sourcePath} → ${v.destination || v.statusCode}`);
    return { id: rid };
  }, { message: "Redirect saved (live within 30 seconds)" });
}

export async function deleteRedirectAction(id: number) {
  return guarded("redirects.manage", async (user) => {
    await db.delete(schema.redirects).where(eq(schema.redirects.id, toId(id)));
    await audit(user.id, "redirect.delete", "redirects", id, "Deleted");
    return null;
  }, { message: "Redirect deleted" });
}

/* ------------------------------------------------------------------ users */

const userSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(191),
  name: z.string().trim().min(1).max(120),
  roleKey: z.string().refine((r) => r in ROLES, "Unknown role"),
  isActive: z.boolean(),
});

export async function saveUserAction(id: number | null, input: unknown) {
  return guarded("users.manage", async (user) => {
    const parsed = userSchema.safeParse(input);
    if (!parsed.success) throw new UserFacingError(parsed.error.issues[0]?.message ?? "Invalid user");
    const v = parsed.data;
    if (id === user.id && (!v.isActive || v.roleKey !== "super_admin")) throw new UserFacingError("You cannot demote or deactivate your own account.");
    const clash = await db.select({ id: schema.adminUsers.id }).from(schema.adminUsers).where(eq(schema.adminUsers.email, v.email)).limit(1);
    if (clash.length && clash[0]!.id !== id) throw new UserFacingError("Another user already has this email.");
    if (id) {
      await db.update(schema.adminUsers).set(v).where(eq(schema.adminUsers.id, toId(id)));
      if (!v.isActive) await db.update(schema.adminSessions).set({ revokedAt: new Date() }).where(and(eq(schema.adminSessions.userId, id), isNull(schema.adminSessions.revokedAt)));
      await audit(user.id, "user.update", "admin_users", id, `${v.email} → ${v.roleKey}${v.isActive ? "" : " (deactivated)"}`);
      return { id, resetUrl: null as string | null };
    }
    // New users get an unguessable random password and a one-time link to set their own.
    const [res] = await db.insert(schema.adminUsers).values({ ...v, passwordHash: await hashPassword(randomToken(32)), mustChangePassword: false });
    const resetUrl = await createResetLink(res.insertId, user.id);
    await audit(user.id, "user.create", "admin_users", res.insertId, `${v.email} (${v.roleKey})`);
    return { id: res.insertId, resetUrl };
  }, { message: "User saved" });
}

async function createResetLink(userId: number, createdBy: number) {
  const token = randomToken(32);
  await db.insert(schema.passwordResetTokens).values({ userId, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 48 * 3600_000), createdBy });
  return `${(process.env.SITE_URL ?? "").replace(/\/$/, "")}/admin/reset-password/?token=${token}`;
}

export async function createResetLinkAction(id: number) {
  return guarded("users.manage", async (user) => {
    const url = await createResetLink(toId(id), user.id);
    await audit(user.id, "user.reset_link", "admin_users", id, "Password reset link created");
    return { resetUrl: url };
  }, { message: "Reset link created — share it securely; it expires in 48 hours" });
}

export async function revokeSessionsAction(userId: number) {
  return guarded("users.manage", async (user) => {
    await db.update(schema.adminSessions).set({ revokedAt: new Date() }).where(and(eq(schema.adminSessions.userId, toId(userId)), isNull(schema.adminSessions.revokedAt), ne(schema.adminSessions.id, user.sessionId)));
    await audit(user.id, "user.revoke_sessions", "admin_users", userId, "All sessions revoked");
    return null;
  }, { message: "Sessions revoked" });
}

export async function setUserPasswordAction(id: number, password: string) {
  return guarded("users.manage", async (user) => {
    const policy = passwordPolicyError(password);
    if (policy) throw new UserFacingError(policy);
    await db.update(schema.adminUsers).set({ passwordHash: await hashPassword(password), mustChangePassword: true, passwordChangedAt: new Date() }).where(eq(schema.adminUsers.id, toId(id)));
    await audit(user.id, "user.set_password", "admin_users", id, "Temporary password set");
    return null;
  }, { message: "Temporary password set; the user must change it at next sign-in" });
}

/** Used by navigation editor to offer internal link targets. */
export async function linkTargetsAction() {
  return guarded("content.view", async () => {
    const pages = await db.select({ path: schema.pages.path, title: schema.pages.title }).from(schema.pages).where(eq(schema.pages.status, "published")).orderBy(asc(schema.pages.path));
    return pages;
  });
}

export async function purgeExpiredEnquiriesAction() {
  return guarded("enquiries.manage", async (user) => {
    const settings = await getAllSettings();
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - Number(settings.enquiryRetentionMonths));
    const [res] = await db.update(schema.enquiries).set({ name: "", phone: "deleted", email: "", message: "", pickup: "", dropoff: "" }).where(and(lt(schema.enquiries.createdAt, cutoff), ne(schema.enquiries.phone, "deleted")));
    const n = res?.affectedRows ?? 0;
    await audit(user.id, "enquiry.retention_purge", "enquiries", null, `Anonymised ${n} enquiries older than ${settings.enquiryRetentionMonths} months`);
    return { anonymised: n };
  });
}
