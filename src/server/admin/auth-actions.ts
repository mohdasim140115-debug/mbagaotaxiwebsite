"use server";

import { redirect } from "next/navigation";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db/client";
import { getDummyHash, hashPassword, passwordPolicyError, verifyPassword } from "../auth/password";
import { createSession, destroySession, getCurrentAdmin } from "../auth/session";
import { getClientIpHash } from "../request";
import { audit } from "../audit";
import { sha256 } from "../crypto";

export type LoginState = { error?: string; email?: string };

const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;
const GENERIC = "Incorrect email or password.";

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 191);
  const password = String(formData.get("password") ?? "").slice(0, 200);
  if (!email || !password) return { error: "Enter your email and password.", email };

  const ipHash = await getClientIpHash();
  // Only FAILED attempts count toward the per-IP limit, so busy offices signing in normally are never blocked.
  const [{ failures }] = await db
    .select({ failures: sql<number>`COUNT(*)` })
    .from(schema.loginAttempts)
    .where(and(eq(schema.loginAttempts.ipHash, ipHash), eq(schema.loginAttempts.success, false), gt(schema.loginAttempts.createdAt, new Date(Date.now() - 15 * 60_000))));
  if (Number(failures) >= 20) {
    return { error: "Too many failed sign-in attempts from this network. Please wait 15 minutes and try again.", email };
  }

  const [user] = await db.select().from(schema.adminUsers).where(eq(schema.adminUsers.email, email)).limit(1);
  const record = async (success: boolean, reason: string) =>
    db.insert(schema.loginAttempts).values({ email, ipHash, success, reason });

  if (!user) {
    await verifyPassword(await getDummyHash(), password); // equalise timing
    await record(false, "unknown_email");
    return { error: GENERIC, email };
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    await record(false, "locked");
    return { error: `This account is temporarily locked after repeated failed attempts. Try again after ${LOCK_MINUTES} minutes.`, email };
  }
  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid || !user.isActive) {
    const failures = user.failedLogins + 1;
    await db
      .update(schema.adminUsers)
      .set({ failedLogins: failures, lockedUntil: failures >= MAX_FAILURES ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null })
      .where(eq(schema.adminUsers.id, user.id));
    await record(false, user.isActive ? "bad_password" : "inactive");
    if (failures >= MAX_FAILURES) await audit(user.id, "auth.locked", "admin_users", user.id, "Account locked after failed attempts");
    return { error: GENERIC, email };
  }

  await db.update(schema.adminUsers).set({ failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() }).where(eq(schema.adminUsers.id, user.id));
  await record(true, "ok");
  await createSession(user.id);
  await audit(user.id, "auth.login", "admin_users", user.id, "Signed in");
  redirect(user.mustChangePassword ? "/admin/account/?force=1" : "/admin/");
}

export async function logoutAction() {
  const user = await getCurrentAdmin();
  await destroySession();
  if (user) await audit(user.id, "auth.logout", "admin_users", user.id, "Signed out");
  redirect("/admin/login/");
}

export type PasswordState = { error?: string; success?: string };

export async function changePasswordAction(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const user = await getCurrentAdmin();
  if (!user) redirect("/admin/login/");
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const [row] = await db.select().from(schema.adminUsers).where(eq(schema.adminUsers.id, user.id)).limit(1);
  if (!row || !(await verifyPassword(row.passwordHash, current))) return { error: "Your current password is incorrect." };
  const policy = passwordPolicyError(next);
  if (policy) return { error: policy };
  if (next !== confirm) return { error: "The new passwords do not match." };
  if (next === current) return { error: "Choose a password you have not just used." };
  await db
    .update(schema.adminUsers)
    .set({ passwordHash: await hashPassword(next), passwordChangedAt: new Date(), mustChangePassword: false })
    .where(eq(schema.adminUsers.id, user.id));
  // Sign out every other session for this user.
  const sessions = await db.select({ id: schema.adminSessions.id }).from(schema.adminSessions).where(and(eq(schema.adminSessions.userId, user.id), isNull(schema.adminSessions.revokedAt)));
  for (const s of sessions) if (s.id !== user.sessionId) await db.update(schema.adminSessions).set({ revokedAt: new Date() }).where(eq(schema.adminSessions.id, s.id));
  await audit(user.id, "auth.password_changed", "admin_users", user.id, "Changed own password");
  return { success: "Password updated. Other sessions have been signed out." };
}

const resetSchema = z.object({ token: z.string().min(20).max(100), next: z.string(), confirm: z.string() });

export async function resetPasswordAction(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const parsed = resetSchema.safeParse({ token: formData.get("token"), next: formData.get("next"), confirm: formData.get("confirm") });
  if (!parsed.success) return { error: "This reset link is invalid." };
  const { token, next, confirm } = parsed.data;
  const policy = passwordPolicyError(next);
  if (policy) return { error: policy };
  if (next !== confirm) return { error: "The new passwords do not match." };
  const [row] = await db
    .select()
    .from(schema.passwordResetTokens)
    .where(and(eq(schema.passwordResetTokens.tokenHash, sha256(token)), isNull(schema.passwordResetTokens.usedAt), gt(schema.passwordResetTokens.expiresAt, new Date())))
    .limit(1);
  if (!row) return { error: "This reset link has expired or was already used. Ask an administrator for a new one." };
  await db.transaction(async (tx) => {
    await tx.update(schema.passwordResetTokens).set({ usedAt: new Date() }).where(eq(schema.passwordResetTokens.id, row.id));
    await tx
      .update(schema.adminUsers)
      .set({ passwordHash: await hashPassword(next), passwordChangedAt: new Date(), mustChangePassword: false, failedLogins: 0, lockedUntil: null })
      .where(eq(schema.adminUsers.id, row.userId));
    await tx.update(schema.adminSessions).set({ revokedAt: new Date() }).where(and(eq(schema.adminSessions.userId, row.userId), isNull(schema.adminSessions.revokedAt)));
  });
  await audit(row.userId, "auth.password_reset", "admin_users", row.userId, "Password reset via link");
  return { success: "Your password has been set. You can now sign in." };
}
