import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 150);
}

/** Splits CMS body text into blocks: paragraphs (blank-line separated) and "- " bullet lists. */
export function parseBody(
  body: string,
): ({ kind: "p"; text: string } | { kind: "ul"; items: string[] } | { kind: "h2"; text: string } | { kind: "h3"; text: string })[] {
  return body
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split("\n").map((l) => l.trim());
      if (lines.every((l) => l.startsWith("- "))) return { kind: "ul" as const, items: lines.map((l) => l.slice(2)) };
      if (lines.length === 1 && lines[0]!.startsWith("### ")) return { kind: "h3" as const, text: lines[0]!.slice(4) };
      if (lines.length === 1 && lines[0]!.startsWith("## ")) return { kind: "h2" as const, text: lines[0]!.slice(3) };
      return { kind: "p" as const, text: lines.join(" ") };
    });
}

/** Date → "YYYY-MM-DDTHH:mm" in India time, for datetime-local inputs. */
export function toIstInput(d: Date | null | undefined) {
  if (!d) return "";
  return new Date(d.getTime() + 5.5 * 3600_000).toISOString().slice(0, 16);
}

export function formatDateTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(date);
}
