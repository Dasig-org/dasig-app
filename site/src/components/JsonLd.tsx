import { site } from "@/lib/site";

/**
 * Structured data for the home page. Only claims that are true today: Dasig is a free Android app in pilot, open
 * source under AGPL-3.0, made by Dasig Inc. No ratings, no download link and no iPhone until those exist.
 */
export function HomeJsonLd() {
  const org = { "@type": "Organization", "@id": "https://dasig.org/#org", name: "Dasig Inc.", url: "https://dasig.org", email: site.contact, logo: `${site.url}/emblem.png` };
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      org,
      { "@type": "WebSite", "@id": `${site.url}/#site`, name: "Bayanihan", url: site.url, publisher: { "@id": org["@id"] }, inLanguage: "en" },
      { "@type": "SoftwareApplication", name: "Dasig", applicationCategory: "BusinessApplication", operatingSystem: "Android",
        description: "A free, open-source app for volunteer groups: teams, small steps volunteers can say yes to, and a signed record of the work, even with no internet.",
        isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "PHP" }, license: "https://www.gnu.org/licenses/agpl-3.0.html",
        publisher: { "@id": org["@id"] }, url: site.url },
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
