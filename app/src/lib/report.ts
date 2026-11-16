import { taskHours } from "@bayanihan/core/figures";
import type { R } from "./bix";

/*
 * The project report (Don, 2026-11-16: "a report of the current status of the project… visual… export into a PDF…
 * see how Rotary and JCI do theirs"). One model, worked out from the project's BIX records, drawn twice: on the screen
 * (app/project/[id]/report.tsx) and as a printable page (reportHtml → PDF). It can be made at any time: before the
 * day it says where the project stands; after, how it went.
 *
 * What it borrows:
 *  - Rotary (Club Central service activities, Showcase): name, dates, partners; contributions and volunteer
 *    participation as Projected next to Achievement; a story with photos.
 *  - JCI (single project entry): a short overview, objectives, what was done, long-term impact and what to change next
 *    time, 2–3 photos per section, supporting documents.
 * Both also report money (budget, actual). BIX has no money records in v0, so the report has none; nothing is made up.
 * Every figure is counted from recorded work, never typed, as before (BIX Report).
 */
type P = { status: string; person: { reference: string }; role?: string };
export type Photo = { hash: string; contentType: string; url: string; size: number; title?: string; showsMinors?: boolean };
export type ReportModel = {
  title: string; group: string; place?: string; when?: string; asOf: string;
  state: "planning" | "underway" | "finished"; stateLabel: string;
  about?: string;
  /** Achieved, next to what was planned when the project has it (Rotary's two columns). */
  figures: { code: string; label: string; value: number; unit?: string; planned?: number }[];
  steps: { done: number; total: number; late: number };
  teams: { id: string; name: string; lead?: string; done: number; total: number; did: string[] }[];
  open: { id: string; title: string; team: string; due?: string; late: boolean; who: string }[];
  needs: { id: string; what: string; got: number; want: number; unit: string }[];
  gave: { who: string; what: string }[];
  partners: string[];
  photos: { a: Photo; caption: string; team: string; milestone: boolean }[];
  docs: { title: string; from: string }[];
  /** The latest words people left on the project and its steps (BIX note[]), newest first. */
  updates: { when?: string; who: string; text: string; on: string }[];
  credits: { team: string; names: string[] }[]; anonymous: number;
  /** A first draft of the summary, for the coordinator to change. */
  draft: string;
};
export type ReportInput = { project: R; org?: R | null; teams: R[]; tasks: R[]; needs: R[]; offers?: R[]; people: Record<string, R>; partners?: R[]; now?: number };

const active = (x: R) => ((x.participant ?? []) as P[]).filter((y) => y.status === "active");
const day = (iso?: string) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }) : undefined);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const round = (n: number) => Math.round(n * 10) / 10;
const ext = (r: R | null | undefined, url: string) => ((r?.extension ?? []) as { url: string; value?: unknown }[]).find((e) => e.url === url)?.value as string | undefined;
/** A person as they chose to be credited: a full name, a nickname, or not at all. */
const credit = (p?: R): string | null => (!p || p.credit === "anonymous" ? null : p.credit === "full" ? ext(p, "bayanihan:full-name") ?? p.name?.text ?? null : p.name?.text ?? null);
const planHours = (x: R) => { const e = x.estimate as { value: number; unit: "min" | "h"; per?: "person" | "task" } | undefined; if (!e) return 0; const h = e.unit === "min" ? e.value / 60 : e.value; return e.per === "task" ? h : h * Math.max(1, Number(x.slots ?? 1)); };

