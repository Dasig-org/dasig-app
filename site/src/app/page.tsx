import type { Metadata } from "next";
import { meta } from "@/lib/seo";
import Link from "next/link";
import { Footer, Header } from "@/components/Chrome";
import { Icon, type IconName } from "@/components/Icon";
import { Phone, Phones } from "@/components/Phone";
import { BreakdownScene, NetworkScene, RecordScene, TeamsScene } from "@/components/Scenes";
import { site } from "@/lib/site";
import { HomeJsonLd } from "@/components/JsonLd";
export const metadata: Metadata = meta("/");

const POINTS: { icon: IconName; title: string; body: string }[] = [
  { icon: "users", title: "Teams first", body: "The committees you already have." },
  { icon: "check", title: "Small steps", body: "One thing, one day, one place." },
  { icon: "wifioff", title: "No signal needed", body: "One phone can be the hub." },
];
const STEPS = [
  { title: "Start a group", body: "A name and a nickname." },
  { title: "Set up teams", body: "Or start from last year's." },
  { title: "Break it down", body: "Big jobs into small steps." },
  { title: "Get it done", body: "Volunteers tap “I'm in”." },
];
const LAYERS: { icon: IconName; text: string; soon?: boolean }[] = [
  { icon: "users", text: "A project becomes teams" },
  { icon: "check", text: "A big job becomes small steps" },
  { icon: "sack", text: "A need brings its own steps", soon: true },
];
const PARTS: { icon: IconName; name: string; role: string; body: string; tags: string[]; href?: string }[] = [
  { icon: "book", name: "BIX", role: "The open standard", body: "The Bayanihan Information Exchange: one shared format for groups, teams, tasks, needs, offers and the record of who did what. Modelled on FHIR, the standard health systems use to exchange records.", tags: ["Spec: CC BY 4.0", "Schemas: Apache-2.0"], href: "/docs/bix" },
  { icon: "check", name: "Bayanihan Core", role: "The rules engine", body: "Checks every change against BIX: who may make it, what can come next, and who confirmed it. The same code runs on the phone and on the server.", tags: ["Apache-2.0"] },
  { icon: "building", name: "Bayanihan Server", role: "The reference server", body: "Stores a group's records and answers the BIX API. It runs inside the Dasig app, on a hub phone, or on your own machine.", tags: ["Apache-2.0"], href: "/docs/api" },
  { icon: "spark", name: "Bayani 1", role: "The small language model", body: "Reads group chat messages in Filipino and English and drafts the tasks in them. It runs on the phone, and a person approves everything it suggests.", tags: ["In development"] },
  { icon: "phone", name: "Dasig", role: "The app", body: "The app for coordinators and volunteers, and the reference app for BIX. Dasig is a trademark of Dasig Inc.", tags: ["AGPL-3.0"], href: "/get" },
];
const HUB: { icon: IconName; text: string }[] = [
  { icon: "phone", text: "Run a whole project on one phone" },
  { icon: "wifi", text: "Make one phone the group's hub. Others join over its hotspot." },
  { icon: "cloud", text: "Connect to the Dasig Ecosystem when you want, or never" },
];
const WHO = ["Rotaract and Interact clubs", "JCI chapters", "Community event teams", "School organizations", "Faith communities", "Barangay youth groups", "Any informal group"];

