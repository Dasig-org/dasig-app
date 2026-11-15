import { declineSuggestion, outOfOrder, usuallyDoneByNow, usuallyNeeded, wasDeclined } from "@bayanihan/core/memory";
import { bix, newId, type R } from "./bix";
import STARTERS from "@/data/starter-practices.json";
import { assisted, closestTask, judge, modelDownloaded, SHOW_AT, type Judgment } from "./bayani";

/*
 * Project memory, rules only (Bayani v0 Phase 1; design/bayani-app-sketches.html 7; BIX "Project memory: Practices"
 * and "Suggestions and their answers"). Works on every phone and the PWA; Bayani-1 sharpens it later (Phase 3).
 * - The group's own Practices for this kind of project, or Dasig's starter Practices when it has none (read-only).
 * - Usually needed: steps in two thirds or more of past projects (D29), or starters; not already in the project,
 *   not declined before for this project.
 * - Worth a look (usually done by now) and out of order: only with the group's own Practices (they carry figures).
 */
// The app's event kinds → the starter Practices' kinds (bayani/data/playbooks.ts).
// Only real matches: a workshop isn't a conference, and outreach or relief isn't a feeding program (no starters for those yet).
const KIND_ALIAS: Record<string, string> = { run: "fun-run", cleanup: "coastal-cleanup" };
export const MEMORY_RULE = "memory:usually-needed";

const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\b(the|a|an|for|of|to)\b/g, "").replace(/\s+/g, " ").trim();
/** The project with its kind also under the starter code, so either set of Practices applies. */
const withAliases = (p: R): R => {
  const cats = (p.category ?? []) as { system?: string; code: string }[];
  // Core compares system and code; projects use bayanihan:event-kind, starter Practices bayanihan:initiative-category.
  const extra = cats.flatMap((c) => [c.code, KIND_ALIAS[c.code]]).filter(Boolean).map((code) => ({ system: "bayanihan:initiative-category", code: code! }));
  return { ...p, category: [...cats, ...extra] };
};

/** The project as Bayani-1 was trained to read it: its kinds under the starter codes ("fun run", not "run"). */
export const packProject = (p: R): R => {
  const codes = [...new Set(((p.category ?? []) as { code: string }[]).map((c) => KIND_ALIAS[c.code] ?? c.code))];
  return { ...p, category: codes.map((code) => ({ system: "bayanihan:initiative-category", code })) };
};
/** The group's own active Practices for this kind of project (rule 26: the server returns only what this person may see). */
export async function practicesFor(project: R): Promise<R[]> {
  const org = project.organization?.reference;
  if (!org) return [];
  const p = withAliases(project);
  return (await bix.search("Practice", { organization: org }).catch(() => [] as R[]))
    .filter((x) => x.status === "active" && ((x.appliesTo ?? []) as { code: string }[]).some((a) => (p.category as { code: string }[]).some((c) => c.code === a.code)));
}

/** The day a Practice is usually done in this project: its start plus the median day (rule figures, BIX rule 23). */
export function usualDate(project: R, practice: R): number | null {
  const day = (practice.observed as { dayFromStart?: { median?: number } } | undefined)?.dayFromStart?.median;
  const start = project.period?.start ? Date.parse(project.period.start) : NaN;
  return Number.isFinite(start) && typeof day === "number" ? start + day * 86_400_000 : null;
}

export type Memory = {
  /** Usual steps not in the plan, soonest usual day first. `by`: when it's usually done in this project (ms). */
  needed: { practice: R; why: string; starter: boolean; judgment?: Judgment; by?: number | null }[];
  /** Linked steps with no date, whose usual day is still ahead: the rule can date them. */
  timing: { task: R; practice: R; by: number }[];
  /** "Not now" answers in this group (declined ChangeProposals), so a suggestion isn't shown again for its record. */
  declined: R[];
  doneByNow: { task: R; why: string }[];
  outOfOrder: { task: R; waitOn: R }[];
  usingStarters: boolean;
  /**
   * What Bayani-1 did, when it's on this phone: usual steps it judged the same as an existing step, and usual steps it
   * judged don't belong in this project (both not suggested). The rest it judged to belong carry its judgment.
   */
  bayani: { ran: boolean; same: { practice: R; task: R; judgment: Judgment }[]; notHere: { practice: R; judgment: Judgment }[] };
};

