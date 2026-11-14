import { declineSuggestion, outOfOrder, usuallyDoneByNow, usuallyNeeded, wasDeclined } from "@bayanihan/core/memory";
import { bix, newId, type R } from "./bix";
import STARTERS from "@/data/starter-practices.json";
import { closestTask, modelDownloaded, sameStep } from "./bayani";

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

export type Memory = {
  needed: { practice: R; why: string; starter: boolean }[];
  doneByNow: { task: R; why: string }[];
  outOfOrder: { task: R; waitOn: R }[];
  usingStarters: boolean;
};

export async function loadMemory(project: R, tasks: R[]): Promise<Memory> {
  const org = project.organization?.reference;
  const own = org ? (await bix.search("Practice", { organization: org }).catch(() => [] as R[])).filter((x) => x.status === "active") : [];
  const p = withAliases(project);
  const ownForKind = own.filter((x) => ((x.appliesTo ?? []) as { code: string }[]).some((a) => (p.category as { code: string }[]).some((c) => c.code === a.code)));
  const usingStarters = ownForKind.length === 0;
  // Starters are read only, shown as if the group's (Core matches the organization); never committed as they are.
  const practices: R[] = usingStarters ? (STARTERS as R[]).map((x) => ({ ...x, organization: project.organization })) : ownForKind;
  const declined = org ? await bix.search("ChangeProposal", { target: `Initiative/${project.id}` }).catch(() => [] as R[]) : [];
  const have = new Set(tasks.filter((t) => t.status !== "cancelled").map((t) => norm(t.title ?? "")));
  let candidates = usuallyNeeded(p, tasks, practices, 2 / 3)
    .filter((sug) => !have.has(norm(String(sug.practice.title))) && !wasDeclined(declined, `Initiative/${project.id}`, `Practice/${sug.practice.id}`));
  // Bayani-1, when it's on this phone: drop a suggestion when an existing step, worded differently, is the same step.
  if (await modelDownloaded().catch(() => false)) {
    const teams = await bix.search("Team", { initiative: `Initiative/${project.id}` }).catch(() => [] as R[]);
    const teamName = (t: R) => teams.find((x) => `Team/${x.id}` === (t.team as { reference?: string } | undefined)?.reference)?.name as string | undefined;
    const kept: typeof candidates = [];
    for (const sug of candidates) {
      const t = closestTask(sug.practice, tasks, teamName);
      const same = t ? await sameStep(project, t, teamName(t), sug.practice).catch(() => null) : null;
      if (same !== true) kept.push(sug);
      if (kept.length >= 5) break;
    }
    candidates = kept;
  }
  const needed = candidates
    .slice(0, 5)
    .map((sug) => ({ practice: sug.practice, why: usingStarters ? "Common for projects like this" : sug.why, starter: usingStarters }));
  const now = new Date().toISOString();
  return {
    needed,
    doneByNow: usingStarters ? [] : usuallyDoneByNow(p, tasks, practices, now).map((x) => ({ task: x.task, why: x.why })),
    outOfOrder: usingStarters ? [] : outOfOrder(p, tasks, practices).map((x) => ({ task: x.task, waitOn: x.shouldWaitOn })),
    usingStarters,
  };
}

/** Add a usually-needed step to the project: the team with the Practice's team name, else the first team. */
export async function addFromMemory(project: R, teams: R[], s: { practice: R; starter: boolean }) {
  const name = String(s.practice.team ?? "").toLowerCase();
  const team = teams.find((t) => String(t.name).toLowerCase() === name) ?? teams.find((t) => name && String(t.name).toLowerCase().includes(name.split(/[ &]/)[0]!)) ?? teams[0];
  const day = (s.practice.observed as { dayFromStart?: { median?: number } } | undefined)?.dayFromStart?.median;
  const start = project.period?.start ? Date.parse(project.period.start) : null;
  const task = bix.create("Task", {
    intent: "plan", status: "ready", title: s.practice.title, partOf: { reference: `Initiative/${project.id}` },
    ...(team ? { owner: { reference: `Team/${team.id}` }, team: { reference: `Team/${team.id}` }, audience: "team" } : {}),
    // A group's own Practice is linked; a starter isn't a group record, so the step keeps its title only (adopted at close-out).
    ...(s.starter ? {} : { practice: { reference: `Practice/${s.practice.id}` } }),
    ...(start && typeof day === "number" ? { due: new Date(start + day * 86400000).toISOString() } : {}),
  });
  await bix.commitAssisted([task], { type: "rule", rule: MEMORY_RULE });
  return team;
}

/** "Not this time": a declined memory ChangeProposal, so it isn't suggested again for this project. */
export async function declineFromMemory(project: R, s: { practice: R }) {
  const org = project.organization?.reference;
  if (!org) return;
  await bix.commit(declineSuggestion({ id: newId(), target: { reference: `Initiative/${project.id}` }, basedOn: project.meta.version, organization: { reference: org },
    practice: { reference: `Practice/${s.practice.id}` }, question: "usually-needed", title: s.practice.title }) as R);
}
