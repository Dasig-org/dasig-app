import type { Metadata } from "next";
import Link from "next/link";
import { Phones } from "@/components/Phone";
import { Doc } from "@/components/Doc";

export const metadata: Metadata = { title: "Trust, privacy and safety", description: "How the Dasig Ecosystem keeps groups' records safe: open admission, a separate verification badge, privacy rules the server enforces, and free export." };

export default function Trust() {
  return <Doc path="/trust" section="/trust">
    <h1>Trust, privacy and safety</h1>
    <p>Dasig works for groups that serve children, patients and families, so safety is part of the app from the start, not an add-on.</p>
    <h2>What the app and the server always do</h2>
    <ul>
      <li><strong>The people you serve are counts</strong>, never named records.</li>
      <li><strong>Small numbers are hidden</strong> in anything public: below 5 shows as “fewer than 5”.</li>
      <li><strong>Photos of children never leave the group</strong> when they're marked as showing children.</li>
      <li><strong>Strangers can't post into your group.</strong> Anything that arrives through a public link is a private draft until a member accepts it.</li>
      <li><strong>Every invite link can be turned off</strong> at once.</li>
      <li><strong>You can leave with everything.</strong> Download your records at any time, free.</li>
      <li><strong>Deleting your account</strong> removes your profile, contact and photos after 14 days. Groups keep the work, credited to “a former volunteer”.</li>
    </ul>
    <Phones items={[{ src: "your-data", alt: "Your data: download, choose what shows, delete" }, { src: "links-safety", alt: "Invite links you can turn off" }, { src: "signed", alt: "A signed record" }]} />
    <h2>Who can join the Ecosystem</h2>
    <p>Anyone. Groups don't need to be registered, and volunteers join with a nickname. Verification is a separate badge for organizations that want it. Organizations already verified on Dasig Fundraising carry it over.</p>
    <h2>Read more</h2>
    <ul>
      <li><Link href="/trust/host-policy">Host policy</Link>: the rules for the Dasig Ecosystem as a host.</li>
      <li><Link href="/trust/privacy">Privacy</Link>: what we keep and why.</li>
      <li><Link href="/trust/safety">Safety and reports</Link>: how to report a problem.</li>
    </ul>
  </Doc>;
}
