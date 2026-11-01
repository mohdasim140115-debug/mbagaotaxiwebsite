"use client";

import { Children, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Horizontal snap list on small screens with dot indicators; `className` styles the list itself. */
export function Slider({ children, className, dotsClassName = "md:hidden", tone = "dark", label }: { children: ReactNode; className?: string; dotsClassName?: string; tone?: "dark" | "light"; label: string }) {
  const ref = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const count = Children.count(children);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      const first = el.children[0] as HTMLElement | undefined;
      const second = el.children[1] as HTMLElement | undefined;
      const step = first && second ? second.offsetLeft - first.offsetLeft : el.clientWidth;
      const max = el.scrollWidth - el.clientWidth;
      setActive(el.scrollLeft >= max - 4 ? count - 1 : Math.min(count - 1, Math.max(0, Math.round(el.scrollLeft / (step || 1)))));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [count]);

  const go = (i: number) => {
    const el = ref.current;
    const child = el?.children[i] as HTMLElement | undefined;
    if (el && child) el.scrollTo({ left: child.offsetLeft - (el.clientWidth - child.offsetWidth) / 2, behavior: "smooth" });
  };

  return (
    <>
      <ul ref={ref} className={className}>
        {children}
      </ul>
      {count > 1 && (
        <div className={cn("flex justify-center gap-2", dotsClassName)} role="group" aria-label={label}>
          {Array.from({ length: count }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              aria-label={`Show card ${i + 1} of ${count}`}
              aria-current={i === active}
              className="flex size-6 items-center justify-center"
            >
              <span className={cn("h-2 rounded-full transition-all", i === active ? "w-6 bg-sunset-500" : cn("w-2", tone === "light" ? "bg-white/40" : "bg-ink-700/30"))} />
            </button>
          ))}
        </div>
      )}
    </>
  );
}
