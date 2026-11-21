import { closeOut, declineSuggestion, evidence } from "@bayanihan/core/memory";
import type { Here } from "@/ui/Bayani";
import { assisted, judge, modelDownloaded, modelSupported, SHOW_AT, type Judgment } from "./bayani";
import { bix, newId, type R } from "./bix";
import { short } from "./dates";
import { addFromMemory, declineFromMemory, packProject, practicesFor, type Memory } from "./memory";

/*
 * Bayani as a copilot (Don, 2026-11-15). Bayani-1 was trained on BIX records, not on text, so it does not write
 * open answers. It reads the records on the screen (a group, a project, a step), works out what needs doing, and
 * offers MOVES: each one is a recommendation the person can read, open, or run. Several can be run together, with
 * one Undo. A person decides; every move that changes something is recorded as suggested by Bayani (Provenance).
 *
 * Where the judgment comes from:
 *  - rules over the records, one set for every screen (the project page's plan check, the Bayani sheet):
 *      needs you now: late · nobody on a step due within 7 days · asked with no answer for 2+ days · a team with work
 *        due within 14 days and no lead · usually done by now (project memory)
 *      to plan: out of order (→ "Make it wait": adds dependsOn, BIX "This must happen after that") · a linked step with
 *        no date (→ its usual date) · usually needed, not in the plan (→ Add, dated on its usual day)
 *    Runnable rule moves are recorded with their rule (Provenance `rule: memory:…`); "Not now" is a declined
 *    ChangeProposal for that step and question, so it isn't shown again (BIX "Suggestions and their answers").
 *  - the group's project memory (lib/memory.ts), which Bayani-1 sharpens: it drops a "usually needed" step when an
 *    existing step, worded differently, is the same step (a yes/no judgment held to its answers by a grammar).
 * Nothing here calls a text model. The rules' moves work on every phone and the web.
 *
 * Bayani-1's own moves (`noticed`, below), on Android and iPhone with the model downloaded, for a lead, when the group
 * turned on the `memory` area (rule 22). Each uses one of its trained questions, in the training format:
 *  - which-practice: "This step is your usual step P" → link it (Task.practice), so its timing and lessons show and the
 *    rules can check it. Rule 24: a model never sets the link; a lead accepting it does, recorded as suggested by Bayani.
 *  - which-team: a step with no team → "Give it to Logistics".
 *  - at close-out (a completed project), for steps with no usual step: one-off? then general-title → "Keep 'Book the
 *    venue' for next time" (a new Practice, linked). A one-off is left alone.
 * Accept commits the change with Provenance naming Bayani-1, its question and confidence; Not now commits a declined
 * ChangeProposal (BIX "Suggestions and their answers"). Answers under SHOW_AT aren't shown.
 */
export type MoveTag = "late" | "people" | "needed" | "check" | "bayani";
export type Move = {
  id: string;
  tag: MoveTag;
  /** "now": needs someone now (late, people, done by now). "plan": shapes the plan (order, dates, missing steps). */
  group?: "now" | "plan";
  /** Higher first. Late work, then nobody on a step soon, then order, then the usual steps. */
  rank: number;
  icon: "check" | "book" | "clock" | "pending" | "flag" | "pen" | "users";
  title: string;
  why: string;
  /** Opens the page where the person acts (a step, a project). */
  go?: string;
  /** Does it now (with the person's text, when `edit` is set). Returns how to take it back. Only leads get these. */
  run?: (text?: string) => Promise<() => Promise<void>>;
  /** A suggested text the person may change before running it (a general name); a change is recorded as edited. */
  edit?: string;
  runLabel?: string;
  /** Bayani-1's own judgment (shown on the Bayani surface, with how sure it is); rules' moves have none. */
  by?: "bayani";
  confidence?: number;
  /** "Not now": recorded as a declined ChangeProposal, so it isn't suggested again for this record. */
  decline?: () => Promise<void>;
};

const DAY = 86_400_000;
const live = (xs: R[]) => xs.filter((k) => k.status !== "draft" && k.status !== "cancelled");
const people = (k: R) => ((k.participant ?? []) as { status: string }[]).filter((x) => x.status === "active").length;
const left = (iso: string, now: number) => Math.round((Date.parse(iso) - now) / DAY);

