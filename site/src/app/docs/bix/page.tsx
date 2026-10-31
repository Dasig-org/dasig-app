import type { Metadata } from "next";
import { meta } from "@/lib/seo";
import { Doc } from "@/components/Doc";

export const metadata: Metadata = meta("/docs/bix");

const TYPES = [
  ["Organization, Person, Role, Position", "Who: groups (registered or informal), people, their roles, and positions with seats and terms"],
  ["Initiative, Team", "What the group is doing: plans, programs, projects and sessions, and the teams that run them"],
  ["Task", "One step someone can take: claim it, be asked, help out, mark it done"],
  ["Need, Offer", "Asks and commitments: goods, a venue, a skill, people"],
  ["Decision, Vote", "Deciding together, counted by the rules engine"],
  ["Goal, Report", "Shared aims many groups enroll in, and reports derived from the work, never typed in"],
  ["Provenance", "Who did what, who confirmed it, and the group's signature"],
  ["ShareLink, Consent, SharingPolicy, Endpoint", "Sharing, consent, privacy defaults, and where a group's records live"],
];

export default function Bix() {
  return <Doc path="/docs/bix" section="/docs">
    <h1>BIX</h1>
    <p>The <strong>Bayanihan Information Exchange</strong> is an open format for the work volunteer groups do. Any app that speaks BIX can read and write the same records, so a group can change apps, or run its own server, without losing its history.</p>
    <h2>Where it comes from</h2>
    <ul>
      <li><strong>HL7® FHIR®</strong>, the standard health care uses to share records, gives BIX its pattern: resources, references, lifecycles, extensions, bundles and a REST API. FHIR® is the registered trademark of HL7 and is used with the permission of HL7. BIX is not affiliated with or endorsed by HL7.</li>
      <li><strong>Civic Interconnect's CAE and CEP</strong> give it a classification of civic things and a way to export confirmed work.</li>
      <li><strong>Blockchain's cryptography, without a blockchain:</strong> signed records and, later, hash chains and public anchoring, so records can be checked without anything that can't be deleted.</li>
    </ul>
    <h2>The records</h2>
    <table><thead><tr><th>Resources</th><th>For</th></tr></thead><tbody>{TYPES.map(([a, b]) => <tr key={a}><td><code>{a}</code></td><td>{b}</td></tr>)}</tbody></table>
    <h2>Rules every BIX server follows</h2>
    <ul>
      <li>Every change follows a lifecycle. A transition that isn't allowed is refused, never quietly merged.</li>
      <li>A suggestion from an AI model or a stranger is a draft until a person commits it. Models never commit and never vote.</li>
      <li>Done is the record: finished work counts at once and is signed by the group's server or hub. Money and work with the people served still need a second person to confirm.</li>
      <li>People served are counts, small numbers are hidden in public, and everything about a person can be downloaded by that person.</li>
    </ul>
    <h2>Status</h2>
    <p>BIX is at <strong>v0.1</strong>, a draft shaped with the groups taking part in the pilot. The JSON Schemas, the full specification and the change log will be published with the first open-source release.</p>
  </Doc>;
}
