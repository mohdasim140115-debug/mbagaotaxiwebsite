"use client";

import { useState, useTransition } from "react";
import { saveEntitySeoAction } from "@/server/admin/content-actions";
import { Button } from "@/components/ui/button";
import { FieldInput } from "./field-input";
import { Card, Field, Notice, inputCls } from "./ui";

export type SeoValues = {
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  robotsIndex: boolean;
  robotsFollow: boolean;
  ogTitle: string;
  ogDescription: string;
  ogImageId: number | null;
};

export const EMPTY_SEO: SeoValues = { metaTitle: "", metaDescription: "", canonicalUrl: "", robotsIndex: true, robotsFollow: true, ogTitle: "", ogDescription: "", ogImageId: null };

function Counter({ value, ideal }: { value: string; ideal: [number, number] }) {
  const n = value.length;
  const tone = n === 0 ? "text-ink-500" : n < ideal[0] || n > ideal[1] ? "text-sunset-600" : "text-success";
  return (
    <span className={`text-xs ${tone}`}>
      {n} characters (aim for {ideal[0]}–{ideal[1]})
    </span>
  );
}

/** SEO fields with a search-result preview. Controlled when `onChange` is given; self-saving for entities otherwise. */
export function SeoFields({ value, onChange, fallbackTitle, url, disabled }: { value: SeoValues; onChange: (v: SeoValues) => void; fallbackTitle: string; url: string; disabled?: boolean }) {
  const set = (patch: Partial<SeoValues>) => onChange({ ...value, ...patch });
  return (
    <fieldset disabled={disabled} className="space-y-4">
      <div className="rounded-md border border-line bg-paper p-4" aria-label="Search result preview">
        <p className="truncate text-xs text-ink-500">{url}</p>
        <p className="truncate text-lg text-[#1a0dab]">{value.metaTitle || fallbackTitle}</p>
        <p className="line-clamp-2 text-sm text-ink-700">{value.metaDescription || "No description set — the site default will be used."}</p>
      </div>
      <Field id="seo-title" label="Meta title (leave blank to use “Page title - MBA Travels Goa”)">
        <input id="seo-title" className={inputCls} value={value.metaTitle} maxLength={191} onChange={(e) => set({ metaTitle: e.target.value })} />
        <Counter value={value.metaTitle} ideal={[30, 60]} />
      </Field>
      <Field id="seo-desc" label="Meta description">
        <textarea id="seo-desc" className={`${inputCls} h-auto py-2`} rows={3} value={value.metaDescription} maxLength={320} onChange={(e) => set({ metaDescription: e.target.value })} />
        <Counter value={value.metaDescription} ideal={[70, 160]} />
      </Field>
      <Field id="seo-canonical" label="Canonical URL (leave blank for this page’s own URL)">
        <input id="seo-canonical" className={inputCls} value={value.canonicalUrl} onChange={(e) => set({ canonicalUrl: e.target.value })} placeholder="https://mbatravelsgoa.com/…" />
      </Field>
      <div className="flex flex-wrap gap-6 text-sm">
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" className="size-4 accent-teal-600" checked={value.robotsIndex} onChange={(e) => set({ robotsIndex: e.target.checked })} /> Allow search engines to index
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" className="size-4 accent-teal-600" checked={value.robotsFollow} onChange={(e) => set({ robotsFollow: e.target.checked })} /> Follow links
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field id="seo-ogt" label="Social share title (optional)">
          <input id="seo-ogt" className={inputCls} value={value.ogTitle} maxLength={191} onChange={(e) => set({ ogTitle: e.target.value })} />
        </Field>
        <Field id="seo-ogd" label="Social share description (optional)">
          <input id="seo-ogd" className={inputCls} value={value.ogDescription} maxLength={320} onChange={(e) => set({ ogDescription: e.target.value })} />
        </Field>
      </div>
      <FieldInput def={{ name: "ogImageId", label: "Social share image", type: "media" }} path="seo.ogImageId" value={value.ogImageId} onChange={(v) => set({ ogImageId: (v as number) ?? null })} />
    </fieldset>
  );
}

export function EntitySeoCard({ entityType, entityId, initial, fallbackTitle, url, canEdit }: { entityType: "package" | "vehicle" | "post"; entityId: number; initial: SeoValues; fallbackTitle: string; url: string; canEdit: boolean }) {
  const [value, setValue] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <Card title="SEO (detail page)">
      <SeoFields value={value} onChange={setValue} fallbackTitle={fallbackTitle} url={url} disabled={!canEdit} />
      {canEdit && (
        <div className="mt-4 flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await saveEntitySeoAction(entityType, entityId, value);
                setMsg({ ok: r.ok, text: r.ok ? "SEO saved." : r.error });
              })
            }
          >
            Save SEO
          </Button>
          {msg && <Notice kind={msg.ok ? "success" : "error"}>{msg.text}</Notice>}
        </div>
      )}
    </Card>
  );
}
