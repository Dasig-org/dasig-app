"use client";
import { useState } from "react";
import { KINDS, SIZES } from "@/lib/pilot-options";

export function PilotForm() {
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(null); setState("sending");
    const f = new FormData(e.currentTarget);
    const body = Object.fromEntries(f.entries()) as Record<string, unknown>;
    body.consent = f.get("consent") === "on";
    const r = await fetch("/api/pilot", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (r?.ok) setState("done"); else { setError(j.error ?? "That didn't send. Check your connection and try again."); setState("idle"); }
  }
  if (state === "done") return <div className="card" role="status"><div className="icon">✓</div><h3>Thank you. We got it.</h3><p>We read every request and reply within a week. If you gave an email address, a confirmation is on its way.</p></div>;
  return <form className="form card" onSubmit={submit} noValidate>
    <label>Your name<input name="name" autoComplete="name" required maxLength={80} /></label>
    <label>Email or mobile<input name="contact" autoComplete="email" required maxLength={120} placeholder="you@example.com or 0917 123 4567" /></label>
    <label>Your group's name<input name="group" required maxLength={120} placeholder="e.g. Rotaract Club of Lahug Uplands" /></label>
    <label>What kind of group<select name="kind" required defaultValue=""><option value="" disabled>Choose one</option>{KINDS.map((k) => <option key={k}>{k}</option>)}</select></label>
    <div className="row2">
      <label>Town or city<input name="place" required maxLength={80} placeholder="e.g. Cebu City" /></label>
      <label>How many people<select name="size" required defaultValue=""><option value="" disabled>Choose</option>{SIZES.map((k) => <option key={k}>{k}</option>)}</select></label>
    </div>
    <label>What would you use Dasig for? <span className="muted">(optional)</span><textarea name="use" rows={4} maxLength={1000} placeholder="An event, a program, your officers' year…" /></label>
    <label className="hp" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
    <label className="check"><input type="checkbox" name="consent" required /> You may contact me about the Dasig pilot. <a href="/trust/privacy">How we use this</a></label>
    {error ? <p className="err" role="alert">{error}</p> : null}
    <button className="btn btn-primary" disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Send"}</button>
  </form>;
}
