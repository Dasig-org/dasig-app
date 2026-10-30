import type { Metadata, Viewport } from "next";
import "./globals.css";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: "Dasig Ecosystem: an open-source app for volunteer groups", template: "%s · Dasig Ecosystem" },
  description: "Dasig is a free, open-source app for volunteer groups and organizations: teams, tasks, volunteers and a signed record of the work, even with no internet.",
  icons: { icon: "/emblem.png" },
  robots: site.indexable ? undefined : { index: false, follow: false },
  openGraph: { type: "website", siteName: "Dasig Ecosystem", url: site.url },
};
export const viewport: Viewport = { themeColor: "#F47C26", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
