"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { MediaItem } from "@/server/cms/public";
import { cn } from "@/lib/utils";

/** Swipeable, scroll-snap image carousel with labelled prev/next buttons. No autoplay. */
export function HotelCarousel({ name, images, priority }: { name: string; images: MediaItem[]; priority?: boolean }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const go = (next: number) => {
    const el = track.current;
    if (!el) return;
    const i = (next + images.length) % images.length;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  if (!images.length) return <div className="aspect-[4/3] bg-sand-100" aria-hidden="true" />;

  return (
    <div className="relative" role="group" aria-roledescription="carousel" aria-label={`${name} photos`}>
      <div
        ref={track}
        tabIndex={0}
        aria-label={`${name} photo strip — use arrow keys to scroll`}
        className="no-scrollbar flex aspect-[4/3] snap-x snap-mandatory overflow-x-auto"
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.round(el.scrollLeft / el.clientWidth));
        }}
      >
        {images.map((img, i) => (
          <div key={img.id} className="relative h-full w-full shrink-0 snap-center" aria-roledescription="slide" aria-label={`${i + 1} of ${images.length}`}>
            <Image
              src={img.url}
              alt={img.alt || `${name} — photo ${i + 1}`}
              fill
              sizes="(min-width:1280px) 30vw, (min-width:768px) 45vw, 100vw"
              className="object-cover"
              priority={priority && i === 0}
            />
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <>
          <button type="button" onClick={() => go(index - 1)} aria-label="Previous photo" className="absolute left-2 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink-900 shadow-1 hover:bg-white">
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => go(index + 1)} aria-label="Next photo" className="absolute right-2 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink-900 shadow-1 hover:bg-white">
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
          <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5" aria-hidden="true">
            {images.map((img, i) => (
              <span key={img.id} className={cn("h-1.5 rounded-full bg-white/60 transition-all", i === index ? "w-5 bg-white" : "w-1.5")} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
