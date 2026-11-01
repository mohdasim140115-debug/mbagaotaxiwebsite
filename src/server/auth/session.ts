import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db, schema } from "../db/client";
import { randomToken, sha256 } from "../crypto";
import { getClientIp, getUserAgent } from "../request";
import { ROLES, type Permission } from "@/lib/permissions";

const isProd = process.env.NODE_ENV === "production";
// __Host- prefix forces Secure, Path=/ and no Domain in production.
export const SESSION_COOKIE = isProd ? "__Host-mba_admin" : "mba_admin";
const ABSOLUTE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const IDLE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours of inactivity
const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

export type AdminUser = {
  id: number;
  email: string;
  name: string;
  role: string;
  roleName: string;
  permissions: Permission[];
  mustChangePassword: boolean;
  sessionId: number;
};

export async function createSession(userId: number) {
  const token = randomToken(32);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ABSOLUTE_TTL_MS);
  await db.insert(schema.adminSessions).values({
    userId,
    tokenHash: sha256(token),
    ip: (await getClientIp()).slice(0, 64),
    userAgent: await getUserAgent(),
    lastSeenAt: now,
    expiresAt,
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await db
      .update(schema.adminSessions)
      .set({ revokedAt: new Date() })
      .where(eq(schema.adminSessions.tokenHash, sha256(token)));
  }
  store.delete(SESSION_COOKIE);
}

/** Resolves the signed-in admin for this request (deduplicated per render). */
export const getCurrentAdmin = cache(async (): Promise<AdminUser | null> => {
  // Session checks are inherently per-request (cookies + current time): never prerender them.
  await connection();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const now = new Date();
  const [row] = await db
    .select({
      sessionId: schema.adminSessions.id,
      lastSeenAt: schema.adminSessions.lastSeenAt,
      id: schema.adminUsers.id,
      email: schema.adminUsers.email,
      name: schema.adminUsers.name,
      role: schema.adminUsers.roleKey,
      isActive: schema.adminUsers.isActive,
      mustChangePassword: schema.adminUsers.mustChangePassword,
    })
    .from(schema.adminSessions)
    .innerJoin(schema.adminUsers, eq(schema.adminUsers.id, schema.adminSessions.userId))
    .where(
      and(
        eq(schema.adminSessions.tokenHash, sha256(token)),
        isNull(schema.adminSessions.revokedAt),
        gt(schema.adminSessions.expiresAt, now),
      ),
    )
    .limit(1);
  if (!row || !row.isActive) return null;
  if (now.getTime() - row.lastSeenAt.getTime() > IDLE_TTL_MS) {
    await db.update(schema.adminSessions).set({ revokedAt: now }).where(eq(schema.adminSessions.id, row.sessionId));
    return null;
  }
  if (now.getTime() - row.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    await db.update(schema.adminSessions).set({ lastSeenAt: now }).where(eq(schema.adminSessions.id, row.sessionId));
  }
  const permissions = await getRolePermissions(row.role);
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    roleName: ROLES[row.role]?.name ?? row.role,
    permissions,
    mustChangePassword: row.mustChangePassword,
    sessionId: row.sessionId,
  };
});

async function getRolePermissions(roleKey: string): Promise<Permission[]> {
  const rows = await db
    .select({ key: schema.rolePermissions.permissionKey })
    .from(schema.rolePermissions)
    .where(eq(schema.rolePermissions.roleKey, roleKey));
  return rows.map((r) => r.key as Permission);
}

/** For admin pages: redirect to login when signed out; 403 page when lacking permission. */
export async function requireAdmin(permission?: Permission): Promise<AdminUser> {
  const user = await getCurrentAdmin();
  if (!user) redirect("/admin/login/");
  if (permission && !user.permissions.includes(permission)) redirect("/admin/forbidden/");
  return user;
}

export class AuthError extends Error {
  constructor(message = "Not authorised") {
    super(message);
  }
}

/** For server actions / route handlers: throws instead of redirecting. */
export async function assertPermission(permission: Permission): Promise<AdminUser> {
  const user = await getCurrentAdmin();
  if (!user) throw new AuthError("Your session has expired. Please sign in again.");
  if (!user.permissions.includes(permission)) throw new AuthError("You do not have permission to do that.");
  return user;
}

export function can(user: AdminUser | null, permission: Permission) {
  return !!user && user.permissions.includes(permission);
}
