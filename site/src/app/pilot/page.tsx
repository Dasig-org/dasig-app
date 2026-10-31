import type { Metadata } from "next";
import { meta } from "@/lib/seo";
import { Footer, Header } from "@/components/Chrome";
import { TeamsScene } from "@/components/Scenes";
import { PilotForm } from "./Form";

export const metadata: Metadata = meta("/pilot");

export default function Pilot() {
  return <>
    <Header />
    <main><section className="hero"><div className="wrap hero-grid">
      <div>
        <p className="kicker">Join the pilot</p>
        <h1>Bring Dasig to your group</h1>
        <p className="lead">We're working with a small number of groups before Dasig opens to everyone. You get the app on your phones, help setting up your teams, and a say in how it works.</p>
        <div style={{ marginTop: 22 }}><PilotForm /></div>
      </div>
      <TeamsScene />
    </div></section></main>
    <Footer />
  </>;
}
