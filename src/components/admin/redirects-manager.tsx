"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteRedirectAction, saveRedirectAction } from "@/server/admin/ops-actions";
import { Button } from "@/components/ui/button";
import { ActionButton, Badge, Card, Field, Notice, inputCls } from "./ui";
import { formatDateTime } from "@/lib/utils";

type Row = { id: number; sourcePath: string; destination: string; statusCode: number; isActive: boolean; note: string; hits: number; lastHitAt: string | null };
const EMPTY = { sourcePath: "", destination: "", statusCode: 301, isActive: true, note: "", confirmExistingPage: false };

export function RedirectsManager({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const edit = (r: Row | null) => {
    setEditing(r ? r.id : null);
    setForm(r ? { sourcePath: r.sourcePath, destination: r.destination, statusCode: r.statusCode, isActive: r.isActive, note: r.note, confirmExistingPage: false } : EMPTY);
    setMsg(null);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <div className="overflow-x-auto rounded-[10px] border border-line bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-line bg-sand-100/60">
            <tr>
              <th scope="col" className="px-4 py-3">From</th>
              <th scope="col" className="px-4 py-3">To</th>
              <th scope="col" className="px-4 py-3">Type</th>
              <th scope="col" className="px-4 py-3">Hits</th>
              <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id} className={r.isActive ? "" : "opacity-60"}>
                <td className="px-4 py-3 font-mono text-xs">{r.sourcePath}{r.note && <span className="block font-sans text-ink-500">{r.note}</span>}</td>
                <td className="px-4 py-3 font-mono text-xs">{r.statusCode === 410 ? "—" : r.destination}</td>
                <td className="px-4 py-3"><Badge value={r.isActive ? "published" : "draft"} label={`${r.statusCode}${r.isActive ? "" : " (off)"}`} /></td>
                <td className="px-4 py-3 text-ink-700">{r.hits}{r.lastHitAt && <span className="block text-xs text-ink-500">{formatDateTime(r.lastHitAt)}</span>}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="ghost" onClick={() => edit(r)}>Edit</Button>
                    <ActionButton variant="ghost" confirmText="Delete this redirect?" action={() => deleteRedirectAction(r.id)} onDone={(res) => res.ok && router.refresh()}>Delete</ActionButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Card title={editing ? "Edit redirect" : "Add redirect"}>
        <div className="space-y-3">
          {msg && <Notice kind={msg.ok ? "success" : "error"}>{msg.text}</Notice>}
          <Field id="r-src" label="From path" help="e.g. /old-page/ or /?page_id=12">
            <input id="r-src" className={inputCls} value={form.sourcePath} onChange={(e) => setForm({ ...form, sourcePath: e.target.value })} />
          </Field>
          <Field id="r-type" label="Type">
            <select id="r-type" className={inputCls} value={form.statusCode} onChange={(e) => setForm({ ...form, statusCode: Number(e.target.value) })}>
              <option value={301}>301 — permanent</option>
              <option value={302}>302 — temporary</option>
              <option value={410}>410 — gone (no destination)</option>
            </select>
          </Field>
          {form.statusCode !== 410 && (
            <Field id="r-dest" label="To" help="Internal path (/packages/) or full URL">
              <input id="r-dest" className={inputCls} value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} />
            </Field>
          )}
          <Field id="r-note" label="Note">
            <input id="r-note" className={inputCls} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-teal-600" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active</label>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 accent-teal-600" checked={form.confirmExistingPage} onChange={(e) => setForm({ ...form, confirmExistingPage: e.target.checked })} /> I understand this may redirect a live page that search engines have indexed.</label>
          <div className="flex gap-2">
            <Button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await saveRedirectAction(editing, form);
                  if (r.ok) {
                    edit(null); // resets the form (and clears any message)…
                    router.refresh();
                  }
                  setMsg({ ok: r.ok, text: r.ok ? (r.message ?? "Saved") : r.error }); // …so show the result afterwards
                })
              }
            >
              {pending ? "Saving…" : "Save redirect"}
            </Button>
            {editing && <Button type="button" variant="ghost" onClick={() => edit(null)}>Cancel</Button>}
          </div>
        </div>
      </Card>
    </div>
  );
}