/** Late or unstaffed steps among `tasks`, and asks with no answer. `via` names a step's team. */
function stepMoves(tasks: R[], now: number, via?: (k: R) => string | undefined): Move[] {
  const out: Move[] = [];
  for (const k of live(tasks)) {
    if (k.status === "completed") continue;
    const at = via?.(k);
    // Asked a named person (BIX `requested`) who hasn't answered in 2 days: worth a nudge, or asking someone else.
    const since = k.status === "requested" ? Math.floor((now - Date.parse((k.meta as { lastUpdated?: string } | undefined)?.lastUpdated ?? "")) / DAY) : NaN;
    if (since >= 2) out.push({ id: `asked-${k.id}`, tag: "people", group: "now", rank: 74, icon: "users", title: `No answer yet on “${k.title}”`, why: `Asked ${since} days ago${at ? ` · ${at}` : ""}. Nudge them, or ask someone else`, go: `/task/${k.id}` });
    if (!k.due) continue;
    const d = left(k.due, now);
    if (d < 0) out.push({ id: `late-${k.id}`, tag: "late", group: "now", rank: 100 + Math.min(-d, 30), icon: "clock", title: `“${k.title}” is late`, why: `Was due ${short(k.due)}, ${-d} day${-d === 1 ? "" : "s"} ago${at ? ` · ${at}` : ""}`, go: `/task/${k.id}` });
    else if (d <= 7 && people(k) === 0 && k.status === "ready") out.push({ id: `nobody-${k.id}`, tag: "people", group: "now", rank: 80 - d, icon: "users", title: `Nobody is on “${k.title}” yet`, why: `${d === 0 ? "Due today" : `Due in ${d} day${d === 1 ? "" : "s"}`} (${short(k.due)})${at ? ` · ${at}` : ""}`, go: `/task/${k.id}` });
  }
  return out;
}

/** Has this suggestion been answered "Not now" for this record (a declined ChangeProposal with its question)? */
const declinedFor = (declined: R[] | undefined, target: string, question: string) =>
  (declined ?? []).some((p) => p.status === "declined" && p.target?.reference === target && ext(p, "bayanihan:question") === question);
/** "Not now" on a step, for a rule's suggestion: a declined ChangeProposal in the memory area, recorded with the rule. */
const declineRule = (project: R, t: R, question: string, change: { op: "add" | "replace"; path: string; value: unknown }[], reason: string) => async () => {
  const org = project.organization?.reference;
  if (!org) return;
  await bix.commitAssisted([declineSuggestion({ id: newId(), target: { reference: `Task/${t.id}` }, basedOn: t.meta.version, organization: { reference: org }, question, change, reason }) as R], { type: "rule", rule: `memory:${question}` });
};

/** A team with work due within 14 days and no lead: someone has to run it. `of` names its project, across a group. */
function leadless(teams: R[], tasks: R[], now: number, of?: (tm: R) => string | undefined): Move[] {
  const out: Move[] = [];
  for (const tm of teams) {
    const hasLead = ((tm.participant ?? []) as { role?: string; status: string }[]).some((p) => p.role === "lead" && p.status === "active");
    const due = live(tasks).filter((k) => k.team?.reference === `Team/${tm.id}` && k.status !== "completed" && k.due && left(k.due, now) <= 14);
    const at = of?.(tm);
    if (!hasLead && due.length) out.push({ id: `lead-${tm.id}`, tag: "people", group: "now", rank: 72, icon: "users", title: `${tm.name} has no lead`, why: `${due.length} step${due.length === 1 ? "" : "s"} due in the next 2 weeks${at ? ` · ${at}` : ""}. Ask someone to lead it`, go: `/team/${tm.id}` });
  }
  return out;
}

/*
 * A group, for whoever runs it (Don, 2026-11-16: "more helpful for coordinators running an organization"). The same
 * rules as a project, across every project on the go, so one look says what needs the coordinator today; then what
 * waits on an officer: people asking to join, an event with no report sent, an event that's over and not wrapped up,
 * what a project is still short of, a project with no steps. All from records the screen already loaded.
 */
