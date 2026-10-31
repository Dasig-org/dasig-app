import type { Metadata } from "next";
import { meta } from "@/lib/seo";
import { Phones } from "@/components/Phone";
import { Doc } from "@/components/Doc";

export const metadata: Metadata = meta("/docs/volunteering");

export default function Volunteering() {
  return <Doc path="/docs/volunteering" section="/docs">
    <h1>Volunteering</h1>
    <p>Volunteers matter as much as coordinators in Dasig. You use the same app, and your work is yours.</p>
    <h2>Join with a nickname</h2>
    <p>Scan a group's QR code or open its invite. A nickname is all it needs.</p>
    <h2>Find something worthwhile</h2>
    <p><strong>Today</strong> shows what you've taken, what someone asked you to do, and open work you can say “I'm in” to. Some work is marked as a good first step.</p>
    <Phones items={[{ src: "join-invite", alt: "Joining with a nickname" }, { src: "volunteer-today", alt: "Saying I'm in to a coastal cleanup" }]} />
    <h2>Suggest work</h2>
    <p>See something that needs doing? Suggest it. Your team's lead accepts it, and you're credited for the idea.</p>
    <h2>Your story</h2>
    <p>Everything you finish is signed by the group that received it and kept on your phone, across every group you help. Download it any time from <strong>Me → Your data</strong>. Later, you'll be able to show it as a credential anyone can check.</p>
    <Phones items={[{ src: "your-story", alt: "A volunteer's story across groups" }, { src: "signed", alt: "A record, signed and unchanged" }]} />
    <h2>Leaving</h2>
    <p>Leaving a group never erases what you did. Deleting your account removes your profile after 14 days; groups keep the work, credited to “a former volunteer”.</p>
  </Doc>;
}
