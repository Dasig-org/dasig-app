import type { Metadata } from "next";
import Link from "next/link";
import { meta } from "@/lib/seo";
import { Doc } from "@/components/Doc";

export const metadata: Metadata = meta("/docs/bix");

const TYPES = [
  ["Organization, Person, Role, Position", "Who: groups (registered or informal), people, their roles, and positions with seats and terms"],
  ["Initiative, Team", "What the group is doing: plans, programs, projects and sessions, and the teams that run them"],
  ["Task", "One step someone can take: claim it, be asked, help out, mark it done"],
  ["TaskDefinition, InitiativeTemplate", "A group's way of working, saved: the steps a kind of work needs, and its usual teams"],
  ["Need, Offer", "Asks and commitments: goods, a venue, a skill, people"],
  ["Decision, Vote", "Deciding together, counted by the rules engine"],
  ["Goal, Report", "Shared aims many groups enroll in, and reports derived from the work, never typed in"],
  ["Provenance", "Who did what, who confirmed it, whether a model suggested it, and the group's signature"],
  ["ShareLink, Consent, SharingPolicy, Endpoint", "Sharing, consent, privacy defaults, and where a group's records live"],
];

export default function Bix() {
  return <Doc path="/docs/bix" section="/docs">
    <h1>BIX</h1>
    <p>The <strong>Bayanihan Information Exchange</strong> is an open standard for the work volunteer groups do. Any app that speaks BIX can read and write the same records, so a group can change apps, or run its own server, without losing its history.</p>

    <h2>Who makes it</h2>
    <p>BIX is developed by <strong>Dasig Inc.</strong>, the team behind the Dasig app, and shaped by the groups taking part in the pilot. Groups that shape it are credited as contributors, with their permission.</p>
    <p>BIX is open to contribution. As organizations join, it is to be governed together with them, and how those decisions are shared will be designed with them rather than in advance. Dasig is one app built on BIX. It is meant to have others.</p>

    <h2>Where it comes from</h2>
    <ul>
      <li><strong>HL7® FHIR®</strong>, the standard health care uses to share records, gives BIX its pattern: resources, references, lifecycles, extensions, bundles and a REST API. FHIR® is the registered trademark of HL7 and is used with the permission of HL7. BIX is not affiliated with or endorsed by HL7.</li>
      <li><strong>Civic Interconnect's CAE and CEP</strong> give it a classification of civic things and a way to export confirmed work.</li>
      <li><strong>Blockchain's cryptography, without a blockchain:</strong> signed records and, later, hash chains and public anchoring, so records can be checked without anything that can't be deleted.</li>
    </ul>

    <h2>The records</h2>
    <table><thead><tr><th>Resources</th><th>For</th></tr></thead><tbody>{TYPES.map(([a, b]) => <tr key={a}><td><code>{a}</code></td><td>{b}</td></tr>)}</tbody></table>

    <h2>How BIX breaks work down</h2>
    <p>Philippine groups work through committees, and BIX is built around them. Work lands with a team first, and its lead splits it up and hands it out.</p>
    <ul>
      <li><strong>Smaller steps.</strong> A task can be part of a bigger one (<code>Task.partOf</code>), and can wait on others (<code>Task.dependsOn</code>).</li>
      <li><strong>How far it reaches.</strong> Each task says who can see and take it: the team, the whole group, or outside volunteers (<code>Task.audience</code>). <code>goodFirstStep</code> marks work suited to newcomers.</li>
      <li><strong>Teach it once.</strong> A group saves the steps a kind of work needs (<code>TaskDefinition</code>) and its usual teams (<code>InitiativeTemplate</code>). The next project or need starts from them, so nobody writes the same task list twice.</li>
    </ul>

    <h2>Built for AI that proposes, and people who decide</h2>
    <p>Anything a model produces is a draft (<code>intent: proposal</code>, <code>status: draft</code>), with a <code>Provenance</code> record naming the model and its version. Only a person, or a rule the group declared, can make it real. <Link href="/bayani">Bayani 1</Link>, the small language model in development, works this way inside Dasig, and can work the same way inside any app built on BIX.</p>

    <h2>Rules every BIX server follows</h2>
    <ul>
      <li>Every change follows a lifecycle. A transition that isn't allowed is refused, never quietly merged.</li>
      <li>A suggestion from an AI model or a stranger is a draft until a person commits it. Models never commit and never vote.</li>
      <li>Done is the record: finished work counts at once and is signed by the group's server or hub. Money and work with the people served still need a second person to confirm.</li>
      <li>People served are counts, small numbers are hidden in public, and everything about a person can be downloaded by that person.</li>
    </ul>

    <h2>Extending it</h2>
    <p>Groups and developers can add to BIX without changing its core, the way plugins extend WordPress: kinds of work for a sector, their own vocabulary, extra fields, new resource types, and profiles such as disaster response. A module never redefines what the core already says.</p>

    <h2>Licences and status</h2>
    <p>The specification is licensed under <strong>CC BY 4.0</strong> and the JSON Schemas under <strong>Apache-2.0</strong>. BIX is at <strong>v0.1</strong>, a draft shaped with the groups in the pilot. The schemas, the full specification and the change log will be published with the first open-source release. Every server says which version it speaks at <code>/metadata</code>; see the <Link href="/docs/api">API reference</Link>.</p>
  </Doc>;
}