export function buildReport(i: ReportInput): ReportModel {
  const now = i.now ?? Date.now(), p = i.project;
  const live = i.tasks.filter((x) => !["draft", "cancelled"].includes(String(x.status)));
  const done = live.filter((x) => x.status === "completed"), open = live.filter((x) => x.status !== "completed");
  const teamOf = (x: R) => i.teams.find((tm) => `Team/${tm.id}` === x.team?.reference);
  const who = new Set(done.flatMap((x) => active(x).map((y) => y.person.reference)));
  const hours = round(done.reduce((h, x) => h + taskHours(x as never), 0));
  const served = done.flatMap((x) => ((x.output ?? []) as { code?: { code?: string }; value?: unknown }[]).filter((o) => o.code?.code === "people-served").map((o) => Number(o.value))).reduce((a, b) => a + b, 0);
  const target = (code: string) => ((p.target ?? []) as { code?: { code?: string }; value: number }[]).find((x) => x.code?.code === code)?.value;
  const planned = round(live.reduce((h, x) => h + planHours(x), 0));
  const start = p.period?.start ? Date.parse(p.period.start) : NaN, end = p.period?.end ? Date.parse(p.period.end) : start;
  const state = p.status === "completed" || (Number.isFinite(end) && end < now - 12 * 3600000) ? "finished" : done.length || (Number.isFinite(start) && start <= now) ? "underway" : "planning";
  const late = open.filter((x) => x.due && Date.parse(x.due) < now);
  const figures: ReportModel["figures"] = [
    { code: "volunteers-active", label: "volunteers", value: who.size, planned: target("volunteers-active") },
    { code: "volunteer-hours", label: "hours given", value: hours, unit: "h", planned: target("volunteer-hours") ?? (planned > 0 ? planned : undefined) },
    ...(served || target("people-served") ? [{ code: "people-served", label: "people served", value: served, planned: target("people-served") }] : []),
  ];
  const teams = i.teams.map((tm) => {
    const all = live.filter((x) => x.team?.reference === `Team/${tm.id}`), did = all.filter((x) => x.status === "completed");
    const lead = ((tm.participant ?? []) as P[]).find((y) => y.role === "lead" && y.status === "active");
    return { id: tm.id, name: String(tm.name ?? "Team"), lead: lead ? credit(i.people[lead.person.reference]) ?? undefined : undefined, done: did.length, total: all.length, did: did.map((x) => String(x.title)) };
  }).filter((x) => x.total);
  // Everything people left: what came out of a step, what was added to it along the way, and the project's own files.
  const filesOf = (x: R) => [...((x.output ?? []) as { attachment?: Photo[] }[]).flatMap((o) => o.attachment ?? []), ...((x.attachment ?? []) as Photo[])];
  const isPhoto = (a: Photo) => !!a.contentType?.startsWith("image/");
  const once = new Set<string>(), first = (a: Photo) => !once.has(a.hash) && !!once.add(a.hash);
  const photos = [...[...live].sort((a, b) => Number(!!b.milestone) - Number(!!a.milestone)).flatMap((x) => filesOf(x).filter((a) => isPhoto(a) && !a.showsMinors).map((a) => ({ a, caption: String(x.title), team: String(teamOf(x)?.name ?? ""), milestone: !!x.milestone }))),
    ...((p.attachment ?? []) as Photo[]).filter((a) => isPhoto(a) && !a.showsMinors).map((a) => ({ a, caption: a.title && a.title !== "Photo" ? a.title : String(p.title), team: "", milestone: false }))].filter((x) => first(x.a));
  const docs = [...live.flatMap((x) => filesOf(x).filter((a) => a.contentType && !isPhoto(a)).map((a) => ({ title: a.title ?? "Document", from: String(x.title) }))),
    ...((p.attachment ?? []) as Photo[]).filter((a) => a.contentType && !isPhoto(a)).map((a) => ({ title: a.title ?? "Document", from: "The project" }))];
  type N = { author?: { reference: string }; time?: string; text: string };
  const updates = [...((p.note ?? []) as N[]).map((n) => ({ n, on: "The project" })), ...live.flatMap((x) => ((x.note ?? []) as N[]).map((n) => ({ n, on: String(x.title) })))]
    .filter((x) => x.n.text && !/^Can't make it/i.test(x.n.text)).sort((a, b) => String(b.n.time ?? "").localeCompare(String(a.n.time ?? ""))).slice(0, 6)
    .map((x) => ({ when: x.n.time, who: credit(i.people[x.n.author?.reference ?? ""]) ?? "A volunteer", text: x.n.text, on: x.on }));
  let anonymous = 0;
  const seen = new Set<string>();
  const credits = i.teams.map((tm) => {
    const refs = new Set(done.filter((x) => x.team?.reference === `Team/${tm.id}`).flatMap((x) => active(x).map((y) => y.person.reference)));
    const names: string[] = [];
    for (const r of refs) { const n = credit(i.people[r]); if (n) names.push(n); else if (!seen.has(r)) anonymous++; seen.add(r); }
    return { team: String(tm.name ?? "Team"), names };
  }).filter((x) => x.names.length);
  const stateLabel = state === "finished" ? "Finished" : state === "underway" ? `Under way · ${done.length} of ${live.length} steps done` : live.length ? `Being planned · ${plural(live.length, "step")}` : "Being planned";
  const whenText = p.period?.start ? (p.period?.end && day(p.period.end) !== day(p.period.start) ? `${day(p.period.start)} to ${day(p.period.end)}` : day(p.period.start)) : undefined;
  const lead = state === "finished"
    ? `${whenText ? `On ${whenText}, ` : ""}${plural(who.size, "volunteer")} gave ${plural(hours, "hour")} for ${p.title}${served ? `, serving ${plural(served, "person", "people")}` : ""}.`
    : `${p.title} is ${state === "underway" ? "under way" : "being planned"}${whenText ? ` for ${whenText}` : ""}: ${done.length} of ${plural(live.length, "step")} done${late.length ? `, ${late.length} late` : ""}${who.size ? `, with ${plural(who.size, "volunteer")} and ${plural(hours, "hour")} given so far` : ""}.`;
  return {
    title: String(p.title ?? "Project"), group: String(i.org?.name ?? ""), place: ext(p, "bayanihan:place-text") ?? ext(i.org, "bayanihan:place-text"), when: whenText, asOf: new Date(now).toISOString(),
    state, stateLabel, about: p.description ? String(p.description) : undefined, figures,
    steps: { done: done.length, total: live.length, late: late.length }, teams,
    open: open.sort((a, b) => String(a.due ?? "9999").localeCompare(String(b.due ?? "9999"))).map((x) => ({ id: x.id, title: String(x.title), team: String(teamOf(x)?.name ?? ""), due: x.due as string | undefined, late: !!x.due && Date.parse(x.due) < now,
      who: active(x).map((y) => credit(i.people[y.person.reference])).filter(Boolean).join(", ") })),
    needs: i.needs.filter((n) => n.status !== "cancelled").map((n) => ({ id: n.id, what: String(n.category?.display ?? "Need"), got: Number(n.received?.value ?? 0), want: Number(n.quantity?.value ?? 0), unit: String(n.quantity?.unit ?? "") })),
    gave: (i.offers ?? []).filter((o) => o.status === "matched").map((o) => ({ who: credit(i.people[o.offeredBy?.reference]) ?? (o.offeredBy?.reference?.startsWith("Organization/") ? "A partner group" : "A supporter"),
      what: [o.quantity ? `${o.quantity.value} ${o.quantity.unit ?? ""}`.trim() : null, o.description ?? o.category?.display].filter(Boolean).join(" · ") })),
    partners: (i.partners ?? []).map((o) => String(o.name ?? "")).filter(Boolean),
    photos, docs, updates, credits, anonymous,
    draft: [lead, ...teams.filter((x) => x.did.length).map((x) => `${x.name}: ${x.did.map((w) => w.charAt(0).toLowerCase() + w.slice(1)).join(", ")}.`)].join(" "),
  };
}

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);
const pct = (a: number, b: number) => (b > 0 ? Math.max(0, Math.min(100, Math.round((a / b) * 100))) : 0);
export const shareOf = pct;

