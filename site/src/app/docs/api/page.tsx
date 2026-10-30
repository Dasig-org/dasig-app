import type { Metadata } from "next";
import { Doc } from "@/components/Doc";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "API reference", description: "The Bayanihan Server API: read, search and change BIX records, verify signatures, share links, files, pairing and export." };

const API: [string, string, string][] = [
  ["GET", "/metadata", "What this server supports: BIX version, resource types, interactions"],
  ["GET", "/{type}/{id}", "One record, if you may see it. Private records answer “not found”, never “forbidden”"],
  ["GET", "/{type}?field=value", "Search, e.g. /Task?team=Team/…"],
  ["GET", "/{type}/{id}/_history", "Every version of a record"],
  ["POST", "/", "A transaction or sync Bundle: one or more changes, each checked against lifecycles and permissions"],
  ["GET", "/{type}/{id}/$can", "What you may do with this record, and who may change it"],
  ["GET", "/{type}/{id}/$verify", "Who signed which version, and whether it is unchanged"],
  ["GET", "/$keys/{type}/{id}", "A group's public signing key"],
  ["GET", "/Decision/{id}/$tally", "Votes cast and the count, once the vote closes"],
  ["POST", "/$me", "Your Person on this server (creates it with a nickname the first time)"],
  ["POST", "/$me/delete", "Delete your account after a 14-day grace period; ?cancel=1 to undo"],
  ["GET", "/Person/{id}/$export", "Everything that names you, as a BIX Bundle"],
  ["GET", "/Organization/{id}/$export", "A group's records, for its officers"],
  ["POST", "/$files", "Upload a file (binary, or base64 JSON with ?b64=1). Returns an Attachment"],
  ["GET", "/$files/{hash}", "Download a file you may see"],
  ["POST", "/$links", "Create a share link for a record (view, join a team, join the group, propose, comment)"],
  ["GET", "/$links", "Your links"],
  ["POST", "/$links/{id}/revoke", "Turn a link off"],
  ["GET", "/$link/{token}", "What a link shows to the person opening it"],
  ["POST", "/$link/{token}/join", "Join the team or group the link is for"],
  ["POST", "/$pair", "Pair a phone with a hub using its pairing code; returns a token"],
];

export default function Api() {
  return <Doc path="/docs/api" section="/docs">
    <h1>API reference</h1>
    <p>Every Bayanihan Server speaks the same API: the one inside each phone, a group's hub, and the Dasig Ecosystem at <code>{site.api}</code> (in pilot). Requests and responses are JSON BIX records.</p>
    <h2>Authentication</h2>
    <p>Send <code>Authorization: Bearer &lt;token&gt;</code>. A token comes from pairing with a hub (<code>POST /$pair</code>) or from signing in to a hosted server. Reading public summaries needs no token.</p>
    <h2>Endpoints</h2>
    <table><thead><tr><th></th><th>Path</th><th>What it does</th></tr></thead><tbody>{API.map(([m, p, d]) => <tr key={m + p}><td><code>{m}</code></td><td><code>{p}</code></td><td>{d}</td></tr>)}</tbody></table>
    <h2>A change, end to end</h2>
    <pre><code>{`POST / 
{ "type": "transaction",
  "entry": [{ "resource": {
    "resourceType": "Task", "id": "…", "meta": { "version": 2 },
    "status": "accepted", "owner": { "reference": "Person/…" }, … } }] }

→ 200 { "entry": [{ "ok": true, "record": { … "meta": { "version": 2 } } }] }
→ 409 { "entry": [{ "ok": false, "reasons": ["someone got there first"], "current": { … } }] }`}</code></pre>
    <p>Send the next version of the record. If someone changed it first, the server refuses and returns the current version, so the app can tell the person what happened.</p>
  </Doc>;
}
