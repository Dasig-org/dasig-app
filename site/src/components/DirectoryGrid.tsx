"use client";
import { useEffect, useRef, useState } from "react";
import type { DirectoryPage, Listed } from "@/lib/directory";

const initials = (n: string) => n.split(/\s+/).filter((w) => /^[A-Za-z0-9]/.test(w)).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
const STATUS: Record<string, string> = { planned: "Planned", active: "Happening now", completed: "Done" };

function Logo({ g, size }: { g: Listed; size: number }) {
  return g.logo
    ? <img className="dir-logo" src={g.logo} alt="" width={size} height={size} loading="lazy" />
    : <span className="dir-logo dir-initials" style={{ width: size, height: size, fontSize: size * 0.34 }} aria-hidden="true">{initials(g.name)}</span>;
}

/** Listed groups as logo tiles, with "Show more", and a small details sheet that closes by its button, Esc or a tap outside. */
export function DirectoryGrid({ first }: { first: DirectoryPage }) {
  const [groups, setGroups] = useState(first.groups);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<Listed | null>(null);
  const dlg = useRef<HTMLDialogElement>(null);

  useEffect(() => { if (open) dlg.current?.showModal(); else dlg.current?.close(); }, [open]);

  const more = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`/api/directory?offset=${groups.length}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setGroups((g) => [...g, ...(d as DirectoryPage).groups.filter((x) => !g.some((y) => y.id === x.id))]);
    } catch (e) { setErr(e instanceof Error && e.message ? e.message : "Couldn't load more groups."); } finally { setBusy(false); }
  };

  return <>
    <ul className="dir-grid">{groups.map((g) => <li key={g.id}>
      <button type="button" className="dir-tile" onClick={() => setOpen(g)} aria-haspopup="dialog">
        <Logo g={g} size={64} /><span className="dir-name">{g.name}</span>{g.place ? <span className="dir-place">{g.place}</span> : null}
      </button>
    </li>)}
      {first.total < 24 ? <li><a className="dir-tile dir-yours" href="/pilot"><span className="dir-logo dir-plus" aria-hidden="true">+</span><span className="dir-name">Your group here</span><span className="dir-place">Join the pilot</span></a></li> : null}
    </ul>
    {groups.length < first.total ? <div className="btns" style={{ justifyContent: "center" }}>
      <button type="button" className="btn btn-outline" onClick={more} disabled={busy}>{busy ? "Loading…" : `Show more (${first.total - groups.length})`}</button>
    </div> : null}
    {err ? <p className="muted small" style={{ textAlign: "center" }}>{err}</p> : null}

    <dialog ref={dlg} className="dir-dialog" aria-labelledby="dir-title" onClose={() => setOpen(null)}
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(null); }}>
      {open ? <div className="dir-sheet">
        <button type="button" className="dir-close" onClick={() => setOpen(null)} aria-label="Close">×</button>
        <Logo g={open} size={72} />
        <h3 id="dir-title">{open.name}</h3>
        <p className="dir-meta">{[open.kind, open.place].filter(Boolean).join(" · ")}</p>
        {open.causes.length ? <div className="pill-row" style={{ marginTop: 10 }}>{open.causes.map((c) => <span className="pill" key={c}>{c}</span>)}</div> : null}
        {open.about ? <p className="dir-about">{open.about}</p> : null}
        {open.projects.length ? <><p className="dir-sub">Projects</p><ul className="dir-projects">{open.projects.map((p) => <li key={p.title}>
          <b>{p.title}</b>{p.status && STATUS[p.status] ? <span>{STATUS[p.status]}</span> : null}</li>)}</ul></> : null}
        <a className="btn btn-primary" href="/get" style={{ marginTop: 16, width: "100%" }}>Ask to join in the Dasig app</a>
      </div> : null}
    </dialog>
  </>;
}
