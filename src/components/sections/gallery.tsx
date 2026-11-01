import { getMediaByIds } from "@/server/cms/public";
import { GalleryGrid } from "./gallery-grid";
import { SectionHeading, arr } from "./shared";

export async function GallerySection({ data }: { data: Record<string, unknown> }) {
  const items = arr<{ mediaId: number; caption: string }>(data.images);
  const media = await getMediaByIds(items.map((i) => i.mediaId));
  const images = items.filter((i) => media[i.mediaId]).map((i) => ({ ...media[i.mediaId]!, caption: i.caption || media[i.mediaId]!.caption }));
  return (
    <section className="section-y bg-paper">
      <div className="container-wide">
        <SectionHeading data={data} />
        {images.length ? (
          <GalleryGrid images={images} />
        ) : (
          <p className="mx-auto mt-10 max-w-xl text-center text-ink-700">Photos will be added here soon.</p>
        )}
      </div>
    </section>
  );
}
