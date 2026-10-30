import type { Metadata } from "next";
import { Footer, Header } from "@/components/Chrome";
import { site } from "@/lib/site";
import { NetworkScene } from "@/components/Scenes";

export const metadata: Metadata = { title: "About", description: "Who makes Dasig, how it's open source, and how the names fit together." };

const PARTS = [
  ["Dasig", "The app for volunteers and organizations", "AGPL-3.0"],
  ["BIX", "The open format: schemas and specification", "A permissive licence"],
  ["Bayanihan Core", "The rules engine: lifecycles, permissions, signatures, counting votes", "A permissive licence"],
  ["Bayanihan Server", "The reference server, like HAPI for FHIR", "Apache-2.0"],
];

export default function About() {
  return <>
    <Header current="/about" />
    <main>
      <section className="hero"><div className="wrap hero-grid"><div>
        <p className="kicker">About</p>
        <h1>Made for bayanihan</h1>
        <p className="lead">Bayanihan is the Filipino tradition of a community lifting a neighbour's house together. Dasig is software for the groups that still do that: clubs, parishes, school organizations, barangay youth and the volunteers around them.</p>
        <p className="lead">Dasig is made by <strong>Dasig Inc.</strong>, which also runs <a href="https://dasig.org">Dasig Fundraising</a>. Raising money stays there; coordinating the work lives here.</p>
      </div><NetworkScene /></div></section>
      <section className="band" id="open-source"><div className="wrap" style={{ maxWidth: 860 }}>
        <h2>Open source</h2>
        <p className="muted">These are the licences we've chosen. They take effect when the code is published with the first release.</p>
        <div className="list" style={{ marginTop: 16, background: "var(--wash)" }}>{PARTS.map(([n, d, l]) => <div key={n}><span className="lines"><b>{n}</b><i>{d}</i></span><span className="small" style={{ fontWeight: 700 }}>{l}</span></div>)}</div>
        <p style={{ marginTop: 18 }}><strong>The names.</strong> “Bayanihan” names the open foundations, which anyone can use and build on. “Dasig” and the hands emblem are trademarks of Dasig Inc., the way Firefox is Mozilla's: anyone can use the code, but only Dasig Inc. ships it as Dasig.</p>
      </div></section>
      <section><div className="wrap" style={{ maxWidth: 860 }}>
        <h2>Shaped with the groups who use it</h2>
        <p className="muted">BIX is a draft shaped in conversations with the groups taking part in the pilot. Groups that help shape it are credited here, with their permission.</p>
        <div className="btns"><a className="btn btn-primary" href={site.pilotMail}>Take part</a><a className="btn btn-outline" href={`mailto:${site.contact}`}>{site.contact}</a></div>
      </div></section>
    </main>
    <Footer />
  </>;
}