function groupMoves(here: Extract<Here, { kind: "group" }>, now: number): Move[] {
  const out: Move[] = [];
  const on = here.projects.filter((p) => p.status === "active");
  const titleOf = (ref?: string) => on.find((p) => `Initiative/${p.id}` === ref)?.title as string | undefined;
  const teams = here.teams ?? [], tasks = here.tasks ?? [];
  const teamOf = (k: R) => teams.find((x) => `Team/${x.id}` === k.team?.reference);
  const mine = tasks.filter((k) => titleOf(k.partOf?.reference));
  out.push(...stepMoves(mine, now, (k) => [titleOf(k.partOf?.reference), teamOf(k)?.name].filter(Boolean).join(" · ")));
  out.push(...leadless(teams, mine, now, (tm) => titleOf(tm.initiative?.reference)));
  for (const p of on) {
    const start = p.period?.start ? left(p.period.start, now) : null;
    const steps = live(mine).filter((k) => k.partOf?.reference === `Initiative/${p.id}`);
    const open = steps.filter((k) => k.status !== "completed").length;
    if (start !== null && start >= 0 && start <= 7) out.push({ id: `soon-${p.id}`, tag: "check", group: "now", rank: 70 - start, icon: "flag", title: `“${p.title}” starts ${start === 0 ? "today" : `in ${start} day${start === 1 ? "" : "s"}`}`,
      why: here.tasks ? (open ? `${open} step${open === 1 ? "" : "s"} still open` : "Every step is done") : "Open it to see what's still undone", go: `/project/${p.id}` });
    // Over for two days or more and still open: wrap it up, so its report, credits and memory are kept.
    const end = p.period?.end ?? p.period?.start;
    if (end && left(end, now) <= -2 && !(here.unreported ?? []).some((x) => x.id === p.id)) out.push({ id: `wrap-${p.id}`, tag: "check", group: "now", rank: 64, icon: "flag", title: `Wrap up “${p.title}”`, why: `It was on ${short(end)}. Thank everyone, send the report, and keep what worked for next time`, go: `/project/${p.id}/wrap` });
    if (here.tasks && !steps.length) out.push({ id: `empty-${p.id}`, tag: "check", group: "plan", rank: 50, icon: "pen", title: `“${p.title}” has no steps yet`, why: "Add the work, so people can take it", go: `/project/${p.id}` });
    else if (!end) out.push({ id: `undated-${p.id}`, tag: "check", group: "plan", rank: 38, icon: "clock", title: `Give “${p.title}” a date`, why: "With a date, Bayani can say what's due and what's late", go: `/project/${p.id}` });
  }
  if (here.officer && here.requests) out.push({ id: "joins", tag: "people", group: "now", rank: 78, icon: "users", title: `${here.requests} ${here.requests === 1 ? "person is" : "people are"} waiting to join`, why: "Accept or decline them, so they can start helping", go: `/org/${here.org.id}/people` });
  for (const p of here.unreported ?? []) out.push({ id: `report-${p.id}`, tag: "check", group: "now", rank: 66, icon: "pen", title: `Send the report for “${p.title}”`, why: "Written from what your teams recorded. Check it and send", go: `/project/${p.id}/report` });
  for (const n of here.needs ?? []) {
    if (["met", "cancelled", "withdrawn"].includes(String(n.status))) continue;
    const d = n.neededBy ? left(n.neededBy, now) : null;
    if (n.priority !== "urgent" && (d === null || d > 7)) continue;
    const want = n.quantity?.value ?? 0, got = n.received?.value ?? 0, at = titleOf(n.initiative?.reference);
    out.push({ id: `need-${n.id}`, tag: "people", group: "now", rank: n.priority === "urgent" ? 76 : 68, icon: "users", title: `Still short of ${String(n.category?.display ?? "something").toLowerCase()}`,
      why: [want ? `${got} of ${want} ${n.quantity?.unit ?? ""}`.trim() : null, d !== null ? (d < 0 ? `needed by ${short(n.neededBy)}, already past` : `needed by ${short(n.neededBy)}`) : "urgent", at].filter(Boolean).join(" · "), go: `/need/${n.id}` });
  }
  if (here.officer && !assistOn(here.org, "memory")) out.push({ id: "memory-off", tag: "needed", group: "plan", rank: 20, icon: "book", title: "Turn on project memory", why: "Then Bayani says what projects like yours usually need, and what's usually done by now", go: `/org/${here.org.id}` });
  return out;
}