export default function Home() {
  return <>
    <HomeJsonLd />
    <Header />
    <main>
      <section className="hero"><div className="wrap hero-grid">
        <div>
          <p className="kicker">Free and open source</p>
          <h1>Bayanihan works because someone does the extra work</h1>
          <p className="lead">Someone keeps the list. Someone answers messages at 11pm. Dasig turns that work into small steps, so everyone can carry a part. It's free and open source.</p>
          <div className="btns"><a className="btn btn-primary" href={site.pilotMail}>Join the pilot</a><Link className="btn btn-outline" href="#how">How it works</Link></div>
          <p className="muted small" style={{ marginTop: 14 }}>Free and open source · Mobile first · In pilot with a few groups</p>
        </div>
        <div>
          <div className="hero-phones" aria-label="The Dasig app"><Phone src="coordinator-week" alt="A coordinator's week: what needs them, and what's coming up" width={250} /><Phone src="volunteer-today" alt="A volunteer saying I'm in to a coastal cleanup" width={250} /></div>
          <p className="caption">Design previews. Names and places are made up.</p>
        </div>
      </div></section>

      <section className="band"><div className="wrap">
        <div className="grid grid-3">{POINTS.map((p) => <div className="card on-white" key={p.title}><div className="icon"><Icon name={p.icon} /></div><h3>{p.title}</h3><p>{p.body}</p></div>)}</div>
      </div></section>

      <section className="band" id="breakdown"><div className="wrap hero-grid">
        <BreakdownScene />
        <div>
          <p className="kicker">Big jobs, small steps</p><h2>Give what you can, from where you are</h2>
          <p className="lead">Not everyone can run the whole thing. Everyone can take one step.</p>
          <ul className="layers">{LAYERS.map((l) => <li key={l.text}><span className="icon"><Icon name={l.icon} /></span><span>{l.text}{l.soon ? <span className="soon">Soon</span> : null}</span></li>)}</ul>
        </div>
      </div></section>

      <section id="how"><div className="wrap">
        <p className="kicker">How it works</p><h2>Up and running in an afternoon</h2>
        <div className="grid grid-4" style={{ marginTop: 22 }}>{STEPS.map((s, i) => <div className="card" key={s.title}><div className="step-n">{i + 1}</div><h3>{s.title}</h3><p>{s.body}</p></div>)}</div>
        <Phones items={[{ src: "join-invite", alt: "Joining a group with just a nickname" }, { src: "start-from-teams", alt: "Starting a project from last year's teams" }, { src: "call-for-runners", alt: "A task with smaller steps and helpers" }]} />
        <p style={{ marginTop: 18, textAlign: "center" }}><Link href="/docs/start-a-group" style={{ fontWeight: 700 }}>Read the full guide →</Link></p>
      </div></section>

      <section className="band"><div className="wrap hero-grid">
        <RecordScene />
        <div>
          <p className="kicker">Thanked and recorded</p><h2>The quiet work finally counts</h2>
          <p className="lead">Every finished step is thanked, signed by your group, and kept on your phone. It's your story, and it goes with you.</p>
          <div className="btns"><Link className="btn btn-outline" href="/docs/volunteering">For volunteers</Link></div>
        </div>
      </div></section>

      <section id="offline"><div className="wrap hero-grid">
        <div>
          <p className="kicker">Works offline</p><h2>Your phone is the server</h2>
          <p className="lead">Dasig doesn't need the internet. Every phone runs its own Bayanihan Server, so your group's records are saved on the phone itself.</p>
          <ul className="layers">{HUB.map((l) => <li key={l.text}><span className="icon"><Icon name={l.icon} /></span><span>{l.text}</span></li>)}</ul>
          <div className="btns"><Link className="btn btn-outline" href="/docs/hubs">How hubs work</Link></div>
        </div>
        <Phones items={[{ src: "hub-qr", alt: "A tablet as the group's hub, showing the QR code others scan to join" }]} />
      </div></section>

      <section className="band"><div className="wrap hero-grid">
        <div>
          <p className="kicker">The Dasig Ecosystem · in pilot</p><h2>Find who's already helping near you</h2>
          <p className="lead">Groups that choose to be found can list their projects. Never the names of the people they serve, and never photos of children.</p>
          <div className="btns"><Link className="btn btn-outline" href="/directory">About the directory</Link><Link className="btn btn-outline" href="/trust">How we keep it safe</Link></div>
        </div>
        <NetworkScene />
      </div></section>

      <section><div className="wrap hero-grid">
        <TeamsScene />
        <div>
          <p className="kicker">Who it's for</p><h2>Groups that run on volunteers</h2>
          <p className="lead">The way your group already works: committees, leads, and volunteers who can see where they fit.</p>
          <div className="pill-row">{WHO.map((w) => <span className="pill" style={{ background: "var(--wash)" }} key={w}>{w}</span>)}</div>
          <p className="muted" style={{ marginTop: 16 }}>Registered or not. Groups don't need papers to use Dasig.</p>
        </div>
      </div></section>

      <section className="band" id="open-source"><div className="wrap">
        <p className="kicker">Open source</p><h2>Five open parts, free for anyone to use</h2>
        <p className="lead" style={{ maxWidth: 720 }}>Dasig is one app built on open foundations. Any group, school, LGU or developer can use them, build on them, or host them.</p>
        <div className="grid grid-3 parts" style={{ marginTop: 22 }}>{PARTS.map((x) => {
          const inner = <><div className="icon"><Icon name={x.icon} /></div><p className="part-role">{x.role}</p><h3>{x.name}</h3><p>{x.body}</p>
            <div className="part-tags">{x.tags.map((t) => <span key={t} className={t === "In development" ? "soon" : "tag"}>{t}</span>)}</div></>;
          return x.href ? <Link href={x.href} className="card on-white" key={x.name} style={{ textDecoration: "none" }}>{inner}</Link> : <div className="card on-white" key={x.name}>{inner}</div>;
        })}
          <Link href="/docs/self-hosting" className="card part-own" style={{ textDecoration: "none" }}><h3>Run your own</h3><p>An LGU, a federation or a school can host its own Bayanihan Server and still join the Dasig Ecosystem.</p><p className="part-link">Self-hosting guide →</p></Link>
        </div>
        <p className="muted small" style={{ marginTop: 16 }}>The source code is published after the pilot. Developers can ask for early access at <a href="mailto:hello@dasig.org">hello@dasig.org</a>.</p>
      </div></section>

      <section><div className="wrap"><div className="cta-band">
        <h2>Share the extra work</h2>
        <p className="lead">We're shaping Dasig with a few groups first. Pilot groups get help setting up.</p>
        <div className="btns"><a className="btn btn-primary" href={site.pilotMail}>Join the pilot</a></div>
      </div></div></section>
    </main>
    <Footer />
  </>;
}
