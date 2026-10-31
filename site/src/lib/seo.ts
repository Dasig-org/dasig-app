import type { Metadata } from "next";
import { site } from "@/lib/site";

/**
 * Every public page's search and share details, in one place: the page's metadata, its share image and the sitemap
 * all read from here. `og` is the large line on the share image; `kicker` the small one above it.
 * Category words (volunteer app, volunteer management, open source) sit next to our own words, so pages can be found.
 */
export const PAGES = {
  "/": { title: "Bayanihan: a free, open-source app for volunteer groups", absolute: true,
    description: "Dasig turns your group's projects, needs and requests into small steps volunteers can say yes to. Free and open source, works offline, built on BIX.",
    kicker: "For volunteer groups", og: "Bayanihan works because someone does the extra work" },
  "/pilot": { title: "Join the pilot", description: "Bring Dasig, the free volunteer coordination app, to your group. Pilot groups get the app on their phones and help setting up their teams.",
    kicker: "Join the pilot", og: "Share the extra work with your group" },
  "/directory": { title: "Directory of volunteer groups and projects", description: "Find volunteer groups and civic projects near you, from the public summaries groups choose to share on the Dasig Ecosystem.",
    kicker: "Directory", og: "Find who's already helping near you" },
  "/get": { title: "Get the Dasig app", description: "Dasig is a free, mobile-first app for volunteer groups and organizations, in pilot now.",
    kicker: "Get the app", og: "Dasig is in pilot" },
  "/about": { title: "About", description: "Who makes Dasig and Bayanihan, why it's open source, and how the names fit together.",
    kicker: "About", og: "Open tools for the people who do the extra work" },
  "/docs": { title: "Docs", description: "Guides for groups and volunteers using Dasig, and documentation for BIX, the API and running your own Bayanihan Server.",
    kicker: "Docs", og: "Guides for groups, volunteers and developers" },
  "/docs/start-a-group": { title: "Start a group", description: "Set up your volunteer group in Dasig: teams, positions, your first project and inviting people.",
    kicker: "Guide", og: "Start a group in an afternoon" },
  "/docs/volunteering": { title: "Volunteering with Dasig", description: "How volunteers find work in Dasig, say yes to a step, and keep a signed record of what they did.",
    kicker: "Guide", og: "Find something worthwhile to do today" },
  "/docs/hubs": { title: "Hubs and working offline", description: "Run your volunteer group with no internet: every phone runs its own Bayanihan Server, and one phone can be the group's hub.",
    kicker: "Works offline", og: "Your phone is the server" },
  "/docs/bix": { title: "BIX: the Bayanihan Information Exchange", description: "BIX is an open standard for civic and volunteer work: groups, teams, tasks, needs, offers, votes and signed records, modelled on HL7 FHIR.",
    kicker: "Open standard", og: "BIX: one shared format for civic work" },
  "/docs/api": { title: "API reference", description: "The Bayanihan Server API: read, search and change BIX records, verify signatures, share links, files, pairing and export.",
    kicker: "For developers", og: "The Bayanihan Server API" },
  "/docs/self-hosting": { title: "Run your own Bayanihan Server", description: "Host a Bayanihan Server for your LGU, federation or school: one container, SQLite, and continuous backups to S3-compatible storage.",
    kicker: "Self-hosting", og: "Run your own Bayanihan Server" },
  "/trust": { title: "Trust, privacy and safety", description: "How the Dasig Ecosystem keeps groups' records safe: invite-only by default, privacy rules the server enforces, and free export.",
    kicker: "Trust", og: "Privacy rules the server enforces" },
  "/trust/host-policy": { title: "Host policy", description: "The Dasig Ecosystem's rules as a host: who can join, verification, what the server enforces, privacy, and promises about leaving.",
    kicker: "Trust", og: "How the Dasig Ecosystem is run" },
  "/trust/privacy": { title: "Privacy", description: "What the Dasig app and the Dasig Ecosystem keep, where, and your rights over it.",
    kicker: "Trust", og: "What's kept, and who can see it" },
  "/trust/safety": { title: "Safety and reports", description: "How to report a group, a listing or a person on the Dasig Ecosystem, and what happens next.",
    kicker: "Trust", og: "Safety and reports" },
  "/status": { title: "Status", description: "Whether the Dasig Ecosystem is up, and what's changing during the pilot.",
    kicker: "Status", og: "Dasig Ecosystem status" },
} as const satisfies Record<string, { title: string; description: string; kicker: string; og: string; absolute?: boolean }>;
export type PagePath = keyof typeof PAGES;

/** The share image's address for a page: /og/home, /og/docs-hubs, … */
export const ogSlug = (path: string) => (path === "/" ? "home" : path.slice(1).replace(/\//g, "-"));
export const pathForSlug = (slug: string) => (Object.keys(PAGES) as PagePath[]).find((p) => ogSlug(p) === slug);

/**
 * A page's metadata. Sets the canonical, Open Graph and Twitter fields explicitly, because Next replaces a parent's
 * openGraph object instead of merging it, and a canonical set in the layout would be inherited by every page.
 */
export function meta(path: PagePath): Metadata {
  const p = PAGES[path];
  const full = "absolute" in p && p.absolute ? p.title : `${p.title} · Bayanihan`;
  const image = { url: `/og/${ogSlug(path)}`, width: 1200, height: 630, alt: p.og };
  return {
    title: "absolute" in p && p.absolute ? { absolute: p.title } : p.title,
    description: p.description,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: "Bayanihan", locale: "en_PH", url: path, title: full, description: p.description, images: [image] },
    twitter: { card: "summary_large_image", title: full, description: p.description, images: [image.url] },
  };
}

export const absolute = (path: string) => `${site.url}${path === "/" ? "" : path}`;
