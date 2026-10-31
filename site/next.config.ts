import type { NextConfig } from "next";

/**
 * Pages are prerendered; the directory refreshes from the Dasig Ecosystem every 5 minutes.
 * Share images are made at build time from og-assets/; the include keeps those files if one is ever drawn on request.
 */
const config: NextConfig = { reactStrictMode: true, poweredByHeader: false, outputFileTracingIncludes: { "/og/[slug]": ["./og-assets/**/*", "./public/emblem.png"] } };
export default config;
