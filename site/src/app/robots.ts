import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/**
 * Crawlers may fetch every page. Pages that shouldn't be indexed say so with noindex (the whole site while it's a
 * draft, and invite links always), and a disallow would stop crawlers from ever reading that noindex.
 */
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: "/" }], ...(site.indexable ? { sitemap: `${site.url}/sitemap.xml` } : {}) };
}
