import Image from "next/image";
import type { MediaItem } from "@/server/cms/public";
import { cn } from "@/lib/utils";

/** next/image wrapper for media-library items: always sized, lazy unless `priority`. */
export function CmsImage({
  media,
  sizes,
  className,
  priority = false,
  fill = false,
  alt,
  quality = 75,
}: {
  media: MediaItem | undefined;
  sizes: string;
  className?: string;
  priority?: boolean;
  fill?: boolean;
  alt?: string;
  quality?: 60 | 75 | 85;
}) {
  if (!media) {
    return <div className={cn("bg-sand-100", className)} aria-hidden="true" />;
  }
  const altText = alt ?? media.alt;
  if (fill) {
    return (
      <Image src={media.url} alt={altText} fill sizes={sizes} className={cn("object-cover", className)} priority={priority} quality={quality} />
    );
  }
  return (
    <Image
      src={media.url}
      alt={altText}
      width={media.width}
      height={media.height}
      sizes={sizes}
      className={className}
      priority={priority}
      quality={quality}
    />
  );
}