export type ReportWords = { summary: string; lessons?: string; names: boolean; preparedBy?: string; logo?: string;
  /** The chosen photos, each as a data: link, in the order to show them. */
  photos: { src: string; caption: string; team: string }[] };

/*
 * The report as one printable document (A4), with everything inside it: styles and photos. Printed to PDF by lib/pdf.
 * Laid out like a report a chapter would hand its district (Don, 2026-11-16: "needs a redesign"): a cover band with the
 * group, the project and a photo; the figures as cards; the story next to the facts; teams as cards, not a table; what's
 * left to do kept short (dated steps in a table, undated ones in a line per team); a photo gallery; what people said.
 * Nothing is kept together across a page except a card, a row or a photo, so pages fill instead of leaving half blank.
 */
export function reportHtml(m: ReportModel, w: ReportWords): string {
  const bar = (share: number) => `<div class="bar"><i style="width:${share}%"></i></div>`;
  const section = (title: string, body: string) => (body ? `<section><h2>${esc(title)}</h2>${body}</section>` : "");
  const paras = (text: string) => text.trim().split(/\n+/).map((x) => `<p>${esc(x)}</p>`).join("");
  const d = (iso?: string) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "");
  const ring = (share: number) => `<svg class="ring" viewBox="0 0 36 36"><circle cx="18" cy="18" r="15" fill="none" stroke="#F1E4D8" stroke-width="5"/><circle cx="18" cy="18" r="15" fill="none" stroke="#E85C21" stroke-width="5" stroke-linecap="round" stroke-dasharray="${(share * 94.25) / 100} 94.25" transform="rotate(-90 18 18)"/><text x="18" y="21.5" text-anchor="middle" font-size="9" font-weight="700" fill="#0F172A">${share}%</text></svg>`;
  const hero = w.photos[0], gallery = w.photos.length > 1 ? w.photos : [];
  const dated = m.open.filter((x) => x.due), undated = m.open.filter((x) => !x.due);
  const looseByTeam = new Map<string, string[]>();
  for (const x of undated) looseByTeam.set(x.team || "No team", [...(looseByTeam.get(x.team || "No team") ?? []), x.title]);
  const facts = [["When", m.when], ["Where", m.place], ["Group", m.group], ["Teams", m.teams.length ? `${m.teams.length}` : undefined], ["Partners", m.partners.join(", ") || undefined], ["As of", day(m.asOf)]].filter((x) => x[1]) as [string, string][];
  const kind = m.state === "finished" ? "Project report" : "Status report";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(m.title)} · report</title><style>
