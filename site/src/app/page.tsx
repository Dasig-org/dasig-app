import Link from "next/link";
import { Footer, Header } from "@/components/Chrome";
import { Icon, type IconName } from "@/components/Icon";
import { Phone, Phones } from "@/components/Phone";
import { NetworkScene, RecordScene, TeamsScene } from "@/components/Scenes";
import { site } from "@/lib/site";

const POINTS: { icon: IconName; title: string; body: string }[] = [
  { icon: "users", title: "Teams first", body: "Set up the committees your group already has. Leads hand out the work, and volunteers say “I'm in”." },
  { icon: "lock", title: "Done is the record", body: "When something is done, it's recorded and signed by your group. No approval round-trips." },
  { icon: "wifioff", title: "Works without internet", body: "Everything runs on your phones. One phone can be the group's hub, and the others join over its hotspot." },
];
const STEPS = [
  { title: "Start a group", body: "A name and a nickname. No account or email needed." },
  { title: "Set up teams", body: "Pick from common teams, or name your own. Save them for next time." },
  { title: "Invite your people", body: "A QR code or a link. Volunteers join with just a nickname." },
  { title: "Do the work", body: "Take a task, mark it done, and it counts at once, for the group and for the person." },
];
const WHO = ["Rotaract and Interact clubs", "JCI chapters", "Community event teams", "School organizations", "Faith communities", "Barangay youth groups", "Any informal group"];

export default function Home() {
  return <>
    <Header />
    <main>
      <section className="hero"><div className="wrap hero-grid">
        <div>
          <p className="kicker">Free and open source</p>
          <h1>Your group's work, organized and on record</h1>
          <p className="lead">Dasig is an app for volunteer groups and organizations. Plan projects in teams, let volunteers find something worthwhile to do, and keep a signed record of everything that got done. Even with no internet.</p>
          <div className="btns"><a className="btn btn-primary" href={site.pilotMail}>Join the pilot</a><Link className="btn btn-outline" href="#how">How it works</Link></div>
          <p className="muted small" style={{ marginTop: 14 }}>Android first. In pilot with a small number of groups.</p>
        </div>
        <div>
          <div className="hero-phones" aria-label="The Dasig app"><Phone src="coordinator-week" alt="A coordinator's week: what needs them, and what's coming up" width={250} /><Phone src="volunteer-today" alt="A volunteer saying I'm in to a coastal cleanup" width={250} /></div>
          <p className="caption">Design previews. Names and places are made up.</p>
        </div>
      </div></section>

      <section className="band"><div className="wrap">
        <div className="grid grid-3">{POINTS.map((p) => <div className="card on-white" key={p.title}><div className="icon"><Icon name={p.icon} /></div><h3>{p.title}</h3><p>{p.body}</p></div>)}</div>
      </div></section>

      <section id="how"><div className="wrap">
        <p className="kicker">How it works</p><h2>From a name to signed work in an afternoon</h2>
        <div className="grid grid-4" style={{ marginTop: 22 }}>{STEPS.map((s, i) => <div className="card" key={s.title}><div className="step-n">{i + 1}</div><h3>{s.title}</h3><p>{s.body}</p></div>)}</div>
        <Phones items={[{ src: "join-invite", alt: "Joining a group with just a nickname" }, { src: "start-from-teams", alt: "Starting a project from last year's teams" }, { src: "call-for-runners", alt: "A task with smaller steps and helpers" }]} />
        <p style={{ marginTop: 18, textAlign: "center" }}><Link href="/docs/start-a-group" style={{ fontWeight: 700 }}>Read the full guide →</Link></p>
      </div></section>

      <section className="band"><div className="wrap hero-grid">
        <RecordScene />
        <div>
          <p className="kicker">Your records are yours</p><h2>Credit that stays with the people who did the work</h2>
          <p className="lead">Every finished task is signed by the group that received it, and a copy is kept on each person's phone. Records can be checked against the group's public key, and groups and volunteers can download everything at any time.</p>
          <div className="btns"><Link className="btn btn-outline" href="/docs/volunteering">For volunteers</Link><Link className="btn btn-outline" href="/docs/hubs">How hubs work</Link></div>
        </div>
      </div></section>

      <section><div className="wrap hero-grid">
        <div>
          <p className="kicker">The Dasig Ecosystem · in pilot</p><h2>Find who's already working near you</h2>
          <p className="lead">When a group chooses to, it can list a public summary of its projects: name, place, causes and who it serves. Never names of the people served, and never photos of children. Groups find partners, volunteers find groups, and the work adds up.</p>
          <div className="btns"><Link className="btn btn-outline" href="/directory">About the directory</Link><Link className="btn btn-outline" href="/trust">How we keep it safe</Link></div>
        </div>
        <NetworkScene />
      </div></section>

      <section className="band"><div className="wrap hero-grid">
        <TeamsScene />
        <div>
          <p className="kicker">Who it's for</p><h2>Groups that run on volunteers</h2>
          <p className="lead">Committees come first, the way your group already works. Every team has a lead, and every volunteer can see where they fit.</p>
          <div className="pill-row">{WHO.map((w) => <span className="pill" style={{ background: "var(--wash)" }} key={w}>{w}</span>)}</div>
          <p className="muted" style={{ marginTop: 16 }}>Registered or not. Groups don't need papers to use Dasig.</p>
        </div>
      </div></section>

      <section id="open-source"><div className="wrap">
        <p className="kicker">Open by design</p><h2>Built in the open, so no group is locked in</h2>
        <div className="grid grid-2" style={{ marginTop: 18 }}>
          <Link href="/docs/bix" className="card" style={{ textDecoration: "none" }}><h3>BIX</h3><p>The Bayanihan Information Exchange: an open format for civic work, built on lessons from FHIR in health care.</p></Link>
          <Link href="/docs/api" className="card" style={{ textDecoration: "none" }}><h3>Bayanihan Server</h3><p>The reference server for BIX. It runs inside every Dasig phone, on a group's hub, or on your own machine.</p></Link>
          <Link href="/docs/self-hosting" className="card" style={{ textDecoration: "none" }}><h3>Run your own</h3><p>An LGU, a federation or a school can host its own server and still join the Ecosystem.</p></Link>
          <Link href="/about#open-source" className="card" style={{ textDecoration: "none" }}><h3>The Dasig app</h3><p>Open source, with Dasig as its trademark, the way Firefox is for Mozilla.</p></Link>
        </div>
      </div></section>

      <section><div className="wrap"><div className="cta-band">
        <h2>Bring Dasig to your group</h2>
        <p className="lead">We're working with a few groups to shape the app before it opens to everyone. Pilot groups get help setting up, and credit in BIX if they want it.</p>
        <div className="btns"><a className="btn btn-primary" href={site.pilotMail}>Join the pilot</a></div>
      </div></div></section>
    </main>
    <Footer />
  </>;
}
