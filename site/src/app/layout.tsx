import type { Metadata, Viewport } from "next";
import "./globals.css";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: "Bayanihan: a free, open-source app for volunteer groups", template: "%s · Bayanihan" },
  description: "Bayanihan and the Dasig app help volunteer groups turn projects, needs and requests into small tasks people can say yes to, with a signed record of the work, even with no internet.",
  applicationName: "Bayanihan",
  icons: { icon: "/emblem.png", apple: "/emblem.png" },
  robots: site.indexable ? undefined : { index: false, follow: false },
  // Each page sets its own canonical, Open Graph and Twitter fields through meta() in lib/seo.ts.
};
export const viewport: Viewport = { themeColor: "#F47C26", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
