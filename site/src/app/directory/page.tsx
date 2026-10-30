import type { Metadata } from "next";
import Link from "next/link";
import { Footer, Header } from "@/components/Chrome";
import { Icon } from "@/components/Icon";
import { NetworkScene } from "@/components/Scenes";
import { Phones } from "@/components/Phone";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Directory of volunteer groups and projects", description: "Find volunteer groups and civic projects by place and cause, from the public summaries groups choose to share on the Dasig Ecosystem." };

export default function Directory() {
  return <>
    <Header current="/directory" />
    <main>
      <section className="hero"><div className="wrap hero-grid">
        <div>
          <p className="kicker">In pilot</p>
          <h1>Who's working on what, for whom, where</h1>
          <p className="lead">The directory lists the public summaries that groups choose to share, so groups find partners and volunteers find groups. It runs in the Dasig app, on the Dasig Ecosystem, while the pilot is on.</p>
          <div className="btns"><a className="btn btn-primary" href={site.pilotMail}>Be one of the first groups</a></div>
        </div>
        <NetworkScene />
      </div></section>
      <section className="band"><div className="wrap">
        <h2>What a listing shows, and what it never does</h2>
        <div className="grid grid-2" style={{ marginTop: 16 }}>
          <div className="card on-white"><div className="icon"><Icon name="eye" /></div><h3>Shown</h3><p>The group's name and kind, its place (barangay or above, never an address), its causes, who it serves as a description, and its projects' titles, status and dates.</p></div>
          <div className="card on-white"><div className="icon"><Icon name="lock" /></div><h3>Never shown</h3><p>Names of the people a group serves, which are only ever counts. Photos marked as showing children. Any figure below 5 for one place, which shows as “fewer than 5”.</p></div>
        </div>
        <p className="muted" style={{ marginTop: 16 }}>Listing is on by default and can be turned off at any time. Groups that serve children or patients are asked first. <Link href="/trust/host-policy">Read the host policy</Link>.</p>
        <Phones items={[{ src: "whos-working-here", alt: "Projects near a place, filtered by cause" }, { src: "group-page", alt: "A group's public page, with an Offer help button" }, { src: "goal", alt: "A shared goal that many groups contribute to" }]} />
      </div></section>
    </main>
    <Footer />
  </>;
}
