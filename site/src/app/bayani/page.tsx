import type { Metadata } from "next";
import Link from "next/link";
import { Footer, Header } from "@/components/Chrome";
import { Icon, type IconName } from "@/components/Icon";
import { BayaniPlanScene, BayaniScene } from "@/components/Scenes";
import { meta } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata: Metadata = meta("/bayani");

/*
 * Bayani is not trained yet (bayani/README.md). Everything about the model on this page is written as in development,
 * planned or intended; only the parts that run today (the app, Bayanihan Core, BIX, the server) are written as live.
 */

const USES: { icon: IconName; title: string; body: string; eg: string; tag?: string }[] = [
  { icon: "check", title: "Break down the work",
    body: "On a project, a task or a step, it suggests the smaller steps the job needs, what has to happen first, and which team it belongs to. It learns from how your group did it last time.",
    eg: "“Secure the venue” → shortlist three, visit, get quotes, pay the deposit" },
  { icon: "users", title: "Suggest who to ask",
    body: "From your roster, it suggests who to ask for each step: who's on the team, who said they're free, who has done it before. It spreads the work instead of asking the same person every time.",
    eg: "“Ask Josh · free on Saturdays” · “Good first step for a newcomer”" },
  { icon: "send", title: "Turn messages into drafts",
    body: "It reads offers, requests and can't-make-its from the group chat, written in Filipino and English, and drafts them as records.",
    eg: "“May 2 sacks of rice ako” → an offer, and a step to receive it" },
  { icon: "book", title: "Draft the report",
    body: "When a report is due, it writes a first draft of the story behind the numbers. The numbers always come from confirmed records, never from the model.",
    eg: "“18 of 40 learners this year” stays exact. Bayani only drafts the words around it." },
  { icon: "mega", title: "Ask about your group", tag: "Exploring",
    body: "Chat with your group's own records: a summary of the week, what's still open, and what to do next. Answers come from the BIX records on your phone, and any change it suggests is still a draft.",
    eg: "“What's still open for Saturday?” → 2 steps need hands, 1 offer to receive" },
];

const VS: [string, string, string][] = [
  ["Size", "Small enough for a phone", "Huge, in a data centre"],
  ["Internet", "Not needed", "Needed for every answer"],
  ["Your messages", "Stay on the phone", "Sent to a company's servers"],
  ["What it's for", "Civic work, using your group's BIX records", "Anything, for anyone"],
  ["Who decides", "A person confirms every change it suggests", "Its output is used as is"],
  ["What it knows", "Your group's own records, on your phone", "The internet, and nothing about your group"],
  ["Language", "Filipino and English, mixed, as groups write", "Best in English"],
  ["Openness", "Open model and open tests, planned", "Closed"],
];

const FLOW: { title: string; body: string; live: boolean }[] = [
  { title: "Something to plan", body: "A project, a task, a need, or a message from the group chat", live: true },
  { title: "Bayani drafts", body: "On the phone, offline, as BIX records: steps, who to ask, offers", live: false },
  { title: "Core checks it", body: "Bayanihan Core tests the draft against the rules", live: true },
  { title: "A person says yes", body: "Or changes it. Nothing happens before that", live: true },
  { title: "It's on record", body: "Marked as suggested by Bayani, and by which version", live: true },
];

const INTENT: { icon: IconName; title: string; body: string }[] = [
  { icon: "lock", title: "Everything stays on the phone", body: "Bayani reads your group's records and messages where they are. A message is kept only if its sender agrees." },
  { icon: "users", title: "Suggestions, never rankings", body: "It suggests who to ask and says why. People aren't scored, and anyone asked can say “Can't make it”." },
  { icon: "eye", title: "You can see what it did", body: "Every suggestion is marked as Bayani's, with the model's version, in the record's history." },
  { icon: "pen", title: "It never acts on its own", body: "A draft is only a draft until a person, or a rule the group set, says yes." },
  { icon: "spark", title: "Your group can turn it off", body: "Everything Bayani drafts can be done by hand. The app works the same without it." },
];

const ROAD: [string, string][] = [
  ["Now", "Choosing an open base model that isn't a frontier model, such as OLMo or SmolLM. Building a test set of about 100 real messages from pilot groups, labelled and used with their consent."],
  ["Next", "Running it on the phone with llama.cpp, with output held to BIX's format so a draft is always well-formed."],
  ["Then", "Drafts in the Dasig app during the pilot, measured against Filipino benchmarks such as FilBench, Batayan and Kalahi, and against a large model as an offline comparison only."],
  ["After", "Open weights, the evaluation and what we learned, so other groups and builders can check it and build on it."],
];

