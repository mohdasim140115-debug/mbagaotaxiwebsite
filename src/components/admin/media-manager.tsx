"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Upload } from "lucide-react";
import { deleteMediaAction, updateMediaAction } from "@/server/admin/media-actions";
import { Button } from "@/components/ui/button";
import { Badge, Field, Notice, inputCls } from "./ui";

type Item = {
  id: number;
  url: string;
  filename: string;
  altText: string;
  caption: string;
  credit: string;
  licenceStatus: string;
  width: number;
  height: number;
  bytes: number;
  sourceUrl: string | null;
  usages: { label: string; href: string }[];
};

const LICENCES = [
  { value: "owner", label: "Owned by the business" },
  { value: "licensed", label: "Licensed (credit recorded)" },
  { value: "pending", label: "Pending — rights not confirmed" },
  { value: "do_not_use", label: "Do not use (hidden on site)" },
];

function MediaCard({ item, can }: { item: Item; can: { upload: boolean; delete: boolean } }) {
  const router = useRouter();
  const [v, setV] = useState({ altText: item.altText, caption: item.caption, credit: item.credit, licenceStatus: item.licenceStatus });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const idp = `m${item.id}`;

  const replace = async (file: File) => {
    const fd = new FormData();
    fd.set("file", file);
    fd.set("replaceId", String(item.id));
    const res = await fetch("/api/admin/media/", { method: "POST", body: fd });
    const body = await res.json().catch(() => ({ ok: false, error: "Upload failed" }));
    setMsg({ ok: body.ok, text: body.ok ? "File replaced everywhere it is used." : body.error });
    if (body.ok) router.refresh();
  };

  return (
    <li className="overflow-hidden rounded-[10px] border border-line bg-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.url} alt={item.altText} loading="lazy" className="aspect-[4/3] w-full bg-sand-100 object-cover" />
      <div className="space-y-3 p-4 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge value={v.licenceStatus} />
          <span className="text-xs text-ink-500">
            {item.width}×{item.height} · {Math.round(item.bytes / 1024)} KB
          </span>
        </div>
        <fieldset disabled={!can.upload || pending} className="space-y-3">
          <Field id={`${idp}-alt`} label="Alt text" help="Describe the image for screen readers. Leave empty only for purely decorative images.">
            <input id={`${idp}-alt`} className={inputCls} value={v.altText} maxLength={300} onChange={(e) => setV({ ...v, altText: e.target.value })} />
          </Field>
          <Field id={`${idp}-cap`} label="Caption">
            <input id={`${idp}-cap`} className={inputCls} value={v.caption} maxLength={300} onChange={(e) => setV({ ...v, caption: e.target.value })} />
          </Field>
          <Field id={`${idp}-credit`} label="Credit / licence">
            <input id={`${idp}-credit`} className={inputCls} value={v.credit} maxLength={300} onChange={(e) => setV({ ...v, credit: e.target.value })} />
          </Field>
          <Field id={`${idp}-lic`} label="Rights status">
            <select id={`${idp}-lic`} className={inputCls} value={v.licenceStatus} onChange={(e) => setV({ ...v, licenceStatus: e.target.value })}>
              {LICENCES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </Field>
        </fieldset>
        {item.sourceUrl && (
          <p className="truncate text-xs text-ink-500" title={item.sourceUrl}>
            Source: {item.sourceUrl}
          </p>
        )}
        <div>
          <p className="text-xs font-semibold">Used in {item.usages.length} place(s)</p>
          <ul className="text-xs text-ink-700">
            {item.usages.slice(0, 4).map((u) => (
              <li key={u.label}>
                <a href={u.href} className="underline">
                  {u.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        {msg && <Notice kind={msg.ok ? "success" : "error"}>{msg.text}</Notice>}
        <div className="flex flex-wrap gap-2">
          {can.upload && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await updateMediaAction(item.id, v);
                  setMsg({ ok: r.ok, text: r.ok ? "Saved." : r.error });
                })
              }
            >
              Save
            </Button>
          )}
          {can.upload && (
            <label className="inline-flex h-9 cursor-pointer items-center rounded-[10px] px-3 text-sm font-semibold hover:bg-sand-100">
              Replace file
              <input type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/heic" className="sr-only" onChange={(e) => e.target.files?.[0] && replace(e.target.files[0])} />
            </label>
          )}
          {can.delete && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-danger"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const inUse = item.usages.length > 0;
                  if (!window.confirm(inUse ? `This image is used in ${item.usages.length} place(s), including published content. Delete it anyway? Those places will show no image.` : "Delete this image permanently?")) return;
                  const r = await deleteMediaAction(item.id, inUse);
                  if (r.ok) router.refresh();
                  else setMsg({ ok: false, text: r.error });
                })
              }
            >
              Delete
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}

export function MediaManager({ items, page, pages, total, q, licence, can }: { items: Item[]; page: number; pages: number; total: number; q: string; licence: string; can: { upload: boolean; delete: boolean } }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const upload = async (files: FileList) => {
    setUploading(true);
    setError("");
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("alt", "");
      const res = await fetch("/api/admin/media/", { method: "POST", body: fd });
      const body = await res.json().catch(() => ({ ok: false, error: "Upload failed" }));
      if (!body.ok) setError(`${file.name}: ${body.error}`);
    }
    setUploading(false);
    router.refresh();
  };

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <form className="flex flex-wrap gap-2" role="search">
          <label htmlFor="mq" className="sr-only">Search</label>
          <input id="mq" name="q" defaultValue={q} placeholder="Search alt text or filename" className={`${inputCls} w-64`} />
          <label htmlFor="ml" className="sr-only">Rights status</label>
          <select id="ml" name="licence" defaultValue={licence} className={`${inputCls} w-56`}>
            <option value="">All rights statuses</option>
            {LICENCES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
          <Button type="submit" size="sm" variant="secondary">
            Filter
          </Button>
        </form>
        {can.upload && (
          <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-[10px] bg-sunset-600 px-4 text-sm font-semibold text-white hover:bg-[#a9461b]">
            <Upload className="size-4" aria-hidden="true" />
            {uploading ? "Uploading…" : "Upload images"}
            <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif,image/heic" className="sr-only" onChange={(e) => e.target.files && upload(e.target.files)} />
          </label>
        )}
        <span className="text-sm text-ink-500">{total} images</span>
      </div>
      {error && <Notice kind="error">{error}</Notice>}
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {items.map((m) => (
          <MediaCard key={m.id} item={m} can={can} />
        ))}
      </ul>
      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-6 flex items-center gap-3">
          {page > 1 && <a className="font-semibold text-teal-700 underline" href={`?q=${encodeURIComponent(q)}&licence=${licence}&page=${page - 1}`}>Previous</a>}
          <span className="text-sm">Page {page} of {pages}</span>
          {page < pages && <a className="font-semibold text-teal-700 underline" href={`?q=${encodeURIComponent(q)}&licence=${licence}&page=${page + 1}`}>Next</a>}
        </nav>
      )}
    </>
  );
}
