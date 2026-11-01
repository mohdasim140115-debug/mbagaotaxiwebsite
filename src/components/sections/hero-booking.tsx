"use client";

import { useId, useState } from "react";
import { ArrowRight, Calendar, Car, Hotel, MapPin, Map as MapIcon, PlaneTakeoff, Users, type LucideIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { track } from "@/components/analytics/track";
import { whatsappHref } from "@/lib/cms/settings-def";
import { cn } from "@/lib/utils";

type Field = { label: string; placeholder: string; icon: LucideIcon; type?: "date" };
type Tab = { label: string; icon: LucideIcon; cta: string; intro: string; fields: [Field, Field, Field] };

const DATE = (label: string): Field => ({ label, placeholder: "", icon: Calendar, type: "date" });
const TABS: Record<string, Tab> = {
  taxi: {
    label: "Taxi Services", icon: Car, cta: "Find Taxi", intro: "Hi, I would like to book a taxi.",
    fields: [{ label: "Pickup Location", placeholder: "Pickup point", icon: MapPin }, { label: "Drop Location", placeholder: "Drop point", icon: MapPin }, DATE("Travel Date")],
  },
  hotel: {
    label: "Hotel Booking", icon: Hotel, cta: "Find Hotel", intro: "Hi, I need help with a hotel booking.",
    fields: [{ label: "Area / Hotel", placeholder: "Area or hotel", icon: MapPin }, { label: "Guests", placeholder: "Number of guests", icon: Users }, DATE("Check-in Date")],
  },
  tour: {
    label: "Tour Packages", icon: MapIcon, cta: "View Tours", intro: "Hi, I am interested in a Goa tour package.",
    fields: [{ label: "Tour / Package", placeholder: "e.g. North Goa Tour", icon: MapPin }, { label: "Travellers", placeholder: "Number of travellers", icon: Users }, DATE("Travel Date")],
  },
  airport: {
    label: "Airport Transfer", icon: PlaneTakeoff, cta: "Book Transfer", intro: "Hi, I would like to book an airport transfer.",
    fields: [{ label: "Pickup Airport", placeholder: "Dabolim or Mopa", icon: PlaneTakeoff }, { label: "Drop Location", placeholder: "Drop point", icon: MapPin }, DATE("Travel Date")],
  },
};

/**
 * Quick-enquiry panel. Submitting opens WhatsApp (the business's existing booking channel) on the
 * number from Site settings with a message built from the fields. Nothing is stored or guessed.
 */
export function HeroBooking({ whatsapp, chips }: { whatsapp: string; chips: string[] }) {
  const uid = useId();
  const [tab, setTab] = useState<keyof typeof TABS>("taxi");
  const [values, setValues] = useState<string[]>(["", "", ""]);
  const t = TABS[tab]!;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const details = t.fields.map((f, i) => (values[i] ? `${f.label}: ${values[i]}` : "")).filter(Boolean).join(". ");
    const message = `${t.intro}${details ? ` ${details}.` : ""}`;
    track("whatsapp_click", { context: `hero_panel:${tab}` });
    window.open(whatsappHref(whatsapp, message), "_blank", "noopener,noreferrer");
  };

  return (
    <div className="w-full max-w-[760px] rounded-[20px] bg-white text-ink-900 shadow-3">
      <div className="p-3 sm:p-4">
        <div role="group" aria-label="What do you need?" className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {(["taxi", "airport", "tour", "hotel"] as const).map((key) => {
            const tb = TABS[key]!;
            const Icon = tb.icon;
            const active = key === tab;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                onClick={() => setTab(key)}
                className={cn(
                  "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-[10px] px-3.5 text-sm font-semibold transition-colors sm:px-4",
                  active ? "bg-[#c2410c] text-white" : "bg-sand-100 text-ink-900 hover:bg-[#ece3d1]",
                )}
              >
                <Icon className="size-4" aria-hidden="true" /> {tb.label}
              </button>
            );
          })}
        </div>
        <form onSubmit={submit} className="mt-3 grid gap-3 md:grid-cols-[1.25fr_1.25fr_1fr_auto] md:items-end">
          {t.fields.map((f, i) => {
            const Icon = f.icon;
            const id = `${uid}-${tab}-${i}`;
            return (
              <div key={`${tab}-${i}`}>
                <label htmlFor={id} className="mb-1 block text-xs font-semibold text-ink-700">
                  {f.label}
                </label>
                <div className="relative">
                  <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-sunset-600" aria-hidden="true" />
                  <input
                    id={id}
                    type={f.type ?? "text"}
                    value={values[i]}
                    placeholder={f.placeholder}
                    onChange={(e) => setValues((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
                    className="h-12 w-full rounded-[10px] border border-line bg-white pl-9 pr-2 text-[13px] text-ink-900 placeholder:text-ink-500 focus:border-teal-600"
                  />
                </div>
              </div>
            );
          })}
          <button type="submit" className={cn(buttonVariants({ variant: "primary", size: "lg" }), "w-full md:w-auto md:px-5")}>
            {t.cta} <ArrowRight aria-hidden="true" />
            <span className="sr-only"> (opens WhatsApp in a new tab)</span>
          </button>
        </form>
      </div>
      {chips.length > 0 && (
        <ul className="hidden flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-line px-5 py-3 text-xs text-ink-700 md:flex">
          {chips.map((c) => (
            <li key={c} className="font-medium">
              {c}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
