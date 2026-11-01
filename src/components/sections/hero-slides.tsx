"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Pause, Play } from "lucide-react";
import type { MediaItem } from "@/server/cms/public";
import { cn } from "@/lib/utils";

const INTERVAL = 7000;

/** Cross-fading background slides with a visible pause control (WCAG 2.2.2). Static under reduced motion. */
export function HeroSlides({ images }: { images: MediaItem[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- media query is browser-only; read after hydration
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (paused || reduced || images.length < 2) return;
    const t = window.setInterval(() => {
      if (!document.hidden) setIndex((i) => (i + 1) % images.length);
    }, INTERVAL);
    return () => window.clearInterval(t);
  }, [paused, reduced, images.length]);

  if (!images.length) return null;

  return (
    <>
      <div className="absolute inset-0 -z-10">
        {images.map((img, i) => (
          <Image
            key={img.id}
            src={img.url}
            alt={i === index ? img.alt : ""}
            aria-hidden={i === index ? undefined : true}
            fill
            sizes="100vw"
            priority={i === 0}
            loading={i === 0 ? undefined : "lazy"}
            quality={75}
            className={cn("object-cover transition-opacity duration-1000 ease-in-out", i === index ? "hero-kenburns opacity-100" : "opacity-0")}
          />
        ))}
      </div>
      {images.length > 1 && (
        <div className="absolute right-4 top-24 z-20 flex items-center gap-3 md:right-8">
          <div className="hidden gap-1.5 sm:flex" role="group" aria-label="Choose slide">
            {images.map((img, i) => (
              <button
                key={img.id}
                type="button"
                aria-label={`Show slide ${i + 1} of ${images.length}`}
                aria-pressed={i === index}
                onClick={() => setIndex(i)}
                className="flex h-11 w-6 items-center justify-center"
              >
                <span className={cn("block h-1.5 rounded-full bg-white/50 transition-all", i === index ? "w-6 bg-white" : "w-1.5")} />
              </button>
            ))}
          </div>
          {!reduced && (
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? "Play slideshow" : "Pause slideshow"}
              className="inline-flex size-11 items-center justify-center rounded-full border border-white/40 text-white hover:bg-white/10"
            >
              {paused ? <Play className="size-4" aria-hidden="true" /> : <Pause className="size-4" aria-hidden="true" />}
            </button>
          )}
        </div>
      )}
    </>
  );
}
