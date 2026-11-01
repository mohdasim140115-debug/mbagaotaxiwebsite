import { after } from "next/server";
import { enquirySchema } from "@/lib/validation/enquiry";
import { createEnquiry, looksAutomated, notifyNewEnquiry } from "@/server/enquiries/create";
import { rateLimit } from "@/server/rate-limit";
import { hashIdentifier } from "@/server/crypto";

function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser clients; still rate limited
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

const json = (body: object, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ ok: false, error: "Invalid request origin." }, 403);
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > 20_000) return json({ ok: false, error: "Request too large." }, 413);

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid request." }, 400);
  }
  const parsed = enquirySchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return json({ ok: false, error: first?.message ?? "Please check the form and try again.", field: first?.path.join(".") }, 422);
  }
  const input = parsed.data;
  const ipHash = hashIdentifier(clientIp(req));

  try {
    const ipOk = await rateLimit("enquiry_ip", ipHash, 5, 10 * 60);
    const phoneOk = await rateLimit("enquiry_phone", input.phone.replace(/\D/g, ""), 3, 60 * 60);
    if (!ipOk || !phoneOk) {
      return json({ ok: false, error: "Too many enquiries in a short time. Please wait a few minutes or contact us on WhatsApp." }, 429);
    }
    // Bots get a success-shaped response so they don't adapt, but nothing is stored.
    if (looksAutomated(input)) return json({ ok: true });

    const { id } = await createEnquiry(input, ipHash);
    after(() => notifyNewEnquiry(id, input));
    return json({ ok: true });
  } catch (err) {
    console.error("[enquiry] failed", err);
    return json({ ok: false, error: "Sorry, we couldn't save your enquiry. Please try again or contact us on WhatsApp." }, 500);
  }
}
