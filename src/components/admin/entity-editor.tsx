"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ENTITIES, type EntityKey } from "@/lib/cms/entities";
import { deleteEntityAction, restoreEntityRevisionAction, saveEntityAction, setEntityStatusAction } from "@/server/admin/content-actions";
import { Button } from "@/components/ui/button";
import { FieldGrid, FormContextProvider } from "./field-input";
import { ActionButton, Badge, Card, Notice, inputCls } from "./ui";
import { formatDateTime } from "@/lib/utils";

type Revision = { id: number; version: number; summary: string; createdAt: Date | string; editor: string | null };

export function EntityEditor({
  entity,
  id,
  initial,
  version,
  status,
  media,
  refs,
  revisions,
  can,
  updatedAt,
  publicPath,
  seoSlot,
}: {
  entity: EntityKey;
  id: number | null;
  initial: Record<string, unknown>;
  version: number | null;
  status: string;
  media: Record<number, { url: string; altText: string }>;
  refs: Record<string, { value: string; label: string }[]>;
  revisions: Revision[];
  can: { edit: boolean; publish: boolean; delete: boolean };
  updatedAt?: string;
  publicPath?: string | null;
  seoSlot?: React.ReactNode;
}) {
  const def = ENTITIES[entity];
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [summary, setSummary] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const [dirty, setDirty] = useState(false);

  const save = () =>
    start(async () => {
      setNotice(null);
      const r = await saveEntityAction(entity, id, values, version, summary);
      if (!r.ok) {
        setErrors(r.fieldErrors ?? {});
        setNotice({ kind: "error", text: r.error });
        return;
      }
      setErrors({});
      setDirty(false);
      setSummary("");
      setNotice({ kind: "success", text: id === null ? "Created as a draft." : "Saved." });
      if (id === null) router.push(`/admin/content/${entity}/${r.data.id}/`);
      else router.refresh();
    });

  return (
    <FormContextProvider initialMedia={media} refs={refs} errors={errors}>
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {def.help && <Notice kind="info">{def.help}</Notice>}
          {notice && <Notice kind={notice.kind}>{notice.text}</Notice>}
          <Card title={`${def.singular} details`}>
            <fieldset disabled={!can.edit || pending}>
              <FieldGrid
                fields={def.fields}
                values={values}
                onChange={(name, v) => {
                  setValues((prev) => ({ ...prev, [name]: v }));
                  setDirty(true);
                }}
              />
            </fieldset>
          </Card>
          {seoSlot}
        </div>
        <aside className="space-y-4">
          <Card title="Publishing">
            <div className="space-y-3 text-sm">
              <p className="flex items-center justify-between">
                Status <Badge value={status} />
              </p>
              {updatedAt && <p className="text-ink-500">Last saved {formatDateTime(updatedAt)}</p>}
              {version !== null && <p className="text-ink-500">Version {version}</p>}
              {publicPath && status === "published" && (
                <a href={publicPath} target="_blank" rel="noopener" className="font-semibold text-teal-700 underline">
                  View on site
                </a>
              )}
              {can.edit && (
                <>
                  <label htmlFor="change-summary" className="block font-semibold">
                    Change note (optional)
                  </label>
                  <input id="change-summary" className={inputCls} value={summary} maxLength={200} onChange={(e) => setSummary(e.target.value)} placeholder="e.g. Updated price" />
                  <Button type="button" onClick={save} disabled={pending} className="w-full">
                    {pending ? "Saving…" : id === null ? "Create draft" : dirty ? "Save changes" : "Save"}
                  </Button>
                </>
              )}
              {id !== null && can.publish && (
                <div className="flex flex-wrap gap-2 border-t border-line pt-3">
                  {status !== "published" && (
                    <ActionButton variant="primary" action={() => setEntityStatusAction(entity, id, "published")} onDone={(r) => r.ok && router.refresh()}>
                      Publish
                    </ActionButton>
                  )}
                  {status === "published" && (
                    <ActionButton action={() => setEntityStatusAction(entity, id, "draft")} confirmText="Unpublish? It will disappear from the website." onDone={(r) => r.ok && router.refresh()}>
                      Unpublish
                    </ActionButton>
                  )}
                  {status !== "archived" ? (
                    <ActionButton action={() => setEntityStatusAction(entity, id, "archived")} confirmText="Archive this item?" onDone={(r) => r.ok && router.refresh()}>
                      Archive
                    </ActionButton>
                  ) : (
                    <ActionButton action={() => setEntityStatusAction(entity, id, "draft")} onDone={(r) => r.ok && router.refresh()}>
                      Restore from archive
                    </ActionButton>
                  )}
                </div>
              )}
              {id !== null && can.delete && status !== "published" && (
                <div className="border-t border-line pt-3">
                  <ActionButton variant="danger" action={() => deleteEntityAction(entity, id)} confirmText="Permanently delete? This cannot be undone." onDone={(r) => r.ok && router.push(`/admin/content/${entity}/`)}>
                    Delete permanently
                  </ActionButton>
                </div>
              )}
              {dirty && <p className="text-xs font-semibold text-sunset-600">You have unsaved changes.</p>}
            </div>
          </Card>
          {id !== null && revisions.length > 0 && (
            <Card title="Revision history">
              <ol className="space-y-2 text-sm">
                {revisions.map((r) => (
                  <li key={r.id} className="flex items-start justify-between gap-2">
                    <span>
                      <span className="font-semibold">v{r.version}</span> {r.summary}
                      <span className="block text-xs text-ink-500">
                        {formatDateTime(r.createdAt)} · {r.editor ?? "system"}
                      </span>
                    </span>
                    {can.edit && r.version !== version && (
                      <ActionButton variant="ghost" action={() => restoreEntityRevisionAction(entity, id, r.id, version ?? 0)} confirmText={`Restore version ${r.version}? Current values become a new revision.`} onDone={(res) => res.ok && window.location.reload()}>
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
