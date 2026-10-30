import type { Metadata } from "next";
import Link from "next/link";
import { Footer, Header } from "@/components/Chrome";

export const metadata: Metadata = { title: "You're invited", robots: { index: false, follow: false } };

/** Invite links (bayanihan.dasig.org/join/…) open the app; this page is the fallback when it isn't installed. */
export default async function Join({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const safe = encodeURIComponent(token);
  return <>
    <Header />
    <main><section className="hero"><div className="wrap" style={{ maxWidth: 560 }}>
      <img src="/emblem.png" alt="" width={72} height={72} />
      <p className="kicker" style={{ marginTop: 18 }}>You're invited</p>
      <h1 style={{ fontSize: 38 }}>Someone wants you on their team</h1>
      <p className="lead">Open this invite in the Dasig app. Joining needs only a nickname.</p>
      <div className="btns"><a className="btn btn-primary" href={`dasig://join/${safe}`}>Open in Dasig</a><Link className="btn btn-outline" href="/get">I don't have the app</Link></div>
      <p className="muted small" style={{ marginTop: 18 }}>The web version, for iPhones and computers, isn't available yet.</p>
    </div></section></main>
    <Footer />
  </>;
}
