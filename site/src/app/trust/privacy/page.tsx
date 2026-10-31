import type { Metadata } from "next";
import { meta } from "@/lib/seo";
import Link from "next/link";
import { Doc } from "@/components/Doc";
import { site } from "@/lib/site";

export const metadata: Metadata = meta("/trust/privacy");

export default function Privacy() {
  return <Doc path="/trust/privacy" section="/trust">
    <div className="note"><strong>Draft.</strong> To be reviewed by a Philippine data-privacy adviser before the Ecosystem opens. It isn't legal advice.</div>
    <h1>Privacy</h1>
    <h2>If you ask to join the pilot</h2>
    <p>We keep your name, your email or mobile, and what you tell us about your group, so we can reply. It's stored by the Dasig Ecosystem, separately from Dasig Fundraising, and we delete it when you ask or when the pilot ends, unless your group joins.</p>
    <h2>On your phone</h2>
    <p>The Dasig app keeps your group's records on your phones, or on your group's hub phone. Nothing is sent to Dasig unless your group joins the Dasig Ecosystem.</p>
    <h2>On the Dasig Ecosystem</h2>
    <p>When a group joins, Dasig Inc. keeps its records on the Dasig Ecosystem's server, in Singapore. Dasig Inc. is the personal information controller for those records.</p>
    <table><thead><tr><th>What</th><th>Why</th></tr></thead><tbody>
      <tr><td>Your nickname, and optionally your full name, photo, skills and a line about you</td><td>So your group knows who's doing what</td></tr>
      <tr><td>An email or mobile number, for officers who list their group</td><td>So we can reach the group about its listing</td></tr>
      <tr><td>The work you did, and who confirmed it</td><td>Your record of contribution, and your group's</td></tr>
      <tr><td>Counts of the people a group serves</td><td>Reports; never names</td></tr>
    </tbody></table>
    <h2>What we don't do</h2>
    <ul><li>No advertising, and no selling or renting of data.</li><li>No training of AI models on groups' records unless a group opts in.</li><li>No government ID required to volunteer.</li></ul>
    <h2>Your rights</h2>
    <p>Under the Data Privacy Act you can see, correct, download and delete what's kept about you. In the app: Me → Your data. Or write to <a href={`mailto:${site.privacy}`}>{site.privacy}</a>.</p>
    <p>If something goes wrong, we report a personal data breach to the National Privacy Commission and to the people affected within 72 hours of finding it. See also the <Link href="/trust/host-policy">host policy</Link>.</p>
  </Doc>;
}