export function movesFor(here: Here | undefined, mem: Memory | null): Move[] {
  if (!here) return [];
  const now = Date.now();
  const moves: Move[] = [];
  if (here.kind === "project") {
    const { project, lead } = here;
    const team = (k: R) => here.teams.find((x) => `Team/${x.id}` === k.team?.reference)?.name as string | undefined;
    const planning = !["completed", "cancelled"].includes(String(project.status));
    if (!planning) return [];
    moves.push(...stepMoves(here.tasks, now, team));
    moves.push(...leadless(here.teams, here.tasks, now));
    const dec = mem?.declined;
    for (const x of mem?.doneByNow ?? []) {
      // Already flagged as late: one item per step is enough.
      if (moves.some((m) => m.id === `late-${x.task.id}`) || declinedFor(dec, `Task/${x.task.id}`, "usually-done-by-now")) continue;
      const nobody = people(x.task) === 0;
      moves.push({ id: `byNow-${x.task.id}`, tag: "check", group: "now", rank: nobody ? 70 : 58, icon: "clock", title: `“${x.task.title}” is usually done by now`, why: `Your group usually has it done ${x.why.replace(/^usually done /, "")}${nobody ? " · nobody is on it" : ""}`, go: `/task/${x.task.id}`,
        ...(lead ? { decline: declineRule(project, x.task, "usually-done-by-now", [], "Usually done by now") } : {}) });
    }
    for (const x of mem?.outOfOrder ?? []) {
      if (declinedFor(dec, `Task/${x.task.id}`, "out-of-order")) continue;
      const wait = { reference: `Task/${x.waitOn.id}` };
      const m: Move = { id: `order-${x.task.id}-${x.waitOn.id}`, tag: "check", group: "plan", rank: 60, icon: "pending", title: `“${x.task.title}” usually comes after “${x.waitOn.title}”`, why: "Make it wait, so nobody starts it first", go: `/task/${x.task.id}` };
      if (lead) {
        m.runLabel = "Make it wait";
        m.run = async () => { const [made] = await bix.commitAssisted([bix.next(x.task, { dependsOn: [...(x.task.dependsOn ?? []), wait] })], { type: "rule", rule: "memory:out-of-order" }); return async () => { await bix.commit(bix.next(made ?? x.task, { dependsOn: x.task.dependsOn })); }; };
        m.decline = declineRule(project, x.task, "out-of-order", [{ op: "add", path: "/dependsOn/-", value: wait }], `Usually after "${x.waitOn.title}"`);
      }
      moves.push(m);
    }
    for (const x of mem?.timing ?? []) {
      if (declinedFor(dec, `Task/${x.task.id}`, "timing")) continue;
      const due = new Date(x.by).toISOString(), days = left(due, now);
      const m: Move = { id: `date-${x.task.id}`, tag: "check", group: "plan", rank: days <= 14 ? 56 : 44, icon: "clock", title: `Give “${x.task.title}” a date`, why: `Your group usually does it by ${short(due)}, in ${days} day${days === 1 ? "" : "s"}`, go: `/task/${x.task.id}` };
      if (lead) {
        m.runLabel = `Due ${short(due)}`;
        m.run = async () => { const [made] = await bix.commitAssisted([bix.next(x.task, { due })], { type: "rule", rule: "memory:timing" }); return async () => { await bix.commit(bix.next(made ?? x.task, { due: undefined })); }; };
        m.decline = declineRule(project, x.task, "timing", [{ op: "add", path: "/due", value: due }], `Usually by ${short(due)}`);
      }
      moves.push(m);
    }
    for (const n of mem?.needed ?? []) {
      // Rules found it; when Bayani-1 also judged it belongs in this project, it's Bayani's suggestion, with how sure.
      const j = n.judgment;
      const soon = n.by ? left(new Date(n.by).toISOString(), now) : null;
      const when = n.by ? (soon! < 0 ? `usually done by ${short(new Date(n.by).toISOString())}, already past` : `usually done by ${short(new Date(n.by).toISOString())}`) : null;
      const m: Move = { id: `need-${n.practice.id}`, tag: "needed", group: soon !== null && soon <= 14 ? "now" : "plan", rank: soon !== null && soon <= 14 ? 62 : 40, icon: "book", title: `Add “${n.practice.title}”`,
        why: [n.why, when].filter(Boolean).join(" · ") + (j ? `${pct(j)} it belongs` : ""), ...(j ? { by: "bayani" as const, confidence: j.confidence } : {}) };
      if (lead) {
        m.runLabel = "Add";
        m.run = async () => { const { task } = await addFromMemory(project, here.teams, n); return async () => { await bix.commit(bix.next(task, { status: "cancelled" })); }; };
        m.decline = () => declineFromMemory(project, n);
      }
      moves.push(m);
    }
  } else if (here.kind === "task") {
    if (["completed", "cancelled"].includes(String(here.project?.status))) return [];
    moves.push(...stepMoves([here.task], now).map((m) => ({ ...m, go: undefined })));
    // Its subtasks (smaller steps given to someone): late, nobody on one due soon, asked with no answer.
    moves.push(...stepMoves(here.subs ?? [], now).map((m) => ({ ...m, rank: m.rank - 5 })));
    moves.push(...stepMoves(here.siblings.filter((k) => k.id !== here.task.id), now).map((m) => ({ ...m, rank: m.rank - 20 })));
  } else if (here.kind === "team") {
    // A team's own steps (Don, 2026-11-21: Ask Bayani on a team screen answered with Dasig's facts, not the team's work).
    if (["completed", "cancelled"].includes(String(here.project?.status))) return [];
    moves.push(...stepMoves(here.tasks, now), ...leadless([here.team], here.tasks, now));
  } else moves.push(...groupMoves(here, now));
  return moves.sort((a, b) => b.rank - a.rank);
}

