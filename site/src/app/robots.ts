import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/** While the site is a draft, pages carry noindex instead of a disallow, so the noindex is actually read. */
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/join/"] }], sitemap: !site.indexable ? undefined : `${site.url}/sitemap.xml` };
}
