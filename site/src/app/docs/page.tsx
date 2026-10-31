import type { Metadata } from "next";
import { meta } from "@/lib/seo";
import Link from "next/link";
import { Doc } from "@/components/Doc";

export const metadata: Metadata = meta("/docs");

const CARDS = [
  { href: "/docs/start-a-group", t: "Start a group", d: "Set up your group, its teams and its first project." },
  { href: "/docs/volunteering", t: "Volunteering", d: "Find something to do, take it, and keep your record." },
  { href: "/docs/hubs", t: "Hubs and working offline", d: "Run a whole group from one phone, with no internet." },
  { href: "/docs/bix", t: "BIX", d: "The open format behind Dasig, and what it borrows from FHIR." },
  { href: "/docs/api", t: "API reference", d: "Talk to any Bayanihan Server: read, search, change and verify records." },
  { href: "/docs/self-hosting", t: "Run your own server", d: "One container and one file, backed up to any S3-compatible storage." },
];

export default function Docs() {
  return <Doc path="/docs" section="/docs">
    <h1>Docs</h1>
    <p>Dasig is the app. Underneath it are three open parts: <strong>BIX</strong>, the format; <strong>Bayanihan Core</strong>, the rules engine; and <strong>Bayanihan Server</strong>, which keeps the records. The same server runs inside every phone, on a group's hub, and on the Dasig Ecosystem.</p>
    <div className="grid grid-2" style={{ marginTop: 20 }}>{CARDS.map((c) => <Link key={c.href} href={c.href} className="card" style={{ textDecoration: "none" }}><h3>{c.t}</h3><p>{c.d}</p></Link>)}</div>
  </Doc>;
}
