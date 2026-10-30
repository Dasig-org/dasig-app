import Link from "next/link";
import { Footer, Header } from "./Chrome";

export const DOCS = [
  { group: "Use Dasig", items: [{ href: "/docs", label: "Overview" }, { href: "/docs/start-a-group", label: "Start a group" }, { href: "/docs/volunteering", label: "Volunteering" }, { href: "/docs/hubs", label: "Hubs and working offline" }] },
  { group: "Build on it", items: [{ href: "/docs/bix", label: "BIX" }, { href: "/docs/api", label: "API reference" }, { href: "/docs/self-hosting", label: "Run your own server" }] },
  { group: "Trust", items: [{ href: "/trust", label: "Overview" }, { href: "/trust/host-policy", label: "Host policy" }, { href: "/trust/privacy", label: "Privacy" }, { href: "/trust/safety", label: "Safety and reports" }, { href: "/status", label: "Status" }] },
];

function Menu({ path }: { path: string }) {
  return <>{DOCS.map((g) => <div key={g.group}><h4>{g.group}</h4>{g.items.map((i) => <Link key={i.href} href={i.href} aria-current={i.href === path ? "page" : undefined}>{i.label}</Link>)}</div>)}</>;
}

/** A docs or trust page: the side menu, then the text. */
export function Doc({ path, section, children }: { path: string; section: "/docs" | "/trust"; children: React.ReactNode }) {
  return <>
    <Header current={section} />
    <main className="wrap doc">
      <details className="side-sm">
        <summary>{DOCS.flatMap((g) => g.items).find((i) => i.href === path)?.label ?? "Pages"}<span aria-hidden="true">▾</span></summary>
        <Menu path={path} />
      </details>
      <nav className="side" aria-label="Pages"><Menu path={path} /></nav>
      <article className="prose">{children}</article>
    </main>
    <Footer />
  </>;
}
