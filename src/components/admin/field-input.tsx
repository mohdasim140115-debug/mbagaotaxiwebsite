"use client";

import { createContext, useContext, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { CTA_KINDS, defaultsFor, type FieldDef } from "@/lib/cms/fields";
import { MediaPickerDialog, type PickedMedia } from "./media-picker";
import { Field, inputCls } from "./ui";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ shared context */

type Ctx = {
  media: Record<number, { url: string; altText: string }>;
  addMedia: (m: PickedMedia) => void;
  refs: Record<string, { value: string; label: string }[]>;
  errors: Record<string, string>;
};
const FormCtx = createContext<Ctx>({ media: {}, addMedia: () => {}, refs: {}, errors: {} });

export function FormContextProvider({
  initialMedia,
  refs,
  errors,
  children,
}: {
  initialMedia: Record<number, { url: string; altText: string }>;
  refs: Ctx["refs"];
  errors: Record<string, string>;
  children: React.ReactNode;
}) {
  const [media, setMedia] = useState(initialMedia);
  return (
    <FormCtx.Provider value={{ media, addMedia: (m) => setMedia((prev) => ({ ...prev, [m.id]: { url: m.url, altText: m.altText } })), refs, errors }}>
      {children}
    </FormCtx.Provider>
  );
}

/* ------------------------------------------------------------------ list helpers */

function move<T>(list: T[], from: number, to: number) {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

function ReorderButtons({ index, length, onMove, onRemove, label }: { index: number; length: number; onMove: (to: number) => void; onRemove: () => void; label: string }) {
  return (
    <div className="flex shrink-0 gap-1">
      <button type="button" disabled={index === 0} onClick={() => onMove(index - 1)} aria-label={`Move ${label} up`} className="inline-flex size-8 items-center justify-center rounded-md hover:bg-sand-100 disabled:opacity-30">
        <ArrowUp className="size-4" aria-hidden="true" />
      </button>
      <button type="button" disabled={index === length - 1} onClick={() => onMove(index + 1)} aria-label={`Move ${label} down`} className="inline-flex size-8 items-center justify-center rounded-md hover:bg-sand-100 disabled:opacity-30">
        <ArrowDown className="size-4" aria-hidden="true" />
      </button>
      <button type="button" onClick={onRemove} aria-label={`Remove ${label}`} className="inline-flex size-8 items-center justify-center rounded-md text-danger hover:bg-danger-50">
        <Trash2 className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ media fields */

function MediaThumb({ id, onRemove }: { id: number; onRemove?: () => void }) {
  const { media } = useContext(FormCtx);
  const m = media[id];
  return (
    <div className="relative size-24 overflow-hidden rounded-md border border-line bg-sand-100">
      {m ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={m.url} alt={m.altText} className="size-full object-cover" />
      ) : (
        <span className="flex size-full items-center justify-center text-xs text-ink-500">#{id}</span>
      )}
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label="Remove image" className="absolute right-1 top-1 inline-flex size-6 items-center justify-center rounded-full bg-white/90 text-danger shadow-1">
          <X className="size-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

function MediaField({ value, onChange, multiple }: { value: number | null | number[]; onChange: (v: number | null | number[]) => void; multiple: boolean }) {
  const { addMedia } = useContext(FormCtx);
  const [open, setOpen] = useState(false);
  const list = multiple ? ((value as number[]) ?? []) : value ? [value as number] : [];
  return (
    <div>
      <div className="flex flex-wrap items-start gap-2">
        {list.map((id, i) => (
          <div key={`${id}-${i}`} className="flex flex-col items-center gap-1">
            <MediaThumb id={id} onRemove={() => onChange(multiple ? list.filter((_, j) => j !== i) : null)} />
            {multiple && list.length > 1 && (
              <div className="flex gap-1">
                <button type="button" disabled={i === 0} onClick={() => onChange(move(list, i, i - 1))} aria-label="Move image left" className="rounded px-1.5 text-xs hover:bg-sand-100 disabled:opacity-30">
                  ←
                </button>
                <button type="button" disabled={i === list.length - 1} onClick={() => onChange(move(list, i, i + 1))} aria-label="Move image right" className="rounded px-1.5 text-xs hover:bg-sand-100 disabled:opacity-30">
                  →
                </button>
              </div>
            )}
          </div>
        ))}
        {(multiple || list.length === 0) && (
          <button type="button" onClick={() => setOpen(true)} className="inline-flex size-24 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-ink-500/40 text-xs text-ink-700 hover:border-teal-600 hover:text-teal-700">
            <ImagePlus className="size-5" aria-hidden="true" />
            {multiple ? "Add image" : "Choose image"}
          </button>
        )}
        {!multiple && list.length === 1 && (
          <button type="button" onClick={() => setOpen(true)} className="self-center text-sm font-semibold text-teal-700 underline">
            Replace
          </button>
        )}
      </div>
      <MediaPickerDialog
        open={open}
        onClose={() => setOpen(false)}
        onPick={(m) => {
          addMedia(m);
          onChange(multiple ? [...list, m.id] : m.id);
          setOpen(false);
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ main renderer */

export function FieldInput({ def, value, onChange, path }: { def: FieldDef; value: unknown; onChange: (v: unknown) => void; path: string }) {
  const { refs, errors } = useContext(FormCtx);
  const id = `f-${path.replace(/[^a-zA-Z0-9]/g, "-")}`;
  const error = errors[path];
  const aria = { id, "aria-invalid": error ? true : undefined, "aria-describedby": error ? `${id}-err` : undefined };
  const label = "required" in def && def.required ? `${def.label} *` : def.label;

  switch (def.type) {
    case "text":
      return (
        <Field id={id} label={label} help={def.help} error={error}>
          <input {...aria} className={inputCls} value={(value as string) ?? ""} maxLength={def.max} placeholder={def.placeholder} onChange={(e) => onChange(e.target.value)} />
        </Field>
      );
    case "textarea":
      return (
        <Field id={id} label={label} help={def.help} error={error}>
          <textarea {...aria} className={cn(inputCls, "h-auto py-2 leading-relaxed")} rows={def.rows ?? 4} value={(value as string) ?? ""} maxLength={def.max} onChange={(e) => onChange(e.target.value)} />
        </Field>
      );
    case "number":
      return (
        <Field id={id} label={label} help={def.help} error={error}>
          <input
            {...aria}
            type="number"
            className={inputCls}
            min={def.min}
            max={def.max}
            step={def.step ?? "any"}
            value={value === null || value === undefined ? "" : String(value)}
            onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          />
        </Field>
      );
    case "boolean":
      return (
        <div>
          <label className="inline-flex items-start gap-2.5 text-sm font-medium">
            <input type="checkbox" className="mt-0.5 size-4 accent-teal-600" checked={value === true} onChange={(e) => onChange(e.target.checked)} />
            <span>
              {def.label}
              {def.help && <span className="block text-xs font-normal text-ink-500">{def.help}</span>}
            </span>
          </label>
        </div>
      );
    case "select":
      return (
        <Field id={id} label={label} help={def.help} error={error}>
          <select {...aria} className={inputCls} value={(value as string) ?? def.options[0]?.value} onChange={(e) => onChange(e.target.value)}>
            {def.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
      );
    case "ref": {
      const options = refs[def.entity] ?? [];
      return (
        <Field id={id} label={label} help={def.help} error={error}>
          <select {...aria} className={inputCls} value={value ? String(value) : ""} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}>
            <option value="">— Select —</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
      );
    }
    case "stringList": {
      const list = (value as string[]) ?? [];
      return (
        <fieldset>
          <legend className="text-sm font-semibold">{def.label}</legend>
          {def.help && <p className="text-xs text-ink-500">{def.help}</p>}
          <ul className="mt-1 space-y-1.5">
            {list.map((item, i) => (
              <li key={i} className="flex items-center gap-2">
                <input className={inputCls} aria-label={`${def.label} ${i + 1}`} value={item} onChange={(e) => onChange(list.map((x, j) => (j === i ? e.target.value : x)))} />
                <ReorderButtons index={i} length={list.length} label={`item ${i + 1}`} onMove={(to) => onChange(move(list, i, to))} onRemove={() => onChange(list.filter((_, j) => j !== i))} />
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => onChange([...list, ""])} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-teal-700">
            <Plus className="size-4" aria-hidden="true" /> Add item
          </button>
          {error && <p className="mt-1 text-sm text-danger">{error}</p>}
        </fieldset>
      );
    }
    case "media":
    case "mediaList":
      return (
        <fieldset>
          <legend className="text-sm font-semibold">{label}</legend>
          {def.help && <p className="text-xs text-ink-500">{def.help}</p>}
          <div className="mt-1">
            <MediaField value={value as number | null | number[]} multiple={def.type === "mediaList"} onChange={onChange} />
          </div>
          {error && <p className="mt-1 text-sm text-danger">{error}</p>}
        </fieldset>
      );
    case "cta": {
      const cta = (value as { label: string; kind: string; href: string; message: string }) ?? { label: "", kind: "link", href: "", message: "" };
      const set = (patch: Partial<typeof cta>) => onChange({ ...cta, ...patch });
      return (
        <fieldset className="rounded-md border border-line p-3">
          <legend className="px-1 text-sm font-semibold">{def.label}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id={`${id}-label`} label="Button text (empty = hidden)">
              <input id={`${id}-label`} className={inputCls} value={cta.label} maxLength={60} onChange={(e) => set({ label: e.target.value })} />
            </Field>
            <Field id={`${id}-kind`} label="Action">
              <select id={`${id}-kind`} className={inputCls} value={cta.kind} onChange={(e) => set({ kind: e.target.value })}>
                {CTA_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </Field>
            {(cta.kind === "link" || cta.kind === "enquiry") && (
              <Field id={`${id}-href`} label={cta.kind === "link" ? "Link" : "Form link (optional)"} error={errors[`${path}.href`]}>
                <input id={`${id}-href`} className={inputCls} value={cta.href} placeholder="/packages/" onChange={(e) => set({ href: e.target.value })} />
              </Field>
            )}
            {(cta.kind === "whatsapp" || cta.kind === "booking") && (
              <Field id={`${id}-msg`} label="Prefilled WhatsApp message (optional)">
                <input id={`${id}-msg`} className={inputCls} value={cta.message} maxLength={300} onChange={(e) => set({ message: e.target.value })} />
              </Field>
            )}
          </div>
        </fieldset>
      );
    }
    case "repeater": {
      const list = (value as Record<string, unknown>[]) ?? [];
      const itemLabel = def.itemLabel ?? "Item";
      return (
        <fieldset>
          <legend className="text-sm font-semibold">{def.label}</legend>
          {def.help && <p className="text-xs text-ink-500">{def.help}</p>}
          <ol className="mt-2 space-y-3">
            {list.map((item, i) => (
              <li key={i} className="rounded-md border border-line bg-paper p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink-700">
                    {itemLabel} {i + 1}
                  </span>
                  <ReorderButtons index={i} length={list.length} label={`${itemLabel} ${i + 1}`} onMove={(to) => onChange(move(list, i, to))} onRemove={() => onChange(list.filter((_, j) => j !== i))} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {def.fields.map((sub) => (
                    <div key={sub.name} className={sub.type === "textarea" || sub.type === "repeater" ? "sm:col-span-2" : ""}>
                      <FieldInput def={sub} path={`${path}.${i}.${sub.name}`} value={item[sub.name]} onChange={(v) => onChange(list.map((x, j) => (j === i ? { ...x, [sub.name]: v } : x)))} />
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ol>
          <button type="button" onClick={() => onChange([...list, defaultsFor(def.fields)])} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-teal-700">
            <Plus className="size-4" aria-hidden="true" /> Add {itemLabel.toLowerCase()}
          </button>
          {errors[path] && <p className="mt-1 text-sm text-danger">{errors[path]}</p>}
        </fieldset>
      );
    }
  }
}

export function FieldGrid({ fields, values, onChange, prefix = "" }: { fields: FieldDef[]; values: Record<string, unknown>; onChange: (name: string, v: unknown) => void; prefix?: string }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {fields.map((f) => (
        <div key={f.name} className={["textarea", "repeater", "mediaList", "stringList", "cta"].includes(f.type) ? "md:col-span-2" : ""}>
          <FieldInput def={f} path={prefix ? `${prefix}.${f.name}` : f.name} value={values[f.name]} onChange={(v) => onChange(f.name, v)} />
        </div>
      ))}
    </div>
  );
}
