"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { MediaItem } from "@/server/cms/public";

/** Gallery with an accessible lightbox built on the native <dialog> element. */
export function GalleryGrid({ images }: { images: MediaItem[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState<number | null>(null);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (index !== null && !d.open) d.showModal();
    if (index === null && d.open) d.close();
  }, [index]);

  const current = index !== null ? images[index] : null;
  const step = (delta: number) => setIndex((i) => (i === null ? i : (i + delta + images.length) % images.length));

  return (
    <>
      <ul className="mt-12 columns-1 gap-4 sm:columns-2 lg:columns-3">
        {images.map((img, i) => (
          <li key={img.id} className="mb-4 break-inside-avoid">
            <figure>
              <button type="button" onClick={() => setIndex(i)} className="block w-full overflow-hidden rounded-[10px]" aria-label={`Open photo: ${img.alt || img.caption || i + 1}`}>
                <Image src={img.url} alt={img.alt} width={img.width} height={img.height} sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" className="h-auto w-full transition-transform duration-500 hover:scale-[1.03]" />
              </button>
              {img.caption && <figcaption className="mt-2 text-sm text-ink-700">{img.caption}</figcaption>}
            </figure>
          </li>
        ))}
      </ul>
      <dialog
        ref={dialog}
        onClose={() => setIndex(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") step(1);
          if (e.key === "ArrowLeft") step(-1);
        }}
        aria-label="Photo viewer"
        className="m-auto max-h-[92dvh] w-[min(1100px,94vw)] bg-transparent p-0 backdrop:bg-ocean-900/90"
      >
        {current && (
          <figure className="relative">
            <Image src={current.url} alt={current.alt} width={current.width} height={current.height} sizes="94vw" className="mx-auto max-h-[80dvh] w-auto rounded-[10px] object-contain" />
            {current.caption && <figcaption className="mt-3 text-center text-white">{current.caption}</figcaption>}
          </figure>
        )}
        <div className="mt-3 flex justify-center gap-2">
          <button type="button" onClick={() => step(-1)} aria-label="Previous photo" className="inline-flex size-11 items-center justify-center rounded-full bg-white text-ink-900">
            <ChevronLeft aria-hidden="true" />
          </button>
          <button type="button" onClick={() => setIndex(null)} aria-label="Close photo viewer" className="inline-flex size-11 items-center justify-center rounded-full bg-white text-ink-900">
            <X aria-hidden="true" />
          </button>
          <button type="button" onClick={() => step(1)} aria-label="Next photo" className="inline-flex size-11 items-center justify-center rounded-full bg-white text-ink-900">
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </dialog>
    </>
  );
}
