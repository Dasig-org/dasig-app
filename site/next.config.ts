import type { NextConfig } from "next";

/** The site is static: every page is prerendered, and the directory reads the Dasig Ecosystem once it opens. */
const config: NextConfig = { reactStrictMode: true, poweredByHeader: false };
export default config;
