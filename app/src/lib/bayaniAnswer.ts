/*
 * Bayani answering a typed question about the screen it was opened on (Don, 2026-11-16: "it should be able to read
 * about the organization and the project where Ask Bayani is called").
 *
 * Tried first, on a Mac with the same model (scripts/bayani-answer-check.ts): Bayani-1's base model answering in its
 * own words from the screen's records. Right on simple lookups, but it also miscounted, named the wrong steps as late
 * and invented team leads; asked to point at the lines that answer, it picked the first lines every time. Too often
 * wrong for people who act on what it says, so (Don chose this, same day):
 *
 *  1. Understand: what kind of question is it? Plain word matching first; when that finds nothing, Bayani-1 chooses
 *     from the fixed list below under a grammar, which it does well. Nothing else is asked of the model.
 *  2. Answer: the app works the answer out from the records this person's screen already loaded, and says it in
 *     plain sentences. Always what the records say; never a guess. Works on the web too (word matching only).
 *
 * No React Native here, so it runs the same in the app and in tests (app/test/answer.test.mjs).
 */
type R = { resourceType: string; id: string; [k: string]: any };
export type ScreenRecords = {
  kind: "group" | "project" | "task";
  org?: R | null; project?: R | null; task?: R | null; projects?: R[];
  tasks?: R[]; teams?: R[]; needs?: R[]; people?: Record<string, R>;
};
export type Intent = "late" | "needs-people" | "this-week" | "team" | "step" | "when-where" | "progress" | "needs" | "updates" | "summary" | "not-recorded" | "unknown";
export const INTENTS: { code: Intent; means: string }[] = [
  { code: "late", means: "which steps are late or overdue" },
  { code: "needs-people", means: "which steps still need someone, need volunteers or have nobody" },
  { code: "this-week", means: "what to do this week or soon, what's coming up, priorities" },
  { code: "team", means: "a team or committee: who leads it, who is on it, how it is doing" },
  { code: "step", means: "one step or task: who is on it, when it is due, its status" },
  { code: "when-where", means: "when or where the project happens" },
  { code: "progress", means: "how far along it is, how many steps are done, whether it is on schedule" },
  { code: "needs", means: "supplies or things still needed, goods received" },
  { code: "updates", means: "the latest news or updates people posted" },
  { code: "summary", means: "a summary or overview of the project or group" },
  { code: "not-recorded", means: "money, budget, funds raised, expenses, or anything the app doesn't keep" },
  { code: "unknown", means: "anything else, or how to use the Dasig app itself" },
];

const STOP = new Set("the and for who what when where which how are our with this that does did has have was were will can any all from into about step steps task tasks team teams doing".split(" "));
const W = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)).map((w) => w.replace(/s$/, ""));
const has = (q: string, re: RegExp) => re.test(q.toLowerCase());

/** The record a question names, by shared words (e.g. "water" names the Water team, "bibs" the step Print race bibs). */
function named<T extends R>(q: string, xs: T[], label: (x: T) => string): T | null {
  const qw = new Set(W(q));
  let best: T | null = null, score = 0;
  for (const x of xs) { const s = W(label(x)).filter((w) => qw.has(w)).length; if (s > score) { score = s; best = x; } }
  return best;
}

/** Plain word matching: the questions people ask most. Null when it can't tell (then Bayani-1 decides). */
export function intentByWords(q: string, s: ScreenRecords): Intent | null {
  const steps = [...(s.tasks ?? []), ...(s.task ? [s.task] : [])];
  // How to use the app is for the facts library, not this screen's records.
  if (has(q, /^(how (do|can|should) (i|we)|how to|can i|where (do|can) i)\b/) && !has(q, /\b(late|done|going|doing)\b/)) return "unknown";
  if (has(q, /\b(money|budget|funds?|raised|raise|expenses?|spen[dt]|spending|paid|costs?|cash|pesos?|php|donations? of money)\b/)) return "not-recorded";
  if (has(q, /\b(summar\w*|overview|recap|big picture|tell me about)\b/)) return "summary";
  if (has(q, /\b(late|overdue|behind|delayed|missed)\b/)) return "late";
  if (has(q, /\b(updates?|news|latest|posted|saying|said|heard)\b/)) return "updates";
  if (has(q, /\b(supplies|goods|items|bottles|received|donated|inventory)\b/)) return "needs";
  if (has(q, /\b(progress|how far|percent|on track|on schedule)\b/) || has(q, /how many .*done/)) return "progress";
  if (has(q, /\b(when|where|date|venue|location|what time)\b/) && !named(q, steps, (x) => x.title)) return "when-where";
  if (has(q, /\b(this week|today|tomorrow|soon|coming up|priorit\w*|focus|should we)\b/)) return "this-week";
  if (named(q, s.teams ?? [], (x) => x.name) && has(q, /\b(team|committee|lead|leads|leading|members?)\b/)) return "team";
  if (has(q, /\b(need|needs|needed|nobody|no one|volunteers?|short of|unassigned)\b/)) return "needs-people";
  if (named(q, steps, (x) => x.title)) return "step";
  return null;
}

