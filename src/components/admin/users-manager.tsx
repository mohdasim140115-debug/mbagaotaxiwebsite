"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createResetLinkAction, revokeSessionsAction, saveUserAction } from "@/server/admin/ops-actions";
import { Button } from "@/components/ui/button";
import { ActionButton, Badge, Card, Field, Notice, inputCls } from "./ui";
import { formatDateTime } from "@/lib/utils";

type U = { id: number; email: string; name: string; roleKey: string; isActive: boolean; lastLoginAt: string | null; lockedUntil: string | null; sessions: number };

export function UsersManager({ meId, users, roles }: { meId: number; users: U[]; roles: { key: string; name: string; description: string }[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState({ email: "", name: "", roleKey: "content_editor", isActive: true });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [link, setLink] = useState("");
  const [pending, start] = useTransition();

  const edit = (u: U | null) => {
    setEditing(u?.id ?? null);
    setForm(u ? { email: u.email, name: u.name, roleKey: u.roleKey, isActive: u.isActive } : { email: "", name: "", roleKey: "content_editor", isActive: true });
    setMsg(null);
    setLink("");
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <div className="overflow-x-auto rounded-[10px] border border-line bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-line bg-sand-100/60">
            <tr>
              <th scope="col" className="px-4 py-3">User</th>
              <th scope="col" className="px-4 py-3">Role</th>
              <th scope="col" className="px-4 py-3">Last sign-in</th>
              <th scope="col" className="px-4 py-3">Sessions</th>
              <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3">
                  <span className="font-semibold">{u.name}</span>
                  <span className="block text-xs text-ink-500">{u.email}</span>
                  {!u.isActive && <Badge value="archived" label="deactivated" />}
                  {u.lockedUntil && <Badge value="spam" label="locked" />}
                </td>
                <td className="px-4 py-3">{roles.find((r) => r.key === u.roleKey)?.name ?? u.roleKey}</td>
                <td className="px-4 py-3 text-ink-700">{formatDateTime(u.lastLoginAt)}</td>
                <td className="px-4 py-3">{u.sessions}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    <Button type="button" size="sm" variant="ghost" onClick={() => edit(u)}>Edit</Button>
                    <ActionButton variant="ghost" action={async () => { const r = await createResetLinkAction(u.id); if (r.ok) setLink(r.data.resetUrl); return r; }}>Reset link</ActionButton>
                    {u.sessions > 0 && <ActionButton variant="ghost" confirmText={`Sign ${u.name} out everywhere${u.id === meId ? " (except this session)" : ""}?`} action={() => revokeSessionsAction(u.id)} onDone={(r) => r.ok && router.refresh()}>Revoke sessions</ActionButton>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Card title={editing ? "Edit user" : "Add user"}>
        <div className="space-y-3">
          {msg && <Notice kind={msg.ok ? "success" : "error"}>{msg.text}</Notice>}
          {link && (
            <Notice kind="info">
              One-time password link (valid 48 hours). Share it privately:
              <input readOnly aria-label="Reset link" className={`${inputCls} mt-2 font-mono text-xs`} value={link} onFocus={(e) => e.currentTarget.select()} />
            </Notice>
          )}
          <Field id="u-name" label="Name"><input id="u-name" className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field id="u-email" label="Email"><input id="u-email" type="email" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field id="u-role" label="Role" help={roles.find((r) => r.key === form.roleKey)?.description}>
            <select id="u-role" className={inputCls} value={form.roleKey} onChange={(e) => setForm({ ...form, roleKey: e.target.value })}>
              {roles.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-teal-600" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active (deactivating signs the user out immediately)</label>
          <div className="flex gap-2">
            <Button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await saveUserAction(editing, form);
                  setMsg({ ok: r.ok, text: r.ok ? "Saved." : r.error });
                  if (r.ok) {
                    if (r.data.resetUrl) setLink(r.data.resetUrl);
                    router.refresh();
                  }
                })
              }
            >
              {pending ? "Saving…" : editing ? "Save user" : "Create user"}
            </Button>
            {editing && <Button type="button" variant="ghost" onClick={() => edit(null)}>Cancel</Button>}
          </div>
        </div>
      </Card>
    </div>
  );
}