export default function Bayani() {
  return <>
    <Header current="/bayani" />
    <main>
      <section className="hero"><div className="wrap hero-grid">
        <div>
          <p className="kicker">Bayanihan Intelligence · In development</p>
          <h1>Bayani 1: a small language model for volunteer work</h1>
          <p className="lead">Bayani works inside the Dasig app and any app built on BIX. It suggests how to break down a project, who on your roster to ask, and turns group chat messages into drafts. It runs on the phone, works offline, and never acts on its own.</p>
          <div className="btns"><a className="btn btn-primary" href={site.pilotMail}>Help shape it</a><Link className="btn btn-outline" href="#how">How it works</Link></div>
          <p className="muted small" style={{ marginTop: 14 }}>In development · Runs on the phone · Open source</p>
        </div>
        <BayaniPlanScene />
      </div></section>

      <section className="band"><div className="wrap">
        <p className="kicker">Where it helps</p><h2>The extra work, drafted for you</h2>
        <div className="uses">{USES.map((u) => <div className="card on-white" key={u.title}>
          <div className="icon"><Icon name={u.icon} /></div>
          <h3>{u.title}{u.tag ? <span className="soon">{u.tag}</span> : null}</h3><p>{u.body}</p><p className="eg">{u.eg}</p></div>)}</div>
      </div></section>

      <section><div className="wrap">
        <p className="kicker">How it's different</p><h2>Built for civic work, not for everything</h2>
        <table className="vs">
          <thead><tr><th scope="col"></th><th scope="col">Bayani 1</th><th scope="col">A large general-purpose AI</th></tr></thead>
          <tbody>{VS.map(([k, a, b]) => <tr key={k}><th scope="row">{k}</th><td>{a}</td><td>{b}</td></tr>)}</tbody>
        </table>
      </div></section>

      <section className="band"><div className="wrap hero-grid">
        <BayaniScene />
        <div>
          <p className="kicker">From the group chat</p><h2>Say it the way you always do</h2>
          <p className="lead">A volunteer can't come but offers rice instead. Bayani drafts the offer and the step to receive it, and opens up his Saturday slot. A lead checks it and taps yes.</p>
        </div>
      </div></section>

      <section id="how"><div className="wrap">
        <p className="kicker">Why a small model is enough</p><h2>The rules do the hard part</h2>
        <p className="lead" style={{ maxWidth: 760 }}>Bayani never changes a record on its own. Every change it suggests is a BIX draft, and Bayanihan Core, the rules already running in the Dasig app, checks every one. That's why a model small enough for a phone can do the job well, and why any app built on BIX can use it.</p>
        <ol className="flow">{FLOW.map((f) => <li key={f.title}><b>{f.title}</b><span>{f.body}</span>{f.live ? <em className="live">Live in the pilot</em> : <em className="soon">In development</em>}</li>)}</ol>
      </div></section>

      <section className="band"><div className="wrap">
        <p className="kicker">Made for this</p><h2>For Philippine volunteer groups, in the way they write</h2>
        <div className="grid grid-3" style={{ marginTop: 22 }}>
          <div className="card on-white"><div className="icon"><Icon name="mega" /></div><h3>Filipino and English, mixed</h3><p>Group chats switch languages mid-sentence. Bayani is trained and tested on that, not on English alone.</p></div>
          <div className="card on-white"><div className="icon"><Icon name="users" /></div><h3>Committees and leads</h3><p>It knows the shape of the work as BIX writes it: teams and leads, projects and steps, rosters, offers and needs.</p></div>
          <div className="card on-white"><div className="icon"><Icon name="wifioff" /></div><h3>Where the signal is weak</h3><p>Groups meet in barangay halls, schools and shorelines. Bayani needs no data plan and no server.</p></div>
        </div>
      </div></section>

      <section><div className="wrap">
        <p className="kicker">Your data, your say</p><h2>AI that answers to the group</h2>
        <div className="grid grid-2" style={{ marginTop: 22 }}>{INTENT.map((x) => <div className="card" key={x.title}><div className="icon"><Icon name={x.icon} /></div><h3>{x.title}</h3><p>{x.body}</p></div>)}</div>
      </div></section>

      <section className="band"><div className="wrap">
        <p className="kicker">Where it stands</p><h2>In development, in the open</h2>
        <ol className="road">{ROAD.map(([k, v]) => <li key={k}><b>{k}</b><span>{v}</span></li>)}</ol>
      </div></section>

      <section><div className="wrap"><div className="cta-band">
        <h2>Help us build AI for the sector</h2>
        <p className="lead">Pilot groups shape what Bayani learns, and decide whether their messages are part of it.</p>
        <div className="btns"><a className="btn btn-primary" href={site.pilotMail}>Join the pilot</a><Link className="btn btn-outline" href="/docs/bix">Read about BIX</Link></div>
      </div></div></section>
    </main>
    <Footer />
  </>;
}