@page { size: A4; margin: 13mm 13mm 15mm; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
html { font: 10pt/1.5 -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color: #0F172A; }
body { margin: 0; }
@media screen { body { max-width: 184mm; margin: 10mm auto; padding: 0 4mm; } }
p { margin: 0 0 6px; }
.meta { color: #5B6472; font-size: 8.8pt; }
.cover { display: flex; border-radius: 16px; overflow: hidden; background: linear-gradient(135deg, #F47C26 0%, #E0531C 100%); color: #fff; min-height: 46mm; break-inside: avoid; }
.cover .words { flex: 1; padding: 20px 22px; display: flex; flex-direction: column; justify-content: space-between; gap: 14px; }
.cover .who { display: flex; align-items: center; gap: 10px; font-size: 8.5pt; letter-spacing: .09em; text-transform: uppercase; font-weight: 700; }
.cover .who img { width: 34px; height: 34px; border-radius: 9px; object-fit: cover; border: 2px solid rgba(255,255,255,.85); }
.cover .who span { opacity: .92; }
.cover h1 { font-size: 23pt; line-height: 1.12; margin: 0 0 5px; letter-spacing: -.01em; }
.cover .sub { font-size: 10pt; opacity: .95; }
.cover .pill { align-self: flex-start; background: #fff; color: #7A2B06; border-radius: 999px; padding: 4px 12px; font-size: 9pt; font-weight: 700; }
.cover .shot { width: 40%; background-size: cover; background-position: center; }
.kpis { display: flex; gap: 9px; margin-top: 11px; }
.kpi { flex: 1; border: 1px solid #EFE3D8; background: #FFFBF7; border-radius: 13px; padding: 11px 12px; break-inside: avoid; }
.kpi b { display: block; font-size: 21pt; line-height: 1.05; letter-spacing: -.01em; }
.kpi span { color: #5B6472; font-size: 8.8pt; display: block; }
.kpi span span { display: inline; }
.kpi.steps b { font-size: 16pt; white-space: nowrap; }
.kpi .late { color: #B3261E; font-weight: 700; }
.kpi.steps { display: flex; align-items: center; gap: 10px; }
.ring { width: 46px; height: 46px; flex: none; }
.bar { height: 6px; background: #EADFD5; border-radius: 3px; overflow: hidden; margin-top: 7px; }
.bar i { display: block; height: 6px; background: #E85C21; border-radius: 3px; }
section { margin-top: 17px; }
h2 { font-size: 11.5pt; margin: 0 0 9px; padding-left: 9px; border-left: 4px solid #F47C26; line-height: 1.2; break-after: avoid; }
.story { display: flex; gap: 14px; align-items: flex-start; }
.story .text { flex: 3; font-size: 10.5pt; }
.story h3 { font-size: 8.5pt; text-transform: uppercase; letter-spacing: .08em; color: #B4500F; margin: 10px 0 3px; }
.facts { flex: 2; margin: 0; background: #F6F7F9; border-radius: 13px; padding: 12px 14px; break-inside: avoid; }
.facts div { display: flex; gap: 8px; padding: 4px 0; border-bottom: 1px solid #E6E8EC; font-size: 9.3pt; }
.facts div:last-child { border-bottom: 0; }
.facts dt { width: 52px; color: #5B6472; flex: none; }
.facts dd { margin: 0; font-weight: 600; }
.cards { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
.card { border: 1px solid #E6E8EC; border-radius: 13px; padding: 11px 13px; break-inside: avoid; }
.card .top { display: flex; justify-content: space-between; gap: 8px; align-items: baseline; }
.card .top b { font-size: 10.8pt; }
.card .top span { font-size: 9pt; color: #5B6472; white-space: nowrap; }
.card ul { margin: 7px 0 0; padding: 0; list-style: none; font-size: 9.2pt; }
.card li { padding-left: 15px; position: relative; margin-bottom: 2px; }
.card li::before { content: "✓"; position: absolute; left: 0; color: #E85C21; font-weight: 700; }
.card .none { color: #8A929E; font-size: 9.2pt; margin-top: 7px; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; color: #5B6472; font-size: 8pt; text-transform: uppercase; letter-spacing: .07em; padding: 0 8px 5px 0; border-bottom: 1.5px solid #D9DDE3; }
td { padding: 5px 8px 5px 0; border-bottom: 1px solid #ECEEF1; vertical-align: top; font-size: 9.5pt; }
tr { break-inside: avoid; }
td.n { white-space: nowrap; width: 1%; }
.tag { display: inline-block; border-radius: 999px; padding: 1px 8px; font-size: 8.3pt; font-weight: 700; background: #EEF0F3; color: #334155; white-space: nowrap; }
.tag.late { background: #FDE2E1; color: #B3261E; }
.loose { margin-top: 9px; background: #F6F7F9; border-radius: 11px; padding: 9px 12px; font-size: 9.2pt; break-inside: avoid; }
.loose p { margin: 2px 0; }
.need { display: flex; align-items: center; gap: 12px; padding: 6px 0; border-bottom: 1px solid #ECEEF1; break-inside: avoid; }
.need .what { flex: 1; }
.need .n { font-size: 9.3pt; white-space: nowrap; font-weight: 600; }
.photos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
figure { margin: 0; break-inside: avoid; }
figure img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: 11px; display: block; }
figure.big { grid-column: span 2; grid-row: span 2; }
figure.big img { aspect-ratio: auto; height: calc(100% - 17px); min-height: 60mm; }
figcaption { font-size: 8.3pt; color: #5B6472; margin-top: 3px; line-height: 1.3; }
.quote { border-left: 3px solid #F1D9C6; padding: 2px 0 2px 11px; margin-bottom: 8px; break-inside: avoid; }
.quote p { margin: 0; }
.callout { background: #FFF6EE; border: 1px solid #F6DFCB; border-radius: 13px; padding: 12px 14px; font-size: 10.2pt; }
.callout p:last-child { margin-bottom: 0; }
footer { margin-top: 20px; padding-top: 9px; border-top: 1px solid #E6E8EC; color: #6B7280; font-size: 8.3pt; display: flex; justify-content: space-between; gap: 12px; break-inside: avoid; }
</style></head><body>
<div class="cover"><div class="words"><div class="who">${w.logo ? `<img src="${w.logo}" alt="">` : ""}<span>${esc(m.group || "Project")} · ${kind}</span></div>
<div><h1>${esc(m.title)}</h1><div class="sub">${esc([m.when, m.place].filter(Boolean).join(" · "))}</div></div><span class="pill">${esc(m.stateLabel)}</span></div>
${hero ? `<div class="shot" style="background-image:url('${hero.src}')"></div>` : ""}</div>
<div class="kpis">${m.figures.map((f) => `<div class="kpi"><b>${esc(f.value)}${f.unit ? ` ${esc(f.unit)}` : ""}</b><span>${esc(f.label)}</span>${f.planned ? `<span>planned ${esc(f.planned)}</span>` : ""}${f.planned ? bar(pct(f.value, f.planned)) : ""}</div>`).join("")}
<div class="kpi steps">${ring(pct(m.steps.done, m.steps.total))}<div><b>${m.steps.done} of ${m.steps.total}</b><span>steps done${m.steps.late ? ` · <span class="late">${m.steps.late} late</span>` : ""}</span></div></div></div>
<section><h2>Summary</h2><div class="story"><div class="text">${paras(w.summary)}${m.about ? `<h3>What it&#39;s for</h3>${paras(m.about)}` : ""}</div>
<dl class="facts">${facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl></div></section>
${section("Progress by team", m.teams.length ? `<div class="cards">${m.teams.map((x) => `<div class="card"><div class="top"><b>${esc(x.name)}</b><span>${x.done} of ${x.total} done</span></div>${bar(pct(x.done, x.total))}<div class="meta" style="margin-top:6px">${esc(x.lead ? `Led by ${x.lead}` : "No lead yet")}</div>${x.did.length ? `<ul>${x.did.slice(0, 5).map((t) => `<li>${esc(t)}</li>`).join("")}${x.did.length > 5 ? `<li>and ${x.did.length - 5} more</li>` : ""}</ul>` : `<div class="none">Nothing finished yet</div>`}</div>`).join("")}</div>` : "")}
${section(m.state === "finished" ? "Left undone" : "Still to do", m.open.length ? (dated.length ? `<table><tr><th>Step</th><th>Team</th><th>Who</th><th>Due</th></tr>${dated.map((x) => `<tr><td>${esc(x.title)}</td><td>${esc(x.team)}</td><td>${esc(x.who || "Nobody yet")}</td><td class="n"><span class="tag${x.late ? " late" : ""}">${esc(d(x.due))}${x.late ? " · late" : ""}</span></td></tr>`).join("")}</table>` : "")
  + (undated.length ? `<div class="loose"><p class="meta"><b>${plural(undated.length, "step")} with no date yet</b></p>${[...looseByTeam.entries()].map(([team, list]) => `<p><b>${esc(team)}:</b> ${esc(list.join(", "))}</p>`).join("")}</div>` : "") : "")}
${section("Needs and what was given", m.needs.map((n) => `<div class="need"><div class="what"><b>${esc(n.what)}</b>${n.want ? bar(pct(n.got, n.want)) : ""}</div><div class="n">${n.want ? `${n.got} of ${n.want} ${esc(n.unit)}` : esc(n.got || "Open")}</div></div>`).join("")
  + (m.gave.length ? `<p class="meta" style="margin-top:8px">Given by: ${esc(m.gave.map((g) => `${g.who}${g.what ? ` (${g.what})` : ""}`).join("; "))}</p>` : ""))}
${section("Partners", m.partners.length ? `<p>${esc(m.partners.join(", "))}</p>` : "")}
${section("Photos", gallery.length ? `<div class="photos">${gallery.map((ph, i) => `<figure${i === 0 && gallery.length >= 3 ? ' class="big"' : ""}><img src="${ph.src}" alt=""><figcaption>${esc([ph.caption, ph.team].filter(Boolean).join(" · "))}</figcaption></figure>`).join("")}</div>` : hero ? `<p class="meta">${esc([hero.caption, hero.team].filter(Boolean).join(" · "))} (on the cover)</p>` : "")}
${section("Latest updates", m.updates.map((u) => `<div class="quote"><p>${esc(u.text)}</p><p class="meta">${esc([u.who, u.on, d(u.when)].filter(Boolean).join(" · "))}</p></div>`).join(""))}
${section("Documents", m.docs.length ? `<table>${m.docs.map((x) => `<tr><td>${esc(x.title)}</td><td class="meta">${esc(x.from)}</td></tr>`).join("")}</table><p class="meta" style="margin-top:6px">Kept with the project's records in Dasig.</p>` : "")}
${section("What we learned, and next time", w.lessons?.trim() ? `<div class="callout">${paras(w.lessons)}</div>` : "")}
${section("With thanks to", w.names && m.credits.length ? m.credits.map((x) => `<p><b>${esc(x.team)}:</b> ${esc(x.names.join(", "))}</p>`).join("") + (m.anonymous ? `<p class="meta">And ${plural(m.anonymous, "helper")} who chose not to be named.</p>` : "")
  : !w.names && m.figures[0]?.value ? `<p>${plural(m.figures[0].value, "volunteer")} across ${plural(m.teams.length, "team")}.</p>` : "")}
<footer><span>Figures are counted from work recorded in Dasig, not typed. As of ${esc(day(m.asOf))}.</span><span>${w.preparedBy ? `Prepared by ${esc(w.preparedBy)}` : ""}${m.group ? `${w.preparedBy ? " for " : ""}${esc(m.group)}` : ""}</span></footer>
</body></html>`;
}
