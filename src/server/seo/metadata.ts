import "server-only";
import type { Metadata } from "next";
import { getMediaByIds, getSeoFor } from "../cms/public";
import { getPublicSettings } from "../cms/settings";
import { siteUrl } from "./jsonld";

/**
 * Builds page metadata from the entity's SEO record with sensible fallbacks.
 * Title: SEO title (used verbatim) or "<name>" through the site title template.
 */
export async function buildMetadata(opts: {
  entityType: string;
  entityId: number;
  path: string;
  fallbackTitle: string;
  fallbackDescription?: string;
  fallbackImageId?: number | null;
  noindex?: boolean;
}): Promise<Metadata> {
  const [seo, settings] = await Promise.all([getSeoFor(opts.entityType, opts.entityId), getPublicSettings()]);
  const description = seo?.metaDescription || opts.fallbackDescription || settings.defaultMetaDescription;
  const imageId = seo?.ogImageId ?? opts.fallbackImageId ?? settings.defaultOgImageId;
  const image = imageId ? (await getMediaByIds([imageId]))[imageId] : undefined;
  const canonical = seo?.canonicalUrl || siteUrl(opts.path);
  const index = !opts.noindex && (seo?.robotsIndex ?? true);
  const follow = seo?.robotsFollow ?? true;
  const title = seo?.metaTitle ? { absolute: seo.metaTitle } : opts.fallbackTitle;
  const ogTitle = seo?.ogTitle || seo?.metaTitle || settings.titleTemplate.replace("%s", opts.fallbackTitle);
  return {
    title,
    description,
    alternates: { canonical },
    robots: { index, follow, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
    openGraph: {
      title: ogTitle,
      description: seo?.ogDescription || description,
      url: canonical,
      type: "website",
      locale: "en_IN",
      siteName: settings.businessName,
      ...(image ? { images: [{ url: image.url, width: image.width, height: image.height, alt: image.alt }] } : {}),
    },
    twitter: { card: "summary_large_image", title: ogTitle, description: seo?.ogDescription || description },
  };
}