export async function loadMemory(project: R, tasks: R[]): Promise<Memory> {
  const org = project.organization?.reference;
  const ownForKind = await practicesFor(project);
  const p = withAliases(project);
  const usingStarters = ownForKind.length === 0;
  // Starters are read only, shown as if the group's (Core matches the organization); never committed as they are.
  const practices: R[] = usingStarters ? (STARTERS as R[]).map((x) => ({ ...x, organization: project.organization })) : ownForKind;
  const declined = org ? (await bix.search("ChangeProposal", { organization: org }).catch(() => [] as R[])).filter((x) => x.status === "declined") : [];
  const have = new Set(tasks.filter((t) => t.status !== "cancelled").map((t) => norm(t.title ?? "")));
  let candidates = usuallyNeeded(p, tasks, practices, 2 / 3)
    .filter((sug) => !have.has(norm(String(sug.practice.title))) && !wasDeclined(declined, `Initiative/${project.id}`, `Practice/${sug.practice.id}`))
    // Soonest usual day first (those with none last), so the five shown are the ones that matter first.
    .sort((a, b) => (usualDate(project, a.practice) ?? Infinity) - (usualDate(project, b.practice) ?? Infinity));
  // Bayani-1, when it's on this phone (two of its trained questions, in the training format, from these records):
  // "same-practice" drops a suggestion an existing step already covers under other words; "applies" drops a usual step
  // that doesn't belong in this project. Only answers at SHOW_AT or above count; otherwise the rule's list stands.
  const bayani: Memory["bayani"] = { ran: false, same: [], notHere: [] };
  let judged: Memory["needed"] = candidates.map((x) => ({ practice: x.practice, why: x.why, starter: usingStarters }));
  if (await modelDownloaded().catch(() => false)) {
    bayani.ran = true;
    const teams = await bix.search("Team", { initiative: `Initiative/${project.id}` }).catch(() => [] as R[]);
    const teamName = (t: R) => teams.find((x) => `Team/${x.id}` === (t.team as { reference?: string } | undefined)?.reference)?.name as string | undefined;
    const records = [packProject(project), ...tasks, ...teams, ...practices];
    const kept: Memory["needed"] = [];
    for (const sug of candidates) {
      const t = closestTask(sug.practice, tasks, teamName);
      const same = t ? await judge({ kind: "same-practice", step: `Task/${t.id}`, practice: `Practice/${sug.practice.id}` }, records, "").catch(() => null) : null;
      if (t && same?.kind === "yes-no" && same.value && same.confidence >= SHOW_AT) { bayani.same.push({ practice: sug.practice, task: t, judgment: same }); continue; }
      const fits = await judge({ kind: "applies", practice: `Practice/${sug.practice.id}`, initiative: `Initiative/${project.id}` }, records, "").catch(() => null);
      if (fits?.kind === "yes-no" && !fits.value && fits.confidence >= SHOW_AT) { bayani.notHere.push({ practice: sug.practice, judgment: fits }); continue; }
      kept.push({ practice: sug.practice, why: sug.why, starter: usingStarters, ...(fits?.kind === "yes-no" && fits.value && fits.confidence >= SHOW_AT ? { judgment: fits } : {}) });
      if (kept.length >= 5) break;
    }
    judged = kept;
  }
  const needed = judged.slice(0, 5).map((x) => ({ ...x, why: usingStarters ? "Common for projects like this" : x.why, by: usualDate(project, x.practice) }));
  const now = new Date().toISOString();
  const byRef = new Map(practices.map((x) => [`Practice/${x.id}`, x]));
  const open = (t: R) => !["completed", "cancelled", "draft"].includes(String(t.status));
  const timing = usingStarters ? [] : tasks.filter((t) => open(t) && !t.due && t.practice).flatMap((t) => {
    const pr = byRef.get(t.practice.reference), by = pr ? usualDate(project, pr) : null;
    return pr && by && by > Date.now() ? [{ task: t, practice: pr, by }] : [];
  });
  return {
    needed,
    doneByNow: usingStarters ? [] : usuallyDoneByNow(p, tasks, practices, now).map((x) => ({ task: x.task, why: x.why })),
    // Only while the later step isn't done yet, and the earlier one isn't either: afterwards the order no longer matters.
    outOfOrder: usingStarters ? [] : outOfOrder(p, tasks, practices).filter((x) => open(x.task) && open(x.shouldWaitOn)).map((x) => ({ task: x.task, waitOn: x.shouldWaitOn })),
    timing,
    declined,
    usingStarters,
    bayani,
  };
}

/** Add a usually-needed step to the project: the team with the Practice's team name, else the first team. */
export async function addFromMemory(project: R, teams: R[], s: { practice: R; starter: boolean; judgment?: Judgment }) {
  const name = String(s.practice.team ?? "").toLowerCase();
  const team = teams.find((t) => String(t.name).toLowerCase() === name) ?? teams.find((t) => name && String(t.name).toLowerCase().includes(name.split(/[ &]/)[0]!)) ?? teams[0];
  // Due on its usual day; when that has already passed, tomorrow, so a step added late isn't late the moment it's added.
  const usual = usualDate(project, s.practice);
  const due = usual === null ? null : Math.max(usual, Date.now() + 86_400_000);
  const task = bix.create("Task", {
    intent: "plan", status: "ready", title: s.practice.title, partOf: { reference: `Initiative/${project.id}` },
    ...(team ? { owner: { reference: `Team/${team.id}` }, team: { reference: `Team/${team.id}` }, audience: "team" } : {}),
    // A group's own Practice is linked; a starter isn't a group record, so the step keeps its title only (adopted at close-out).
    ...(s.starter ? {} : { practice: { reference: `Practice/${s.practice.id}` } }),
    ...(due !== null ? { due: new Date(due).toISOString() } : {}),
  });
  // Recorded as suggested by Bayani-1 when it judged the step belongs here, else by the memory rule.
  const [made] = await bix.commitAssisted([task], s.judgment ? assisted(s.judgment) : { type: "rule", rule: MEMORY_RULE });
  return { team, task: made ?? task };
}

/** "Not this time": a declined memory ChangeProposal, so it isn't suggested again for this project. */
export async function declineFromMemory(project: R, s: { practice: R; judgment?: Judgment }) {
  const org = project.organization?.reference;
  if (!org) return;
  const cp = declineSuggestion({ id: newId(), target: { reference: `Initiative/${project.id}` }, basedOn: project.meta.version, organization: { reference: org },
    practice: { reference: `Practice/${s.practice.id}` }, question: s.judgment ? "applies" : "usually-needed", title: s.practice.title }) as R;
  // Declined with the same agents as an accept would carry: Bayani-1 when it judged the step belongs, else the rule.
  await bix.commitAssisted([cp], s.judgment ? assisted(s.judgment) : { type: "rule", rule: MEMORY_RULE });
}
