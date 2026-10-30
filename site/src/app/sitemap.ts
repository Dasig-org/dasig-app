import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

const PAGES = ["", "/pilot", "/directory", "/get", "/about", "/docs", "/docs/start-a-group", "/docs/volunteering", "/docs/hubs", "/docs/bix", "/docs/api", "/docs/self-hosting", "/trust", "/trust/host-policy", "/trust/privacy", "/trust/safety", "/status"];

export default function sitemap(): MetadataRoute.Sitemap {
  return !site.indexable ? [] : PAGES.map((p) => ({ url: `${site.url}${p}` }));
}
