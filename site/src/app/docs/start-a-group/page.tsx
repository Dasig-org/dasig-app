import type { Metadata } from "next";
import { Phones } from "@/components/Phone";
import { Doc } from "@/components/Doc";

export const metadata: Metadata = { title: "Start a group", description: "Set up your volunteer group in Dasig: teams, positions, your first project and inviting people." };

export default function StartAGroup() {
  return <Doc path="/docs/start-a-group" section="/docs">
    <h1>Start a group</h1>
    <p>About five minutes, on one phone, with no internet.</p>
    <h2>1. Open Dasig and give a nickname</h2>
    <p>That's your account. Add a photo and skills later if you like.</p>
    <h2>2. Choose “I run a group”</h2>
    <p>Give your group a name and kind (civic club, school organization, community group and so on). Then choose how it's run: a starting set of positions such as president, secretary and treasurer, with seats and terms. Change them any time. They're starting points, not legal advice.</p>
    <p>You become the group's first officer.</p>
    <h2>3. Start a project</h2>
    <p>An event, a program or this year's plan. Pick the teams it needs from common ones, or name your own. Next time, start from the same teams with one tap.</p>
    <Phones items={[{ src: "start-from-teams", alt: "Starting a project from last year's teams" }, { src: "terms", alt: "Positions with terms and a hand-over" }]} />
    <h2>4. Choose team leads</h2>
    <p>Open a team and tap <strong>Lead</strong>. Leads add work for their team and accept ideas from volunteers.</p>
    <h2>5. Bring your people in</h2>
    <ul>
      <li><strong>Together in one place:</strong> make one phone your group's hub. Others join its hotspot and scan its QR code. No internet needed.</li>
      <li><strong>Apart:</strong> send an invite link (needs internet and the Dasig Ecosystem, in pilot now).</li>
      <li><strong>Without the app:</strong> add someone by nickname, so you can record their work. They can claim it later.</li>
    </ul>
    <h2>6. Do the work</h2>
    <Phones items={[{ src: "call-for-runners", alt: "A task with smaller steps" }, { src: "wrap-up", alt: "Wrapping up a project and saving its teams" }]} />
    <p>Volunteers take tasks, add smaller steps and files, and mark them done. Done is the record: it counts at once and is signed by your group. Money and work with the people you serve still need a second person to confirm.</p>
  </Doc>;
}
