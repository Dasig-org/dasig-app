import type { Metadata } from "next";
import { meta } from "@/lib/seo";
import Link from "next/link";
import { Footer, Header } from "@/components/Chrome";
import { Icon } from "@/components/Icon";
import { NetworkScene } from "@/components/Scenes";
import { Phones } from "@/components/Phone";
import { site } from "@/lib/site";
import { DirectoryGrid } from "@/components/DirectoryGrid";
import { directoryPage } from "@/lib/directory";

export const revalidate = 300;

export const metadata: Metadata = meta("/directory");

export default async function Directory() {
  const first = await directoryPage(0);
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
      <section className="band" id="groups"><div className="wrap">
        <p className="kicker">On the Dasig Ecosystem</p><h2>{first && first.total === 0 ? "The first groups are joining now" : "Groups you can find"}</h2>
        {first === null
          ? <div className="dir-empty"><p>The directory can't be reached right now. Please try again in a few minutes.</p></div>
          : first.total === 0
            ? <div className="dir-empty dir-first">
                <div className="dir-seats" aria-hidden="true"><span><img src="/emblem.png" alt="" width={34} height={34} /></span><span>+</span><span>+</span><span>+</span></div>
                <h3>Your group could be one of the first</h3>
                <p>The directory opened with the pilot. When your coordinator chooses “Anyone can find it”, your group shows up here for volunteers and partners nearby.</p>
                <div className="btns" style={{ justifyContent: "center" }}><a className="btn btn-primary" href={site.pilotMail}>Join the pilot</a><Link className="btn btn-outline" href="#listing">What a listing shows</Link></div>
              </div>
            : <DirectoryGrid first={first} />}
      </div></section>
      <section id="listing"><div className="wrap">
        <h2>What a listing shows, and what it never does</h2>
        <div className="grid grid-2" style={{ marginTop: 16 }}>
          <div className="card"><div className="icon"><Icon name="eye" /></div><h3>Shown</h3><p>The group's name and kind, its place (barangay or above, never an address), its causes, who it serves as a description, and its projects' titles, status and dates.</p></div>
          <div className="card"><div className="icon"><Icon name="lock" /></div><h3>Never shown</h3><p>Names of the people a group serves, which are only ever counts. Photos marked as showing children. Any figure below 5 for one place, which shows as “fewer than 5”.</p></div>
        </div>
        <p className="muted" style={{ marginTop: 16 }}>Groups are invite-only by default. A group is listed only when its coordinator chooses “Anyone can find it”, and it can stop at any time. <Link href="/trust/host-policy">Read the host policy</Link>.</p>
        <Phones items={[{ src: "whos-working-here", alt: "Projects near a place, filtered by cause" }, { src: "group-page", alt: "A group's public page, with an Offer help button" }, { src: "goal", alt: "A shared goal that many groups contribute to" }]} />
      </div></section>
    </main>
    <Footer />
  </>;
}
