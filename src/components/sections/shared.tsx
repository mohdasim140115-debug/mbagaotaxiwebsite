import { cn, parseBody } from "@/lib/utils";

type HeadingData = { eyebrow?: unknown; title?: unknown; headingLevel?: unknown; description?: unknown };

export function SectionHeading({
  data,
  align = "center",
  tone = "dark",
  className,
}: {
  data: HeadingData;
  align?: "center" | "left";
  tone?: "dark" | "light";
  className?: string;
}) {
  const Tag = data.headingLevel === "h1" ? "h1" : "h2";
  const title = String(data.title ?? "");
  const eyebrow = String(data.eyebrow ?? "");
  const description = String(data.description ?? "");
  if (!title && !eyebrow && !description) return null;
  return (
    <div className={cn("max-w-3xl", align === "center" ? "mx-auto text-center" : "", className)}>
      {eyebrow && <p className={cn("eyebrow", tone === "light" && "text-[#ffa463]")}>{eyebrow}</p>}
      {title && (
        <Tag className={cn("font-display mt-3 fs-h2 font-semibold text-balance", tone === "light" ? "text-white" : "text-ink-900", Tag === "h1" && "fs-h1")}>
          {title}
        </Tag>
      )}
      {align === "center" && title && <span aria-hidden="true" className="mx-auto mt-5 block h-px w-16 bg-gradient-to-r from-transparent via-sunset-500 to-transparent" />}
      {description && <p className={cn("mt-4 text-lg text-pretty", tone === "light" ? "text-white/80" : "text-ink-700")}>{description}</p>}
    </div>
  );
}

export function Body({ text, className }: { text: string; className?: string }) {
  const blocks = parseBody(text);
  if (!blocks.length) return null;
  return (
    <div className={cn("prose-cms text-ink-700", className)}>
      {blocks.map((b, i) =>
        b.kind === "ul" ? (
          <ul key={i}>
            {b.items.map((it, j) => (
              <li key={j}>{it}</li>
            ))}
          </ul>
        ) : b.kind === "h3" ? (
          <h3 key={i}>{b.text}</h3>
        ) : b.kind === "h2" ? (
          <h2 key={i}>{b.text}</h2>
        ) : (
          <p key={i}>{b.text}</p>
        ),
      )}
    </div>
  );
}

export const str = (v: unknown) => (typeof v === "string" ? v : "");
export const arr = <T,>(v: unknown) => (Array.isArray(v) ? (v as T[]) : []);