/** For Bayani-1: choose one of INTENTS. A fixed choice under a grammar, the kind of question it does well. */
export function intentMessages(q: string) {
  return [{ role: "system" as const, content: "You sort a question a volunteer group asks about its project into one kind. Reply with the kind only." },
    { role: "user" as const, content: `Kinds:\n${INTENTS.map((x) => `${x.code}: ${x.means}`).join("\n")}\n\nQuestion: ${q.trim()}` }];
}
export const intentGrammar = () => `root ::= ${INTENTS.map((x) => JSON.stringify(x.code)).join(" | ")}`;
export const INTENT_SETTINGS = { n_predict: 6, temperature: 0, stop: ["\n"] } as const;
export const asIntent = (out: string): Intent => (INTENTS.find((x) => x.code === out.trim())?.code ?? "unknown");

export type Answer = { intent: Intent; text: string; lines?: string[]; go?: { label: string; path: string } };
const day = (iso?: string) => (iso ? new Date(iso).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }) : "");
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const ext = (r: R | null | undefined, url: string) => ((r?.extension ?? []) as { url: string; value?: unknown }[]).find((e) => e.url === url)?.value as string | undefined;

/** The answer, worked out from the records. Never a guess: when the records don't say, it says so. */
export function answerFor(intent: Intent, q: string, s: ScreenRecords, now = Date.now()): Answer {
  const name = (ref?: string) => (ref && s.people?.[ref]?.name?.text) || "someone";
  const active = (x: R) => ((x.participant ?? []) as { status: string; person: { reference: string }; role?: string }[]).filter((p) => p.status === "active");
  const who = (x: R) => active(x).map((p) => name(p.person.reference));
  const teamName = (x: R) => (s.teams ?? []).find((t) => `Team/${t.id}` === x.team?.reference)?.name as string | undefined;
  const all = [...(s.task ? [s.task] : []), ...(s.tasks ?? [])].filter((x, i, a) => !["draft", "cancelled"].includes(x.status) && a.findIndex((y) => y.id === x.id) === i);
  const open = all.filter((x) => x.status !== "completed"), done = all.filter((x) => x.status === "completed");
  const late = open.filter((x) => x.due && Date.parse(x.due) < now).sort((a, b) => a.due.localeCompare(b.due));
  const nobody = open.filter((x) => x.status === "ready" && !who(x).length).sort((a, b) => String(a.due ?? "9999").localeCompare(String(b.due ?? "9999")));
  const line = (x: R) => [x.title, teamName(x), x.due ? `due ${day(x.due)}` : null, who(x).length ? who(x).join(", ") : x.status === "completed" ? null : "nobody yet"].filter(Boolean).join(" · ");
  const p = s.project;
  switch (intent) {
    case "late":
      return late.length ? { intent, text: `${plural(late.length, "step is", "steps are")} late.`, lines: late.slice(0, 8).map(line) }
        : { intent, text: open.length ? `Nothing is late. ${plural(open.length, "step is", "steps are")} still open.` : "Nothing is late, and nothing is open." };
    case "needs-people":
      return nobody.length ? { intent, text: `${plural(nobody.length, "step needs", "steps need")} someone.`, lines: nobody.slice(0, 8).map(line) }
        : { intent, text: open.length ? "Every open step has someone on it, or was asked of someone." : "There are no open steps." };
    case "this-week": {
      const soon = open.filter((x) => x.due && Date.parse(x.due) - now <= 7 * 864e5).sort((a, b) => a.due.localeCompare(b.due));
      const start = p?.period?.start ? Math.ceil((Date.parse(p.period.start) - now) / 864e5) : null;
      const empty = soon.filter((x) => nobody.includes(x)).length;
      const head = [start !== null && start >= 0 ? `${p!.title} is ${start === 0 ? "today" : `in ${plural(start, "day")}`}.` : null,
        soon.length ? `${plural(soon.length, "step is", "steps are")} due in the next 7 days or already late${empty ? `, ${empty} with nobody on ${empty === 1 ? "it" : "them"}` : ""}.` : "Nothing is due in the next 7 days."].filter(Boolean).join(" ");
      return { intent, text: head, lines: soon.slice(0, 8).map(line) };
    }
    case "team": {
      const t = named(q, s.teams ?? [], (x) => x.name);
      if (!t) return { intent, text: s.teams?.length ? `Which team? There are ${s.teams.map((x) => x.name).join(", ")}.` : "There are no teams here yet." };
      const lead = active(t).find((x) => x.role === "lead"), members = active(t).filter((x) => x.role !== "lead").map((x) => name(x.person.reference));
      const work = all.filter((x) => x.team?.reference === `Team/${t.id}`), d = work.filter((x) => x.status === "completed").length;
      return { intent, text: `${t.name} is ${lead ? `led by ${name(lead.person.reference)}` : "without a lead yet"}${members.length ? `, with ${members.join(", ")}` : ""}. ${work.length ? `${d} of ${plural(work.length, "step")} done.` : "It has no steps yet."}`,
        lines: work.filter((x) => x.status !== "completed").slice(0, 6).map(line), go: { label: `Open ${t.name}`, path: `/team/${t.id}` } };
    }
    case "step": {
      const x = named(q, all, (y) => y.title);
      if (!x) return { intent, text: "I couldn't tell which step you mean. Try a word from its name." };
      const status = x.status === "completed" ? "done" : x.status === "requested" ? "asked of someone, no answer yet" : x.status === "ready" ? "open" : "taken";
      return { intent, text: `“${x.title}” is ${status}${x.due ? `, ${x.status === "completed" ? "was due" : "due"} ${day(x.due)}` : ", with no due date"}. ${who(x).length ? `On it: ${who(x).join(", ")}.` : x.status === "completed" ? "" : "Nobody is on it yet."}${teamName(x) ? ` Team: ${teamName(x)}.` : ""}`.trim(),
        go: { label: "Open the step", path: `/task/${x.id}` } };
    }
    case "when-where": {
      if (!p) return { intent, text: s.kind === "group" ? "Open a project to see when and where it is." : "This step isn't part of a dated project." };
      const place = ext(p, "bayanihan:place-text");
      return { intent, text: `${p.title} is ${p.period?.start ? `on ${new Date(p.period.start).toLocaleString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" })}` : "not dated yet"}${place ? `, at ${place}` : ""}.` };
    }
    case "progress":
      return { intent, text: all.length ? `${done.length} of ${plural(all.length, "step")} done (${Math.round((done.length / all.length) * 100)}%). ${late.length ? `${late.length} late. ` : "Nothing late. "}${nobody.length ? `${nobody.length} with nobody yet.` : "Every open step has someone."}` : "No steps yet.",
        ...(late.length ? { lines: late.slice(0, 5).map(line) } : {}) };
    case "needs": {
      const ns = (s.needs ?? []).filter((n) => n.status !== "cancelled");
      return ns.length ? { intent, text: `${plural(ns.filter((n) => n.status !== "met").length, "need is", "needs are")} still open.`, lines: ns.map((n) => `${n.category?.display ?? "Something"}: ${n.received?.value ?? 0} of ${n.quantity?.value ?? "?"} ${n.quantity?.unit ?? ""}${n.status === "met" ? " (covered)" : ""}`.trim()) }
        : { intent, text: "No needs are posted here." };
    }
    case "updates": {
      const notes = [...((p?.note ?? []) as any[]).map((n) => ({ n, on: "" })), ...all.flatMap((x) => ((x.note ?? []) as any[]).map((n) => ({ n, on: x.title as string })))]
        .filter((x) => x.n.text).sort((a, b) => String(b.n.time ?? "").localeCompare(String(a.n.time ?? ""))).slice(0, 5);
      return notes.length ? { intent, text: "The latest updates:", lines: notes.map(({ n, on }) => `${name(n.author?.reference)}${on ? ` on ${on}` : ""} (${day(n.time)}): ${n.text}`) } : { intent, text: "Nobody has posted an update here yet." };
    }
    case "summary": {
      const place = p ? ext(p, "bayanihan:place-text") : undefined;
      const parts = [p ? `${p.title}${p.period?.start ? ` is on ${day(p.period.start)}` : ""}${place ? ` at ${place}` : ""}.` : s.org ? `${s.org.name}${s.projects?.length ? ` has ${plural(s.projects.filter((x) => x.status === "active").length, "project")} on the go` : ""}.` : null,
        p?.description ? String(p.description) : null,
        all.length ? `${done.length} of ${plural(all.length, "step")} done${late.length ? `, ${late.length} late` : ""}${nobody.length ? `, ${nobody.length} with nobody yet` : ""}.` : null,
        s.teams?.length ? `Teams: ${s.teams.map((t) => { const l = active(t).find((x) => x.role === "lead"); return `${t.name}${l ? ` (${name(l.person.reference)})` : ""}`; }).join(", ")}.` : null];
      return { intent, text: parts.filter(Boolean).join(" ") || "There isn't much here yet.", ...(p && s.kind === "project" ? { go: { label: "Make a report", path: `/project/${p.id}/report` } } : {}) };
    }
    case "not-recorded":
      return { intent, text: "Dasig doesn't keep money records yet: no budget, funds raised or expenses. They're planned, linked to Dasig.org fundraising." };
    default:
      return { intent: "unknown", text: `About ${p?.title ?? s.org?.name ?? "this screen"}, I can say what's late, who's needed, how a team or a step is doing, when and where, progress, needs, updates, or give a summary.` };
  }
}
