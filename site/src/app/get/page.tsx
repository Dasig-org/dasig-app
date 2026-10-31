import type { Metadata } from "next";
import { meta } from "@/lib/seo";
import { Footer, Header } from "@/components/Chrome";
import { Icon } from "@/components/Icon";
import { Phones } from "@/components/Phone";
import { site } from "@/lib/site";
import { TeamsScene } from "@/components/Scenes";

export const metadata: Metadata = meta("/get");

export default function Get() {
  return <>
    <Header />
    <main><section className="hero"><div className="wrap">
      <div className="hero-grid"><div>
      <p className="kicker">Get the app</p>
      <h1>Dasig is in pilot</h1>
      <p className="lead">We're testing with a small number of groups before it opens to everyone. Pilot groups get the app on their phones directly from us, with help setting up.</p>
      <div className="btns"><a className="btn btn-primary" href={site.pilotMail}>Ask to join the pilot</a></div>
      </div><TeamsScene /></div>
      <div className="grid grid-3" style={{ marginTop: 26 }}>
        <div className="card"><div className="icon"><Icon name="check" /></div><h3>Android</h3><p>In pilot now. On Google Play after the pilot.</p></div>
        <div className="card"><div className="icon"><Icon name="phone" /></div><h3>iPhone</h3><p>The same app, being prepared for the App Store.</p></div>
        <div className="card"><div className="icon"><Icon name="wifioff" /></div><h3>No internet needed</h3><p>Once installed, Dasig works on its own, or with a group hub over a phone's hotspot.</p></div>
      </div>
      <Phones items={[{ src: "coordinator-week", alt: "A coordinator's week" }, { src: "volunteer-today", alt: "A volunteer saying I'm in" }, { src: "hub-qr", alt: "A tablet as the group's hub" }]} />
    </div></section></main>
    <Footer />
  </>;
}
