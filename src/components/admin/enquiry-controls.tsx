"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addEnquiryNoteAction, deleteEnquiryAction, updateEnquiryAction } from "@/server/admin/ops-actions";
import { Button } from "@/components/ui/button";
import { ActionButton, Card, Field, Notice, inputCls } from "./ui";

const STATUSES = ["new", "contacted", "quoted", "booked", "closed", "spam"];

export function EnquiryControls({ id, status, assignedTo, users, canManage }: { id: number; status: string; assignedTo: number | null; users: { id: number; name: string }[]; canManage: boolean }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) =>
    start(async () => {
      const r = await fn();
      setMsg({ ok: r.ok, text: r.ok ? (r.message ?? "Saved") : (r.error ?? "Failed") });
      if (r.ok) router.refresh();
    });
  if (!canManage) return <Card title="Actions"><p className="text-sm text-ink-700">Read-only access.</p></Card>;
  return (
    <Card title="Manage">
      <div className="space-y-4">
        {msg && <Notice kind={msg.ok ? "success" : "error"}>{msg.text}</Notice>}
        <Field id="enq-status" label="Status">
          <select id="enq-status" className={inputCls} defaultValue={status} disabled={pending} onChange={(e) => run(() => updateEnquiryAction(id, { status: e.target.value }))}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field id="enq-assign" label="Assigned to">
          <select id="enq-assign" className={inputCls} defaultValue={assignedTo ?? ""} disabled={pending} onChange={(e) => run(() => updateEnquiryAction(id, { assignedTo: e.target.value ? Number(e.target.value) : null }))}>
            <option value="">Unassigned</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </Field>
        <Field id="enq-note" label="Add internal note">
          <textarea id="enq-note" className={`${inputCls} h-auto py-2`} rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <Button type="button" size="sm" variant="secondary" disabled={pending || !note.trim()} onClick={() => run(async () => { const r = await addEnquiryNoteAction(id, note); if (r.ok) setNote(""); return r; })}>
          Add note
        </Button>
        <div className="border-t border-line pt-3">
          <ActionButton variant="ghost" confirmText="Delete this enquiry and its notes permanently (e.g. on a data deletion request)?" action={() => deleteEnquiryAction(id)} onDone={(r) => r.ok && router.push("/admin/enquiries/")}>
            Delete enquiry
          </ActionButton>
        </div>
      </div>
    </Card>
  );
}
