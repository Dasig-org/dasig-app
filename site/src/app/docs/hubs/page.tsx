import type { Metadata } from "next";
import { meta } from "@/lib/seo";
import { Phones } from "@/components/Phone";
import { Doc } from "@/components/Doc";

export const metadata: Metadata = meta("/docs/hubs");

export default function Hubs() {
  return <Doc path="/docs/hubs" section="/docs">
    <h1>Hubs and working offline</h1>
    <p>Many groups meet where the internet is slow or costly. Dasig is built for that: it never needs the internet to do the work.</p>
    <h2>On one phone</h2>
    <p>Bayanihan Server runs inside the Dasig app. One person can run a whole project on their own phone.</p>
    <h2>A group hub</h2>
    <p>Make one phone, or a tablet, your group's hub: <strong>Me → Make this phone your group's hub</strong>. Others join its hotspot and scan its QR code once. After that their phones save to the hub whenever they're near it, and keep working when they aren't.</p>
    <ul>
      <li>The hub decides who got a task first, so two people can't take the same one.</li>
      <li>The hub signs finished work with the group's key.</li>
      <li>Changes made away from the hub wait on the phone and are sent, in order, when it's back in range. Nothing is quietly dropped: anything refused is shown.</li>
    </ul>
    <Phones items={[{ src: "hub-qr", alt: "A tablet as the group's hub, with its QR code" }, { src: "sync", alt: "Changes waiting to sync, in order" }]} caption="Design previews. The hub screen's cloud backup comes with the Dasig Ecosystem." />
    <h2>Every screen says where it's saved</h2>
    <p>A small label at the top shows <strong>Saved on this phone</strong>, <strong>This phone is the hub</strong>, or the hub's status and how fresh its data is.</p>
    <div className="note"><strong>One phone holds everything.</strong> If the hub phone is lost, its records go with it. Keep it safe, download your group's records now and then (group page → Download), and when the Dasig Ecosystem opens you'll be able to keep a copy online.</div>
  </Doc>;
}
