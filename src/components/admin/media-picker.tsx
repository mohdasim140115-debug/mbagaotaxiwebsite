"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { listMediaAction } from "@/server/admin/media-actions";
import { Button } from "@/components/ui/button";
import { inputCls } from "./ui";

export type PickedMedia = { id: number; url: string; altText: string; width: number; height: number };
type Item = PickedMedia & { licenceStatus: string; usageCount: number; filename: string };

/** Native <dialog> media browser with search, paging and inline upload. */
export function MediaPickerDialog({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (m: PickedMedia) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: Item[]; pages: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (query: string, p: number) => {
    setBusy(true);
    const r = await listMediaAction(query, p);
    setBusy(false);
    if (r.ok) setData({ items: r.data.items as unknown as Item[], pages: r.data.pages });
    else setError(r.error);
  }, []);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      load(q, page);
    }
    if (!open && d.open) d.close();
  }, [open, load, q, page]);

  async function upload(file: File) {
    setBusy(true);
    setError("");
    const fd = new FormData();
    fd.set("file", file);
    fd.set("alt", file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "));
    const res = await fetch("/api/admin/media/", { method: "POST", body: fd });
    const body = await res.json().catch(() => ({ ok: false, error: "Upload failed" }));
    setBusy(false);
    if (!body.ok) return setError(body.error);
    await load("", 1);
  }

  return (
    <dialog ref={ref} onClose={onClose} className="m-auto w-[min(960px,94vw)] rounded-[12px] p-0 backdrop:bg-ocean-900/60" aria-label="Choose an image">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <h2 className="font-semibold">Media library</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="inline-flex size-9 items-center justify-center rounded-md hover:bg-sand-100">
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3 px-5 py-3">
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Search alt text or filename"
          aria-label="Search media"
          className={`${inputCls} max-w-xs`}
        />
        <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-[10px] border border-teal-600 px-4 text-sm font-semibold text-teal-700 hover:bg-teal-50">
          <ImagePlus className="size-4" aria-hidden="true" /> Upload
          <input type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/heic" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </label>
        {busy && <Loader2 className="size-5 animate-spin text-teal-700" aria-label="Loading" />}
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      </div>
      <ul className="grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto px-5 pb-5 sm:grid-cols-4 md:grid-cols-6">
        {data?.items.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => onPick({ id: m.id, url: m.url, altText: m.altText, width: m.width, height: m.height })}
              className="group block w-full overflow-hidden rounded-md border border-line text-left hover:border-teal-600"
              title={m.altText || m.filename}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.url} alt={m.altText} className="aspect-square w-full object-cover" loading="lazy" />
              <span className="block truncate px-1.5 py-1 text-xs text-ink-700">{m.altText || m.filename}</span>
              {m.licenceStatus !== "owner" && m.licenceStatus !== "licensed" && <span className="block px-1.5 pb-1 text-[10px] font-semibold uppercase text-sunset-600">{m.licenceStatus}</span>}
            </button>
          </li>
        ))}
      </ul>
      {data && data.pages > 1 && (
        <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">
          <Button type="button" variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span className="text-sm">
            Page {page} of {data.pages}
          </span>
          <Button type="button" variant="ghost" size="sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      )}
    </dialog>
  );
}
