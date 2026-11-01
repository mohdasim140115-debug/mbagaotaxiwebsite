import type { MetadataRoute } from "next";
import { siteUrl } from "@/server/seo/jsonld";

export default function robots(): MetadataRoute.Robots {
  if (process.env.STAGING === "true") {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  // robots.txt is not access control: /admin and /api are also protected by authentication and noindex headers.
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin/", "/api/"] }],
    sitemap: siteUrl("/sitemap.xml"),
    host: siteUrl("/"),
  };
}
