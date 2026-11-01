"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { saveNavigationAction } from "@/server/admin/ops-actions";
import { Button } from "@/components/ui/button";
import { Card, Notice, inputCls } from "./ui";

type Item = { label: string; href: string; isVisible: boolean; openInNewTab: boolean; parentIndex: number };

export function NavigationEditor({ menu, title, initial, pages }: { menu: "header" | "footer" | "legal"; title: string; initial: Item[]; pages: { path: string; title: string }[] }) {
  const [items, setItems] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const listId = `pages-${menu}`;

  const set = (i: number, patch: Partial<Item>) => setItems((prev) => prev.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const move = (i: number, to: number) =>
    setItems((prev) => {
      const next = [...prev];
      const [it] = next.splice(i, 1);
      next.splice(to, 0, it!);
      // Keep parent references pointing at the same items after reordering.
      return next.map((x) => {
        if (x.parentIndex < 0) return x;
        const parent = prev[x.parentIndex];
        return { ...x, parentIndex: next.indexOf(parent!) };
      });
    });

  return (
    <Card
      title={title}
      actions={
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await saveNavigationAction(menu, items.map((it) => ({ ...it, menu })));
              setMsg({ ok: r.ok, text: r.ok ? "Saved — the live site is updated." : r.error });
            })
          }
        >
          {pending ? "Saving…" : "Save menu"}
        </Button>
      }
    >
      <datalist id={listId}>
        {pages.map((p) => (
          <option key={p.path} value={p.path}>
            {p.title}
          </option>
        ))}
      </datalist>
      {msg && <div className="mb-3"><Notice kind={msg.ok ? "success" : "error"}>{msg.text}</Notice></div>}
      {items.length === 0 && <p className="text-sm text-ink-700">No links yet.</p>}
      <ol className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="grid items-center gap-2 rounded-md border border-line p-2 md:grid-cols-[1fr_1.4fr_auto_auto_auto_auto]">
            <label className="sr-only" htmlFor={`${menu}-l-${i}`}>Label</label>
            <input id={`${menu}-l-${i}`} className={inputCls} value={it.label} placeholder="Label" onChange={(e) => set(i, { label: e.target.value })} />
            <label className="sr-only" htmlFor={`${menu}-h-${i}`}>Link</label>
            <input id={`${menu}-h-${i}`} className={inputCls} value={it.href} list={listId} placeholder="/page/ or https://" onChange={(e) => set(i, { href: e.target.value })} />
            {menu === "header" ? (
              <select aria-label="Parent (for dropdowns)" className={`${inputCls} w-40`} value={it.parentIndex} onChange={(e) => set(i, { parentIndex: Number(e.target.value) })}>
                <option value={-1}>Top level</option>
                {items.map((p, j) => (j !== i && p.parentIndex < 0 && j < i ? <option key={j} value={j}>Under “{p.label}”</option> : null))}
              </select>
            ) : <span />}
            <label className="inline-flex items-center gap-1.5 text-xs">
              <input type="checkbox" className="accent-teal-600" checked={it.isVisible} onChange={(e) => set(i, { isVisible: e.target.checked })} /> Visible
            </label>
            <label className="inline-flex items-center gap-1.5 text-xs">
              <input type="checkbox" className="accent-teal-600" checked={it.openInNewTab} onChange={(e) => set(i, { openInNewTab: e.target.checked })} /> New tab
            </label>
            <div className="flex gap-1">
              <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, i - 1)} className="inline-flex size-8 items-center justify-center rounded-md hover:bg-sand-100 disabled:opacity-30"><ArrowUp className="size-4" aria-hidden="true" /></button>
              <button type="button" aria-label="Move down" disabled={i === items.length - 1} onClick={() => move(i, i + 1)} className="inline-flex size-8 items-center justify-center rounded-md hover:bg-sand-100 disabled:opacity-30"><ArrowDown className="size-4" aria-hidden="true" /></button>
              <button type="button" aria-label="Remove link" onClick={() => setItems((prev) => prev.filter((_, j) => j !== i).map((x) => ({ ...x, parentIndex: x.parentIndex === i ? -1 : x.parentIndex > i ? x.parentIndex - 1 : x.parentIndex })))} className="inline-flex size-8 items-center justify-center rounded-md text-danger hover:bg-danger-50"><Trash2 className="size-4" aria-hidden="true" /></button>
            </div>
          </li>
        ))}
      </ol>
      <button type="button" onClick={() => setItems([...items, { label: "", href: "/", isVisible: true, openInNewTab: false, parentIndex: -1 }])} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-teal-700">
        <Plus className="size-4" aria-hidden="true" /> Add link
      </button>
    </Card>
  );
}
