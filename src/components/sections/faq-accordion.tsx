"use client";

import { useId, useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/** Disclosure accordion: real buttons with aria-expanded; answers stay in the DOM for crawlers. */
export function FaqAccordion({ items }: { items: { id: number; question: string; answer: string }[] }) {
  const [open, setOpen] = useState<number | null>(items[0]?.id ?? null);
  const base = useId();
  return (
    <div className="divide-y divide-line rounded-[16px] border border-line bg-paper-raised">
      {items.map((f) => {
        const expanded = open === f.id;
        const panelId = `${base}-panel-${f.id}`;
        const btnId = `${base}-btn-${f.id}`;
        return (
          <div key={f.id}>
            <h3>
              <button
                id={btnId}
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => setOpen(expanded ? null : f.id)}
                className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left text-lg font-semibold hover:bg-sand-100/60 md:px-6"
              >
                {f.question}
                <Plus className={cn("size-5 shrink-0 text-teal-700 transition-transform", expanded && "rotate-45")} aria-hidden="true" />
              </button>
            </h3>
            <div id={panelId} role="region" aria-labelledby={btnId} hidden={!expanded} className="px-5 pb-5 text-ink-700 md:px-6">
              <p>{f.answer}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
