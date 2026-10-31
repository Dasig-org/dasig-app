import type { Metadata } from "next";
import { meta } from "@/lib/seo";
import { Doc } from "@/components/Doc";

export const metadata: Metadata = meta("/status");

export default function Status() {
  const rows = [
    { name: "Dasig app on phones and hubs", state: "Working", ok: true, note: "Doesn't depend on any server" },
    { name: "Bayanihan Server (ecosystem.dasig.org)", state: "In pilot", ok: true, note: "Live for pilot groups, backed up continuously" },
    { name: "Directory", state: "In pilot", ok: true, note: "Lists groups that chose to be found" },
  ];
  return <Doc path="/status" section="/trust">
    <h1>Status</h1>
    <p>What's running right now. This page will show live checks after the pilot.</p>
    <div className="list" style={{ marginTop: 18 }}>{rows.map((r) => <div key={r.name}><span className={`status-dot${r.ok ? " ok" : ""}`} /><span className="lines"><b>{r.name}</b><i>{r.note}</i></span><span className="muted small">{r.state}</span></div>)}</div>
  </Doc>;
}