/** What the person asked, as one of the things the copilot knows. Anything else is a question for the facts library. */
export type Intent = "week" | "late" | "needed" | "people";
export function intentOf(q: string): Intent | null {
  const s = q.toLowerCase();
  if (/\b(late|risk|behind|overdue|stuck|slip|worr)/.test(s)) return "late";
  // "Who's still needed?" is about people, not about a missing step: who-questions are read first.
  if (/\b(who|nobody|no one|people|volunteer|staff|help)\b/.test(s)) return "people";
  if (/\b(forget|forgot|missing|usual|should we have|left out)|\b(need|needed)\b/.test(s)) return "needed";
  if (/\b(week|today|soon|next|first|priorit|focus|do now|attention|what should)/.test(s)) return "week";
  return null;
}
/** The chips under the field. With an intent: that list of moves. Without: answered like a typed question (lib/bayaniAnswer.ts). */
export const STARTERS: Record<string, { q: string; intent?: Intent }[]> = {
  project: [{ q: "What's pending?" }, { q: "What's late or at risk?", intent: "late" }, { q: "Suggest steps to add" }, { q: "Who's still needed?", intent: "people" }],
  team: [{ q: "What's pending?" }, { q: "Suggest steps for this team" }, { q: "Who's still needed?", intent: "people" }],
  task: [{ q: "What needs attention?", intent: "week" }, { q: "What's pending?" }],
  group: [{ q: "What needs me today?", intent: "week" }, { q: "What's pending?" }, { q: "What's late across our projects?", intent: "late" }, { q: "Who's still needed?", intent: "people" }],
};
export function pick(moves: Move[], intent: Intent): Move[] {
  const tags: Record<Intent, MoveTag[] | null> = { week: null, late: ["late", "people"], needed: ["needed", "check", "bayani"], people: ["people"] };
  const t = tags[intent];
  return (t ? moves.filter((m) => t.includes(m.tag)) : moves);
}
export const NOTHING: Record<Intent, string> = {
  week: "Nothing stands out. No step is late, none is waiting for people soon, and no usual step is missing.",
  late: "Nothing is late, and every step due in the next 7 days has someone on it.",
  needed: "Nothing usual is missing, from what your group's past projects show.",
  people: "Every step due in the next 7 days has someone on it.",
};

/** Run several moves together. Stops at the first that fails; what was done can be undone as one. */
export async function runTogether(moves: Move[], texts: Record<string, string> = {}): Promise<{ done: number; undo: () => Promise<void>; error?: string }> {
  const undos: (() => Promise<void>)[] = [];
  let error: string | undefined;
  for (const m of moves) {
    if (!m.run) continue;
    try { undos.push(await m.run(texts[m.id])); } catch (e) { error = e instanceof Error ? e.message : String(e); break; }
  }
  return { done: undos.length, error, undo: async () => { for (const u of undos.reverse()) await u(); } };
}

/** Is this assistance area on for the group (BIX Organization.assist[], rule 22)? */
const assistOn = (org: R, area: string) => ((org.assist ?? []) as { system?: string; code?: string }[]).some((a) => (!a.system || a.system === "bayanihan:assist-area") && a.code === area);
const pct = (j: Judgment) => (Number.isFinite(j.confidence) ? ` · Bayani is ${Math.round(j.confidence * 100)}% sure` : "");
const ext = (p: R, url: string) => ((p.extension ?? []) as { url: string; value?: unknown }[]).find((e) => e.url === url)?.value;

