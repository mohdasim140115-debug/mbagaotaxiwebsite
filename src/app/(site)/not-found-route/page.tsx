import { notFound } from "next/navigation";

/**
 * Target of the proxy's rewrite for unknown URLs. It throws synchronously, before anything
 * streams, so crawlers receive a real HTTP 404 (not a "soft 404") with the branded 404 page.
 */
export default function NotFoundRoute() {
  notFound();
}
