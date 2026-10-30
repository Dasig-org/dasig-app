/** Facts the whole site shares. Change them here, never in a page. */
export const site = {
  name: "Dasig Ecosystem",
  url: "https://bayanihan.dasig.org",
  api: "https://ecosystem.dasig.org",
  /** A review banner on every page (local review only). */
  draft: process.env.NEXT_PUBLIC_SITE_DRAFT === "1",
  /** Search engines may index the site only when this is set; until then every page asks them not to. */
  indexable: process.env.NEXT_PUBLIC_SITE_INDEX === "1",
  contact: "hello@dasig.org",
  privacy: "privacy@dasig.org",
  pilotMail: "/pilot",
  reportMail: "mailto:hello@dasig.org?subject=Report%20on%20the%20Dasig%20network",
  networkOpens: "2027",
};
