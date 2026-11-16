/*
 * Bayani answering in its own words from a screen's records (src/lib/bayaniAnswer.ts), on a Mac, with llama.cpp's
 * server standing in for llama.rn. The base model only (the add-on is off for answers, as in the app):
 *   llama-server -m ../../bayani/models/base-q4_k_m.gguf -c 2048 --port 8099
 *   npx tsx scripts/bayani-answer-check.ts
 */
import { INTENT_SETTINGS, answerFor, asIntent, intentByWords, intentGrammar, intentMessages, type ScreenRecords } from "../src/lib/bayaniAnswer";

const NOW = Date.parse("2026-11-16T10:00:00+08:00"), at = (d: number) => new Date(NOW + d * 864e5).toISOString();
const P = (id: string, name: string) => [`Person/${id}`, { resourceType: "Person", id, name: { text: name } }] as const;
const people = Object.fromEntries([P("don", "Don"), P("mia", "Mia"), P("rhea", "Rhea"), P("ana", "Ana")]);
const on = (...ids: string[]) => ids.map((id) => ({ status: "active", person: { reference: `Person/${id}` } }));
const team = (id: string, name: string, lead?: string) => ({ resourceType: "Team", id, name, participant: lead ? [{ role: "lead", status: "active", person: { reference: `Person/${lead}` } }] : [] });
const task = (title: string, x: Record<string, unknown>) => ({ resourceType: "Task", id: title, title, status: "ready", ...x });
const screen: ScreenRecords = ({
  kind: "project", people,
  org: { resourceType: "Organization", id: "o", name: "Lahug Runners Club" },
  project: { resourceType: "Initiative", id: "p", title: "Lahug Fun Run 2027", status: "active", period: { start: at(10) }, description: "5K fun run for the barangay health center.",
    extension: [{ url: "bayanihan:place-text", value: "Lahug Elementary School, Cebu City" }], note: [{ author: { reference: "Person/don" }, time: at(0), text: "1000 sign ups!" }] },
  teams: [team("w", "Water", "rhea"), team("c", "Communications", "ana"), team("m", "Marshals", "don"), team("r", "Registration")],
  tasks: [task("Find a water supplier", { status: "completed", team: { reference: "Team/w" }, participant: on("rhea") }),
    task("Buy 400 bottles of water", { status: "accepted", due: at(9), team: { reference: "Team/w" }, participant: on("mia") }),
    task("Get the barangay permit", { status: "completed", team: { reference: "Team/c" }, participant: on("ana") }),
    task("Post the event on Facebook", { due: at(-2), team: { reference: "Team/c" } }),
    task("Print 300 race bibs", { due: at(8), team: { reference: "Team/r" }, participant: on("don") }),
    task("Brief the marshals", { due: at(10), team: { reference: "Team/m" } }),
    task("Arrange first aid", { team: { reference: "Team/w" } })],
  needs: [{ resourceType: "Need", id: "n", status: "partially-met", category: { display: "Bottled water" }, quantity: { value: 400, unit: "bottles" }, received: { value: 200 } }],
});
const SERVER = process.env.LLAMA ?? "http://127.0.0.1:8099";
const template = (messages: unknown) => fetch(`${SERVER}/apply-template`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages }) }).then((x) => x.json()).then((x: { prompt: string }) => x.prompt);
const ask = (body: Record<string, unknown>) => fetch(`${SERVER}/completion`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then((x) => x.json()) as Promise<{ content: string }>;
// Questions worded so word matching misses some, to see Bayani-1 sort them.
for (const q of ["What should we do this week?", "Who is leading the water team?", "Anything overdue?", "Which steps still need people?", "How much money did we raise?", "Who's doing the bibs?", "When is the run?",
  "Are we on schedule?", "What has the team been saying?", "Give me the big picture", "Do we have enough bottles?", "How do I invite someone?", "Is first aid covered?", "Which committee is struggling?"]) {
  const t0 = Date.now();
  const byWords = intentByWords(q, screen);
  const intent = byWords ?? asIntent((await ask({ prompt: await template(intentMessages(q)), grammar: intentGrammar(), ...INTENT_SETTINGS })).content);
  const a = answerFor(intent, q, screen, NOW);
  console.log(`Q: ${q}  → ${intent} (${byWords ? "words" : `Bayani-1, ${Date.now() - t0} ms`})\nA: ${a.text}${a.lines?.length ? "\n   " + a.lines.join("\n   ") : ""}\n`);
}
