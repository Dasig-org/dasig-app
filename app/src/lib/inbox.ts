import { bix, now, type R } from "./bix";
import { act, peopleFor, personName } from "./work";

/**
 * The Inbox (workspace/docs/ux/NAVIGATION_PLAN.md): one list of what needs this person, from records that already
 * exist. Nothing new is stored. Asks for you; in groups you run, join requests, unanswered asks, ideas,
 * offers and reports to send. Later, every push notification will be one of these.
 */
export type Item = { id: string; kind: "ask" | "invitation" | "asked-to-do" | "join" | "team-join" | "unanswered" | "idea" | "offer" | "report";
  title: string; meta: string; who?: R; go?: string; yes?: () => Promise<unknown>; no?: () => Promise<unknown>; yesLabel?: string; noLabel?: string; at: string };

let count = 0;
const listeners = new Set<(n: number) => void>();
export const onInboxCount = (l: (n: number) => void) => { listeners.add(l); l(count); return () => { listeners.delete(l); }; };

type Group = { org: R; role: R };
export async function loadInbox(me: string, groups: Group[]): Promise<Item[]> {
  const items: Item[] = [];
  const at = (r: R) => (r.meta as any)?.lastUpdated ?? "";
  // For you, in every group: asks and proposed swaps.
  const mine = await bix.search("Task", { owner: me }).catch(() => [] as R[]);
  for (const x of mine.filter((t) => t.status === "requested"))
    items.push({ id: `ask-${x.id}`, kind: "ask", title: x.title, meta: "Asked of you", go: `/task/${x.id}`, at: at(x),
      yes: () => bix.commit(act.claim(x, me)), no: () => bix.commit(act.release(x)), yesLabel: "I'm in", noLabel: "Can't" });
  // Invitations to me (BIX Invitation), on the network only.
  const invs = await (await import("./invites")).myInvitations();
  for (const v of invs) items.push({ id: `inv-${v.id}`, kind: "invitation", title: `${v.invitedBy.name} invited you`, meta: [v.group?.name, v.target.reference.startsWith("Organization/") ? null : v.target.title].filter(Boolean).join(" · "),
    go: "/invitations", at: v.expires, yes: async () => { const { answerInvitation } = await import("./invites"); return answerInvitation(v.id, "accept"); }, no: async () => { const { answerInvitation } = await import("./invites"); return answerInvitation(v.id, "decline"); }, yesLabel: "Join", noLabel: "Not now" });
  // Asks to join a team, answered in place (teamwork sketches B6): for core members, and for leads of that team.
  const seen = new Set<string>();
  const teamAsks = (t: R, groupName: string) => {
    for (const p of ((t.participant ?? []) as any[]).filter((x) => x.status === "requested")) {
      const key = `tj-${t.id}-${p.person.reference}`; if (seen.has(key)) continue; seen.add(key);
      const answer = (yes: boolean) => async () => { const fresh = await bix.get("Team", t.id); const rest = ((fresh.participant ?? []) as any[]).filter((x) => !(x.person.reference === p.person.reference && x.status === "requested"));
        return bix.commit(bix.next(fresh, { participant: yes ? [...rest, { ...p, status: "active", role: p.role ?? "volunteer" }] : rest })); };
      items.push({ id: key, kind: "team-join", title: `Wants to join ${t.name}`, meta: groupName, who: { reference: p.person.reference } as never, go: `/team/${t.id}`, at: at(t),
        yes: answer(true), no: answer(false), yesLabel: "Accept", noLabel: "Decline" });
    }
  };
  const ledTeams = (await bix.search("Team", { participant: me }).catch(() => [] as R[])).filter((t) => ((t.participant ?? []) as any[]).some((x) => x.person.reference === me && x.role === "lead" && x.status === "active"));
  for (const t of ledTeams) teamAsks(t, groups.find((g) => `Organization/${g.org.id}` === t.organization?.reference)?.org.name ?? "Your team");
  // Groups you run.
  for (const g of groups.filter((x) => ["officer", "core-member"].includes(x.role.code?.code))) {
    const org = `Organization/${g.org.id}`;
    const [roles, projects] = await Promise.all([bix.search("Role", { organization: org }).catch(() => [] as R[]), bix.search("Initiative", { organization: org }).catch(() => [] as R[])]);
    const live = projects.filter((p) => p.status !== "completed" && p.status !== "cancelled");
    for (const r of roles.filter((x) => x.status === "requested"))
      items.push({ id: `join-${r.id}`, kind: "join", title: "Wants to join", meta: g.org.name, who: { reference: r.person.reference } as never, go: `/org/${g.org.id}/people`, at: at(r),
        yes: () => bix.commit(bix.next(r, { status: "active", period: { start: now() } })), yesLabel: "Accept",
        no: () => bix.commit(bix.next(r, { status: "ended", period: { start: now(), end: now() } })), noLabel: "Decline" });
    const [teams, tasks, needs] = await Promise.all([
      Promise.all(live.map((p) => bix.search("Team", { initiative: `Initiative/${p.id}` }))).then((x) => x.flat()),
      Promise.all(live.map((p) => bix.search("Task", { partOf: `Initiative/${p.id}` }))).then((x) => x.flat()),
      Promise.all(live.map((p) => bix.search("Need", { initiative: `Initiative/${p.id}` }))).then((x) => x.flat()),
    ]);
    for (const t of teams) teamAsks(t, g.org.name);
    for (const x of tasks.filter((t) => t.status === "requested" && t.owner?.reference !== me))
      items.push({ id: `un-${x.id}`, kind: "unanswered", title: x.title, meta: "Asked, no answer yet", who: { reference: x.owner?.reference } as never, go: `/task/${x.id}`, at: at(x) });
    // Asked to do a lead's-call task (BIX Task.taking ask): Give it, here.
    for (const x of tasks.filter((t) => t.status === "ready")) for (const p of ((x.participant ?? []) as any[]).filter((y) => y.status === "requested" && !y.replaces && y.person.reference !== me))
      items.push({ id: `atd-${x.id}-${p.person.reference}`, kind: "asked-to-do", title: `Asked to do “${x.title}”`, meta: g.org.name, who: { reference: p.person.reference } as never, go: `/task/${x.id}`, at: at(x), yesLabel: "Give it",
        yes: async () => { const f = await bix.get("Task", x.id); return bix.commit(bix.next(f, { status: "accepted", owner: { reference: p.person.reference }, participant: ((f.participant ?? []) as any[]).filter((y) => y.status !== "requested" || y.person.reference === p.person.reference).map((y) => (y.person.reference === p.person.reference ? { ...y, status: "active" } : y)) })); } });
    const ideas = tasks.filter((t) => t.status === "draft");
    if (ideas.length) items.push({ id: `ideas-${g.org.id}`, kind: "idea", title: `${ideas.length} idea${ideas.length === 1 ? "" : "s"} from the team`, meta: g.org.name, go: "/ideas", at: ideas.map(at).sort().at(-1) ?? "" });
    const offers = (await Promise.all(needs.slice(0, 12).map((n) => bix.search("Offer", { matchedTo: `Need/${n.id}` }).catch(() => [] as R[])))).flat();
    for (const o of offers.filter((x) => x.status === "available"))
      items.push({ id: `offer-${o.id}`, kind: "offer", title: `Offer: ${o.description ?? o.category?.display ?? "help"}`, meta: g.org.name, go: (() => { const m = Array.isArray(o.matchedTo) ? o.matchedTo[0] : o.matchedTo; return m?.reference ? `/need/${m.reference.split("/")[1]}` : undefined; })(), at: at(o) });
    const reports = await bix.search("Report", { owedBy: org }).catch(() => [] as R[]);
    for (const p of projects.filter((p) => p.status !== "cancelled" && p.period?.start && Date.parse(p.period.start) < Date.now() - 12 * 3600000 && Date.now() - Date.parse(p.period.start) < 14 * 86400000
      && !reports.some((r) => (r.scope?.initiative ?? []).some((x: any) => x.reference === `Initiative/${p.id}`))))
      items.push({ id: `rep-${p.id}`, kind: "report", title: `Report for ${p.title}`, meta: "Ready to check and send", go: `/project/${p.id}/report`, at: p.period.start });
  }
  // Faces for people-centred items.
  const refs = items.map((x) => (x.who as any)?.reference).filter(Boolean);
  const ppl = await peopleFor(refs, 30);
  for (const x of items) { const r = (x.who as any)?.reference; if (r) { x.who = ppl[r]; if (x.kind === "join" || x.kind === "team-join") x.title = `${personName(ppl[r])} ${x.title.charAt(0).toLowerCase()}${x.title.slice(1)}`; if (x.kind === "unanswered") x.meta = `${personName(ppl[r])} hasn't answered`; if (x.kind === "asked-to-do") x.title = `${personName(ppl[r])} asked to do ${x.title.replace(/^Asked to do /, "")}`; } }
  items.sort((a, b) => b.at.localeCompare(a.at));
  count = items.length; listeners.forEach((l) => l(count));
  return items;
}
