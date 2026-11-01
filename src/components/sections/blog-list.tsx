import Link from "next/link";
import { getMediaByIds, getPublishedPosts } from "@/server/cms/public";
import { CmsImage } from "@/components/site/cms-image";
import { SectionHeading } from "./shared";

const fmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" });

export async function BlogPostsSection({ data }: { data: Record<string, unknown> }) {
  const limit = typeof data.limit === "number" && data.limit > 0 ? data.limit : 12;
  const posts = (await getPublishedPosts()).slice(0, limit);
  const media = await getMediaByIds(posts.map((p) => p.imageId!).filter(Boolean));
  return (
    <section className="section-y bg-paper">
      <div className="container-wide">
        <SectionHeading data={data} />
        {posts.length === 0 ? (
          <p className="mx-auto mt-10 max-w-xl text-center text-ink-700">Articles are coming soon.</p>
        ) : (
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <li key={p.id} data-reveal>
                <article className="group flex h-full flex-col overflow-hidden rounded-[16px] border border-line bg-paper-raised shadow-1 transition-shadow hover:shadow-2">
                  <Link href={`/blog/${p.slug}/`} className="relative block aspect-[16/10] overflow-hidden bg-sand-100" tabIndex={-1} aria-hidden="true">
                    <CmsImage media={p.imageId ? media[p.imageId] : undefined} fill sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" className="transition-transform duration-500 group-hover:scale-[1.03]" />
                  </Link>
                  <div className="flex flex-1 flex-col p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sunset-600">
                      {[p.category, p.publishedAt ? fmt.format(p.publishedAt) : ""].filter(Boolean).join(" · ")}
                    </p>
                    <h3 className="font-display mt-2 text-xl font-semibold leading-snug">
                      <Link href={`/blog/${p.slug}/`} className="hover:underline">
                        {p.title}
                      </Link>
                    </h3>
                    {p.excerpt && <p className="mt-2 text-sm text-ink-700">{p.excerpt}</p>}
                    <Link href={`/blog/${p.slug}/`} className="mt-auto pt-4 text-sm font-semibold text-teal-700 hover:underline">
                      Read article<span className="sr-only">: {p.title}</span> →
                    </Link>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
