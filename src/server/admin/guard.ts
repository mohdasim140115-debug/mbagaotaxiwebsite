import "server-only";
import { updateTag } from "next/cache";
import { assertPermission, AuthError, type AdminUser } from "../auth/session";
import { ConflictError, ValidationError } from "../cms/entity-store";
import { CMS_TAG } from "../cms/settings";
import type { Permission } from "@/lib/permissions";

export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Every admin mutation goes through here: server-side permission check, consistent error
 * shapes, no internal details leaked. `invalidate` refreshes cached public pages.
 */
export async function guarded<T>(
  permission: Permission,
  fn: (user: AdminUser) => Promise<T>,
  opts: { invalidate?: boolean; message?: string } = {},
): Promise<ActionResult<T>> {
  try {
    const user = await assertPermission(permission);
    const data = await fn(user);
    if (opts.invalidate) updateTag(CMS_TAG);
    return { ok: true, data, message: opts.message };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    if (err instanceof ValidationError) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: err.fieldErrors };
    if (err instanceof ConflictError) return { ok: false, error: err.message };
    if (err instanceof UserFacingError) return { ok: false, error: err.message };
    console.error("[admin action]", err);
    return { ok: false, error: "Something went wrong while saving. Nothing was changed. Please try again." };
  }
}

/** Throw for expected failures whose message is safe to show to the admin user. */
export class UserFacingError extends Error {}

export function toId(v: unknown): number {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new UserFacingError("Invalid id");
  return n;
}
