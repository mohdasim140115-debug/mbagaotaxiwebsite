import "server-only";
import { headers } from "next/headers";
import { hashIdentifier } from "./crypto";

/** Best-effort client IP. Behind a reverse proxy, the first X-Forwarded-For entry is the client. */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "unknown";
}

export async function getClientIpHash(): Promise<string> {
  return hashIdentifier(await getClientIp());
}

export async function getUserAgent(): Promise<string> {
  return ((await headers()).get("user-agent") ?? "").slice(0, 255);
}
