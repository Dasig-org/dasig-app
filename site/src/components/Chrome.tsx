import Link from "next/link";
import { site } from "@/lib/site";

const NAV = [
  { href: "/directory", label: "Directory", sm: false },
  { href: "/docs", label: "Docs", sm: false },
  { href: "/trust", label: "Trust", sm: true },
  { href: "/about", label: "About", sm: true },
];

export function Header({ current }: { current?: string }) {
  return <>
    {site.draft ? <div className="draft">Draft for review. Not published. Nothing here is live yet.</div> : null}
    <header className="top"><div className="wrap">
      <Link href="/" className="brand" aria-label="Dasig Ecosystem, home"><img src="/emblem.png" alt="" width={34} height={34} /><span>Dasig<small>ECOSYSTEM</small></span></Link>
      <nav className="nav" aria-label="Main">
        {NAV.map((n) => <Link key={n.href} href={n.href} className="nav-wide" aria-current={current === n.href ? "page" : undefined}>{n.label}</Link>)}
        <a className="btn btn-primary btn-sm" href={site.pilotMail}>Join the pilot</a>
        {/* Phones: one menu button instead of a row of links. A <details> needs no JavaScript. */}
        <details className="menu">
          <summary aria-label="Menu"><span /><span /><span /></summary>
          <div className="menu-panel">
            <Link href="/">Home</Link>
            {NAV.map((n) => <Link key={n.href} href={n.href} aria-current={current === n.href ? "page" : undefined}>{n.label}</Link>)}
            <Link href="/get">Get the app</Link>
            <Link href="/status">Status</Link>
          </div>
        </details>
      </nav>
    </div></header>
  </>;
}

export function Footer() {
  return <footer className="foot"><div className="wrap">
    <div className="foot-grid">
      <div>
        <Link href="/" className="brand"><img src="/emblem.png" alt="" width={30} height={30} /><span style={{ color: "var(--ink)" }}>Dasig Ecosystem</span></Link>
        <p style={{ maxWidth: 340 }}>An open-source app and ecosystem for volunteer groups and organizations, run by Dasig Inc.</p>
      </div>
      <div><h4>Use it</h4><Link href="/get">Get the app</Link><Link href="/directory">Directory</Link><Link href="/docs/start-a-group">Start a group</Link><Link href="/docs/volunteering">Volunteering</Link></div>
      <div><h4>Build on it</h4><Link href="/docs/bix">BIX</Link><Link href="/docs/api">API</Link><Link href="/docs/self-hosting">Run your own server</Link><Link href="/about#open-source">Open source</Link></div>
      <div><h4>Trust</h4><Link href="/trust/host-policy">Host policy</Link><Link href="/trust/privacy">Privacy</Link><Link href="/trust/safety">Safety and reports</Link><Link href="/status">Status</Link></div>
    </div>
    <p className="legal">Raising money for a cause? That's <a href="https://dasig.org" style={{ display: "inline", textDecoration: "underline" }}>Dasig Fundraising</a>.<br />
      Dasig and the hands emblem are trademarks of Dasig Inc. Contact: <a href={`mailto:${site.contact}`} style={{ display: "inline" }}>{site.contact}</a></p>
  </div></footer>;
}
