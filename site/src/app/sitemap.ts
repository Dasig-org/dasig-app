import type { MetadataRoute } from "next";
import { PAGES, absolute, type PagePath } from "@/lib/seo";
import { site } from "@/lib/site";

/** Every page in lib/seo.ts. Empty while the site carries noindex, so the two never disagree. No lastModified: we don't invent dates. */
export default function sitemap(): MetadataRoute.Sitemap {
  return site.indexable ? (Object.keys(PAGES) as PagePath[]).map((p) => ({ url: absolute(p) })) : [];
}
