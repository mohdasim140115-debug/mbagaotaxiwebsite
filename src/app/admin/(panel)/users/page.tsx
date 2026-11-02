import { and, desc, gt, isNull, sql } from "@/server/db/orm";
import { db, schema } from "@/server/db/client";
import { requireAdmin } from "@/server/auth/session";
import { ROLES, PERMISSIONS } from "@/lib/permissions";
import { UsersManager } from "@/components/admin/users-manager";
import { Card, PageTitle } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Users & roles" };

export default async function UsersPage() {
  const me = await requireAdmin("users.manage");
  const [users, sessions, attempts] = await Promise.all([
    db.select().from(schema.adminUsers).orderBy(schema.adminUsers.name),
    db
      .select({ userId: schema.adminSessions.userId, n: sql<number>`COUNT(*)` })
      .from(schema.adminSessions)
      .where(and(isNull(schema.adminSessions.revokedAt), gt(schema.adminSessions.expiresAt, new Date())))
      .groupBy(schema.adminSessions.userId),
    db.select().from(schema.loginAttempts).orderBy(desc(schema.loginAttempts.createdAt)).limit(25),
  ]);
  return (
    <>
      <PageTitle title="Users & roles" description="There is no public sign-up. New users receive a one-time link to set their password." />
      <UsersManager
        meId={me.id}
        users={users.map((u) => ({ id: u.id, email: u.email, name: u.name, roleKey: u.roleKey, isActive: u.isActive, lastLoginAt: u.lastLoginAt?.toISOString() ?? null, lockedUntil: u.lockedUntil && u.lockedUntil > new Date() ? u.lockedUntil.toISOString() : null, sessions: Number(sessions.find((s) => s.userId === u.id)?.n ?? 0) }))}
        roles={Object.entries(ROLES).map(([key, r]) => ({ key, name: r.name, description: r.description }))}
      />
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title="Role permissions">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr>
                  <th scope="col" className="py-1 pr-2">Permission</th>
                  {Object.values(ROLES).map((r) => <th key={r.name} scope="col" className="px-1 py-1">{r.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {Object.entries(PERMISSIONS).map(([p, d]) => (
                  <tr key={p} className="border-t border-line">
                    <td className="py-1 pr-2" title={p}>{d}</td>
                    {Object.values(ROLES).map((r) => <td key={r.name} className="px-1 text-center">{r.permissions.includes(p as never) ? "✓" : ""}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Recent sign-in activity">
          <ul className="space-y-1 text-xs">
            {attempts.map((a) => (
              <li key={a.id} className="flex justify-between gap-2">
                <span>{a.email}</span>
                <span className={a.success ? "text-success" : "text-danger"}>{a.success ? "success" : a.reason}</span>
                <span className="text-ink-500">{formatDateTime(a.createdAt)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}

// Admin screens always read fresh, per-request data.
export const instant = false;