/**
 * Bayani-1's moves for this screen, found one at a time (each call a second or two on a phone): `onMove` is called as
 * each is found, `onProgress` with how many questions are left. At most `budget` questions per opening.
 * Returns, when Bayani-1 had nothing to show, why in plain words (device pass v0.19: with nothing shown, it looked
 * broken). Null when the model isn't on this phone (the sheet says that already).
 */
export async function noticed(here: Here | undefined, o: { onMove: (m: Move) => void; onProgress?: (left: number) => void; budget?: number; cancelled?: () => boolean }): Promise<string | null> {
  if (!here || !modelSupported || !(await modelDownloaded().catch(() => false))) return null;
  if (here.kind === "team") return null;
  if (here.kind === "group") return "Across the group, Bayani works from your projects' records, by rules. Open a project or a step and Bayani-1 checks its steps too.";
  const project = here.kind === "project" ? here.project : here.project;
  const org = here.kind === "project" ? here.org : here.org;
  const lead = here.kind === "project" ? here.lead : !!here.lead;
  if (!project || !org) return "Bayani-1 checks the steps of a group's projects. This step isn't in one.";
  if (!lead) return "Bayani-1's suggestions go to the project's leads, who can act on them.";
  if (!assistOn(org, "memory")) return `Bayani-1 works from ${org.name}'s project memory, which is off. An officer can turn it on, on the group's page.`;
  const orgRef = `Organization/${org.id}`;
  const [practices, teams, tasks, proposals] = await Promise.all([
    practicesFor(project),
    here.kind === "project" ? Promise.resolve(here.teams) : bix.search("Team", { initiative: `Initiative/${project.id}` }).catch(() => [] as R[]),
    here.kind === "project" ? Promise.resolve(here.tasks) : Promise.resolve([here.task, ...here.siblings]),
    bix.search("ChangeProposal", { organization: orgRef }).catch(() => [] as R[]),
  ]);
  const records: R[] = [packProject(project), ...tasks, ...teams, ...practices];
  const declined = (t: R, question: string) => proposals.some((p) => p.status === "declined" && p.target?.reference === `Task/${t.id}` && ext(p, "bayanihan:question") === question);
  const decline = (t: R, j: Judgment, change: { op: "replace" | "add"; path: string; value: unknown }[], reason: string, practice?: string) => async () => {
    await bix.commitAssisted([declineSuggestion({ id: newId(), target: { reference: `Task/${t.id}` }, basedOn: t.meta.version, organization: { reference: orgRef }, question: j.question, change, reason, ...(practice ? { practice: { reference: practice } } : {}) }) as R], assisted(j));
  };
  // A task's own subtasks are in scope too; at close-out, every step's subtasks (so a kept smaller step remembers its parent).
  const nested = here.kind === "task" ? (here.subs ?? []) : project.status === "completed"
    ? (await Promise.all(tasks.slice(0, 40).map((t) => bix.search("Task", { partOf: `Task/${t.id}` }).catch(() => [] as R[])))).flat() : [];
  records.push(...nested.filter((x) => !records.some((r) => r.id === x.id)));
  const scope = here.kind === "task" ? [here.task, ...nested] : [...tasks, ...nested];
  const live = scope.filter((t) => t.status !== "cancelled" && t.status !== "draft");
  const closing = project.status === "completed";
  const unlinked = closing ? closeOut(project, live, practices).unmatched : live.filter((t) => !t.practice);
  const noTeam = closing ? [] : live.filter((t) => !t.team && t.status !== "completed");
  const jobs: (() => Promise<Move | null>)[] = [];

  for (const t of unlinked) jobs.push(async () => {
    if (practices.length && !declined(t, "which-practice")) {
      const j = await judge({ kind: "which-practice", step: `Task/${t.id}` }, records, "");
      const p = j?.kind === "reference" && j.value ? practices.find((x) => `Practice/${x.id}` === j.value) : null;
      if (j && p && j.confidence >= SHOW_AT) {
        const pref = { reference: `Practice/${p.id}` };
        return { id: `link-${t.id}`, tag: "bayani", by: "bayani", confidence: j.confidence, rank: 45, icon: "book", title: `“${t.title}” is your usual step “${p.title}”`,
          why: `${evidence(p)}${pct(j)}`, runLabel: "Link",
          run: async () => { const [made] = await bix.commitAssisted([bix.next(t, { practice: pref })], assisted(j)); return async () => { await bix.commit(bix.next(made ?? t, { practice: undefined })); }; },
          decline: decline(t, j, [{ op: "replace", path: "/practice", value: pref }], `Bayani matched it to the usual step "${p.title}"`, pref.reference) };
      }
    }
    if (!closing || declined(t, "general-title")) return null;
    // Close-out: worth keeping for next time? Only then a general name for it.
    const once = await judge({ kind: "one-off", step: `Task/${t.id}` }, records, "");
    if (!once || once.kind !== "yes-no" || once.value || once.confidence < SHOW_AT) return null;
    const name = await judge({ kind: "general-title", step: `Task/${t.id}` }, records, "");
    if (!name || name.kind !== "text") return null;
    const team = teams.find((x) => `Team/${x.id}` === t.team?.reference);
    return { id: `keep-${t.id}`, tag: "bayani", by: "bayani", confidence: once.confidence, rank: 35, icon: "book", title: `Keep “${t.title}” for next time`,
      why: `Not a one-off${pct(once)}. Bayani's general name for it, which you can change:`, runLabel: "Keep", edit: name.value,
      run: async (text) => {
        const title = (text ?? name.value).trim() || name.value;
        // A kept subtask is a smaller step of its parent's usual step (Practice.partOf), so next time the parent's page
        // can say what it is usually broken into.
        const up = records.find((r) => r.resourceType === "Task" && `Task/${r.id}` === t.partOf?.reference);
        const practice = bix.create("Practice", { title, organization: { reference: orgRef }, status: "active", source: "own", appliesTo: packProject(project).category, ...(team ? { team: team.name } : {}),
          ...(up?.practice ? { partOf: up.practice } : {}) });
        const [made, step] = await bix.commitAssisted([practice, bix.next(t, { practice: { reference: `Practice/${practice.id}` } })], assisted(name, title !== name.value));
        return async () => { await bix.commit(bix.next(step ?? t, { practice: undefined }), bix.next(made ?? practice, { status: "retired" })); };
      },
      decline: decline(t, name, [{ op: "add", path: "/practice", value: { title: name.value } }], `Bayani suggested keeping it as "${name.value}"`) };
  });

  for (const t of noTeam) jobs.push(async () => {
    if (!teams.length || declined(t, "which-team")) return null;
    const j = await judge({ kind: "which-team", step: `Task/${t.id}` }, records, "");
    const team = j?.kind === "reference" && j.value ? teams.find((x) => `Team/${x.id}` === j.value) : null;
    if (!j || !team || j.confidence < SHOW_AT) return null;
    const tref = { reference: `Team/${team.id}` };
    const ownerIsPerson = String(t.owner?.reference ?? "").startsWith("Person/");
    return { id: `team-${t.id}`, tag: "bayani", by: "bayani", confidence: j.confidence, rank: 55, icon: "users", title: `Give “${t.title}” to ${team.name}`,
      why: `It has no team yet${pct(j)}`, runLabel: "Give",
      run: async () => {
        const [made] = await bix.commitAssisted([bix.next(t, { team: tref, ...(ownerIsPerson ? {} : { owner: tref, audience: "team" }) })], assisted(j));
        return async () => { await bix.commit(bix.next(made ?? t, { team: t.team, owner: t.owner, audience: t.audience })); };
      },
      decline: decline(t, j, [{ op: "replace", path: "/team", value: tref }], `Bayani suggested ${team.name}`) };
  });

  if (!jobs.length) return closing
    ? "Every step is already one of your usual steps. Nothing to keep."
    : "Every step here is linked to a usual step and has a team. Nothing for Bayani-1 to check.";
  const budget = o.budget ?? 10;
  let left = Math.min(jobs.length, budget), shown = 0;
  o.onProgress?.(left);
  for (const job of jobs.slice(0, budget)) {
    if (o.cancelled?.()) return null;
    const m = await job().catch(() => null);
    o.onProgress?.(--left);
    if (m && !o.cancelled?.()) { o.onMove(m); shown++; }
  }
  const n = Math.min(jobs.length, budget);
  return shown ? null : `Bayani-1 checked ${n} step${n === 1 ? "" : "s"} and wasn't sure enough to suggest anything.`;
}
