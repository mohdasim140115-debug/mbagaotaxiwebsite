import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { and, ne, sql } from "drizzle-orm";
import { db, schema } from "@/server/db/client";
import { CMS_TAG } from "@/server/cms/settings";

export const metadata: Metadata = { title: "Image credits", robots: { index: false, follow: true }, alternates: { canonical: "/image-credits/" } };

async function getCredits() {
  "use cache";
  cacheTag(CMS_TAG);
  cacheLife("max");
  return db
    .select({ id: schema.media.id, alt: schema.media.altText, credit: schema.media.credit, sourceUrl: schema.media.sourceUrl })
    .from(schema.media)
    .where(and(ne(schema.media.credit, ""), ne(schema.media.licenceStatus, "do_not_use"), sql`${schema.media.id} IN (SELECT media_id FROM media_usages)`));
}

/** Attribution for openly licensed photos (required by CC BY / CC BY-SA licences). */
export default async function ImageCredits() {
  const rows = await getCredits();
  return (
    <section className="section-y bg-paper">
      <div className="container-prose">
        <h1 className="font-display fs-h1 font-semibold">Image credits</h1>
        <p className="mt-4 text-ink-700">Some photographs on this website are used under open licences. We thank the photographers below.</p>
        <ul className="mt-8 divide-y divide-line">
          {rows.map((r) => (
            <li key={r.id} className="py-3">
              <p className="font-semibold">{r.alt}</p>
              <p className="text-sm text-ink-700">
                {r.credit}
                {r.sourceUrl && (
                  <>
                    {" "}
                    —{" "}
                    <a href={r.sourceUrl} className="underline" target="_blank" rel="noopener noreferrer">
                      source
                    </a>
                  </>
                )}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
