"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Copy, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { SECTION_TYPES, SECTION_TYPE_KEYS, sectionDefaults, type SectionType } from "@/lib/cms/sections";
import { deletePageAction, publishPageAction, restorePageRevisionAction, savePageAction, setPageStatusAction } from "@/server/admin/content-actions";
import { Button } from "@/components/ui/button";
import { FieldGrid, FormContextProvider } from "./field-input";
import { SeoFields, type SeoValues } from "./seo-panel";
import { ActionButton, Badge, Card, Field, Notice, inputCls } from "./ui";
import { cn, formatDateTime } from "@/lib/utils";

type EditorSection = { key: string; type: SectionType; isEnabled: boolean; data: Record<string, unknown>; open: boolean };
type Revision = { id: number; version: number; summary: string; createdAt: Date | string; editor: string | null };

let counter = 0;
const nextKey = () => `s${++counter}`;

export function PageEditor(props: {
  id: number | null;
  initial: { title: string; path: string; template: string; scheduledAt: string; sections: { type: SectionType; isEnabled: boolean; data: Record<string, unknown> }[] };
  seo: SeoValues;
  version: number | null;
  status: string;
  isSystem: boolean;
  hasUnpublishedChanges: boolean;
  updatedAt?: string;
  updatedBy?: string | null;
  siteUrl: string;
  media: Record<number, { url: string; altText: string }>;
  refs: Record<string, { value: string; label: string }[]>;
  revisions: Revision[];
  can: { edit: boolean; publish: boolean; delete: boolean; seo: boolean };
}) {
  const router = useRouter();
  const [title, setTitle] = useState(props.initial.title);
  const [path, setPath] = useState(props.initial.path);
  const [scheduledAt, setScheduledAt] = useState(props.initial.scheduledAt);
  const [seo, setSeo] = useState(props.seo);
  const [sections, setSections] = useState<EditorSection[]>(() => props.initial.sections.map((s) => ({ ...s, key: nextKey(), open: false })));
  const [addType, setAddType] = useState<SectionType>("rich_text");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();

  const touch = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setDirty(true);
  };
  const update = (key: string, patch: Partial<EditorSection>) => {
    setSections((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));
    setDirty(true);
  };
  const moveSection = (i: number, to: number) => {
    setSections((prev) => {
      const next = [...prev];
      const [s] = next.splice(i, 1);
      next.splice(to, 0, s!);
      return next;
    });
    setDirty(true);
  };

  const save = (thenPublish = false) =>
    start(async () => {
      setNotice(null);
      const r = await savePageAction(props.id, { title, path, template: props.initial.template, scheduledAt, sections: sections.map(({ type, isEnabled, data }) => ({ type, isEnabled, data })), seo }, props.version);
      if (!r.ok) {
        setErrors(r.fieldErrors ?? {});
        setNotice({ kind: "error", text: r.fieldErrors?.sections ?? r.error });
        // Open sections that contain errors.
        const bad = Object.keys(r.fieldErrors ?? {}).map((k) => Number(k.split(".")[1])).filter((n) => !Number.isNaN(n));
        setSections((prev) => prev.map((s, i) => (bad.includes(i) ? { ...s, open: true } : s)));
        return;
      }
      setErrors({});
      setDirty(false);
      if (thenPublish) {
        const p = await publishPageAction(r.data.id);
        if (!p.ok) return setNotice({ kind: "error", text: p.error });
        setNotice({ kind: "success", text: "Saved and published. The live page is updated." });
      } else {
        setNotice({ kind: "success", text: "Draft saved. The live page is unchanged until you publish." });
      }
      if (props.id === null) router.push(`/admin/pages/${r.data.id}/`);
      else router.refresh();
    });

  const sectionErrors = (i: number) => Object.entries(errors).filter(([k]) => k.startsWith(`sections.${i}.`) || k === `sections.${i}`);

  return (
    <FormContextProvider
      initialMedia={props.media}
      refs={props.refs}
      errors={Object.fromEntries(Object.entries(errors).map(([k, v]) => [k.replace(/^sections\.(\d+)\./, "sec$1."), v]))}
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {notice && <Notice kind={notice.kind}>{notice.text}</Notice>}
          <Card title="Page">
            <fieldset disabled={!props.can.edit} className="grid gap-4 md:grid-cols-2">
              <Field id="page-title" label="Page title *" error={errors.title} help="Used for the browser tab title and breadcrumbs.">
                <input id="page-title" className={inputCls} value={title} maxLength={191} onChange={(e) => touch(setTitle)(e.target.value)} />
              </Field>
              <Field id="page-path" label="URL path *" error={errors.path} help={props.isSystem ? "Original site URL — locked to protect search rankings." : "e.g. /goa-tours/"}>
                <input id="page-path" className={inputCls} value={path} disabled={props.isSystem} onChange={(e) => touch(setPath)(e.target.value)} />
              </Field>
            </fieldset>
          </Card>

          <Card title={`Sections (${sections.length})`}>
            {errors.sections && <Notice kind="error">{errors.sections}</Notice>}
            <ol className="space-y-3">
              {sections.map((s, i) => {
                const def = SECTION_TYPES[s.type];
                const errs = sectionErrors(i);
                const heading = String(s.data.title ?? s.data.eyebrow ?? "") || def.description;
                return (
                  <li key={s.key} className={cn("rounded-[10px] border", errs.length ? "border-danger" : "border-line", !s.isEnabled && "opacity-70")}>
                    <div className="flex flex-wrap items-center gap-2 px-3 py-2">
                      <button type="button" onClick={() => update(s.key, { open: !s.open })} aria-expanded={s.open} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                        <ChevronDown className={cn("size-4 shrink-0 transition-transform", s.open && "rotate-180")} aria-hidden="true" />
                        <span className="shrink-0 rounded bg-sand-100 px-2 py-0.5 text-xs font-semibold">{def.label}</span>
                        <span className="truncate text-sm text-ink-700">{heading}</span>
                        {!s.isEnabled && <Badge value="draft" label="hidden" />}
                        {errs.length > 0 && <span className="text-xs font-semibold text-danger">{errs.length} error(s)</span>}
                      </button>
                      {props.can.edit && (
                        <div className="flex gap-1">
                          <button type="button" onClick={() => update(s.key, { isEnabled: !s.isEnabled })} aria-label={s.isEnabled ? "Hide section" : "Show section"} title={s.isEnabled ? "Hide section" : "Show section"} className="inline-flex size-8 items-center justify-center rounded-md hover:bg-sand-100">
                            {s.isEnabled ? <Eye className="size-4" aria-hidden="true" /> : <EyeOff className="size-4" aria-hidden="true" />}
                          </button>
                          <button type="button" disabled={i === 0} onClick={() => moveSection(i, i - 1)} aria-label="Move section up" className="inline-flex size-8 items-center justify-center rounded-md hover:bg-sand-100 disabled:opacity-30">
                            <ArrowUp className="size-4" aria-hidden="true" />
                          </button>
                          <button type="button" disabled={i === sections.length - 1} onClick={() => moveSection(i, i + 1)} aria-label="Move section down" className="inline-flex size-8 items-center justify-center rounded-md hover:bg-sand-100 disabled:opacity-30">
                            <ArrowDown className="size-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSections((prev) => [...prev.slice(0, i + 1), { ...s, key: nextKey(), data: structuredClone(s.data) }, ...prev.slice(i + 1)]);
                              setDirty(true);
                            }}
                            aria-label="Duplicate section"
                            className="inline-flex size-8 items-center justify-center rounded-md hover:bg-sand-100"
                          >
                            <Copy className="size-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!window.confirm(`Remove the “${def.label}” section?`)) return;
                              setSections((prev) => prev.filter((x) => x.key !== s.key));
                              setDirty(true);
                            }}
                            aria-label="Remove section"
                            className="inline-flex size-8 items-center justify-center rounded-md text-danger hover:bg-danger-50"
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                          </button>
                        </div>
                      )}
                    </div>
                    {s.open && (
                      <div className="border-t border-line p-4">
                        <p className="mb-3 text-xs text-ink-500">{def.description}</p>
                        {errs.length > 0 && (
                          <ul className="mb-3 list-disc pl-5 text-sm text-danger">
                            {errs.map(([k, v]) => (
                              <li key={k}>
                                {k.split(".").slice(3).join(" › ") || "Section"}: {v}
                              </li>
                            ))}
                          </ul>
                        )}
                        <fieldset disabled={!props.can.edit}>
                          <FieldGrid fields={def.fields} prefix={`sec${i}`} values={s.data} onChange={(name, v) => update(s.key, { data: { ...s.data, [name]: v } })} />
                        </fieldset>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
            {props.can.edit && (
              <div className="mt-4 flex flex-wrap items-end gap-2">
                <Field id="add-section" label="Add a section">
                  <select id="add-section" className={inputCls} value={addType} onChange={(e) => setAddType(e.target.value as SectionType)}>
                    {SECTION_TYPE_KEYS.map((k) => (
                      <option key={k} value={k}>
                        {SECTION_TYPES[k].label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setSections((prev) => [...prev, { key: nextKey(), type: addType, isEnabled: true, data: sectionDefaults(addType), open: true }]);
                    setDirty(true);
                  }}
                >
                  <Plus aria-hidden="true" /> Add section
                </Button>
              </div>
            )}
          </Card>

          <Card title="SEO">
            <SeoFields value={seo} onChange={touch(setSeo)} fallbackTitle={`${title} - MBA Travels Goa`} url={`${props.siteUrl}${path}`} disabled={!props.can.seo} />
            {!props.can.seo && <p className="mt-2 text-xs text-ink-500">You don’t have permission to change SEO settings.</p>}
          </Card>
        </div>

        <aside className="space-y-4">
          <Card title="Publishing">
            <div className="space-y-3 text-sm">
              <p className="flex items-center justify-between">
                Status <Badge value={props.status} />
              </p>
              {props.hasUnpublishedChanges && props.status === "published" && <p className="font-semibold text-sunset-600">Draft changes not yet published.</p>}
              {props.updatedAt && (
                <p className="text-ink-500">
                  Last saved {formatDateTime(props.updatedAt)}
                  {props.updatedBy ? ` by ${props.updatedBy}` : ""}
                </p>
              )}
              {props.can.edit && (
                <>
                  <Button type="button" className="w-full" variant="secondary" disabled={pending} onClick={() => save(false)}>
                    {pending ? "Saving…" : "Save draft"}
                  </Button>
                  {props.id !== null && (
                    <a href={`/admin/preview/pages/${props.id}/`} target="_blank" rel="noopener" className="flex h-9 items-center justify-center rounded-[10px] border border-line text-sm font-semibold hover:bg-sand-100">
                      Preview saved draft
                    </a>
                  )}
                </>
              )}
              {props.can.publish && props.can.edit && (
                <Button type="button" className="w-full" disabled={pending} onClick={() => save(true)}>
                  {props.status === "published" ? "Save & update live page" : "Save & publish"}
                </Button>
              )}
              {props.can.edit && (
                <Field id="schedule" label="Schedule publication (optional)" help="Publishes automatically at this time (India time).">
                  <input id="schedule" type="datetime-local" className={inputCls} value={scheduledAt} onChange={(e) => touch(setScheduledAt)(e.target.value)} />
                </Field>
              )}
              {props.id !== null && props.can.publish && (
                <div className="flex flex-wrap gap-2 border-t border-line pt-3">
                  {props.status === "published" && (
                    <ActionButton action={() => setPageStatusAction(props.id!, "draft")} confirmText="Unpublish this page? Visitors will get a 404." onDone={(r) => r.ok && router.refresh()}>
                      Unpublish
                    </ActionButton>
                  )}
                  {props.status !== "archived" ? (
                    <ActionButton action={() => setPageStatusAction(props.id!, "archived")} confirmText="Archive this page?" onDone={(r) => r.ok && router.refresh()}>
                      Archive
                    </ActionButton>
                  ) : (
                    <ActionButton action={() => setPageStatusAction(props.id!, "draft")} onDone={(r) => r.ok && router.refresh()}>
                      Restore from archive
                    </ActionButton>
                  )}
                  {props.can.delete && !props.isSystem && props.status !== "published" && (
                    <ActionButton variant="danger" action={() => deletePageAction(props.id!)} confirmText="Delete this page permanently?" onDone={(r) => r.ok && router.push("/admin/pages/")}>
                      Delete
                    </ActionButton>
                  )}
                </div>
              )}
              {dirty && <p className="text-xs font-semibold text-sunset-600">You have unsaved changes.</p>}
            </div>
          </Card>
          {props.revisions.length > 0 && (
            <Card title="Revision history">
              <ol className="max-h-96 space-y-2 overflow-y-auto text-sm">
                {props.revisions.map((r) => (
                  <li key={r.id} className="flex items-start justify-between gap-2">
                    <span>
                      <span className="font-semibold">v{r.version}</span> {r.summary}
                      <span className="block text-xs text-ink-500">
                        {formatDateTime(r.createdAt)} · {r.editor ?? "system"}
                      </span>
                    </span>
                    {props.can.edit && props.id !== null && (
                      <ActionButton variant="ghost" action={() => restorePageRevisionAction(props.id!, r.id)} confirmText={`Load version ${r.version} into the editor as a draft?`} onDone={(res) => res.ok && window.location.reload()}>
                        Restore
                      </ActionButton>
                    )}
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </aside>
      </div>
    </FormContextProvider>
  );
}
