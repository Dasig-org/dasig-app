import type { Metadata } from "next";
import { Doc } from "@/components/Doc";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Safety and reports", description: "How to report a group, a listing or a person on the Dasig Ecosystem, and what happens next." };

export default function Safety() {
  return <Doc path="/trust/safety" section="/trust">
    <h1>Safety and reports</h1>
    <p>If something on the Dasig Ecosystem looks wrong, tell us. You don't need an account.</p>
    <div className="btns"><a className="btn btn-primary" href={site.reportMail}>Report a problem</a></div>
    <h2>What to report</h2>
    <ul><li>A group or listing that's fraudulent, or pretends to be another group</li><li>Hateful or sexual content</li><li>Anything that puts someone in danger, especially a child</li><li>Your own information shown where you didn't agree to it</li></ul>
    <h2>What happens next</h2>
    <ol><li>We read every report within 2 working days during the pilot.</li><li>We may hide a listing while we look. Hiding it doesn't delete the group's records.</li><li>We tell the group why, and it can reply or appeal.</li><li>Repeated abuse can close an account. Its records stay downloadable for 30 days.</li></ol>
    <p><strong>If someone is in immediate danger,</strong> call 911 or your local barangay first.</p>
  </Doc>;
}
