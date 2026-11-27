/*
 * Bayani answering typed questions from the screen's records (lib/bayaniAnswer.ts): what kind of question it is, by
 * word matching, and the answer the app works out. The model's part (sorting the questions word matching misses) is
 * checked on a Mac with scripts/bayani-answer-check.ts. Run: npm test
 */
import { describe, expect, it } from "vitest";
import { answerFor, brief, cleanAdvice, intentByWords, parseIdeas } from "../src/lib/bayaniAnswer";

const NOW = Date.parse("2026-11-16T10:00:00+08:00"), at = (d) => new Date(NOW + d * 864e5).toISOString();
const P = (id, name) => [`Person/${id}`, { resourceType: "Person", id, name: { text: name } }];
const people = Object.fromEntries([P("don", "Don"), P("mia", "Mia"), P("rhea", "Rhea")]);
const on = (...ids) => ids.map((id) => ({ status: "active", person: { reference: `Person/${id}` } }));
const team = (id, name, lead) => ({ resourceType: "Team", id, name, participant: lead ? [{ role: "lead", status: "active", person: { reference: `Person/${lead}` } }] : [] });
const task = (title, x) => ({ resourceType: "Task", id: title, title, status: "ready", ...x });
const s = {
  kind: "project", people,
  project: { resourceType: "Initiative", id: "p", title: "Lahug Fun Run", status: "active", period: { start: at(10) }, extension: [{ url: "bayanihan:place-text", value: "Lahug Elementary School" }], note: [{ author: { reference: "Person/don" }, time: at(0), text: "1000 sign ups!" }] },
  teams: [team("w", "Water", "rhea"), team("r", "Registration")],
  tasks: [task("Find a water supplier", { status: "completed", team: { reference: "Team/w" }, participant: on("rhea") }),
    task("Buy 400 bottles of water", { status: "accepted", due: at(9), team: { reference: "Team/w" }, participant: on("mia") }),
    task("Post the event on Facebook", { due: at(-2) }), task("Print 300 race bibs", { due: at(8), team: { reference: "Team/r" }, participant: on("don") }),
    task("Arrange first aid", { team: { reference: "Team/w" } }), task("An idea", { status: "draft" })],
  needs: [{ resourceType: "Need", id: "n", status: "partially-met", category: { display: "Bottled water" }, quantity: { value: 400, unit: "bottles" }, received: { value: 200 } }],
};
const ask = (q) => { const i = intentByWords(q, s); return { i, a: i ? answerFor(i, q, s, NOW) : null }; };

describe("Bayani answering from the screen's records", () => {
  it("understands the common questions by their words", () => {
    expect(["What should we do this week?", "Anything overdue?", "Which steps still need people?", "How much money did we raise?", "Who's doing the bibs?", "When is the run?", "Are we on schedule?", "Give me the big picture", "Do we have enough bottles?", "What has the team been saying?", "Who is leading the water team?", "How do I invite someone?"]
      .map((q) => intentByWords(q, s))).toEqual(["this-week", "late", "needs-people", "not-recorded", "step", "when-where", "progress", "summary", "needs", "updates", "team", "app"]);
    expect(intentByWords("Which committee is struggling?", s)).toBe(null); // left to Bayani-1
  });
  it("answers with exactly what the records say", () => {
    expect(ask("Anything overdue?").a).toMatchObject({ text: "1 step is late.", lines: [expect.stringMatching(/^Post the event on Facebook · due .* · nobody yet$/)] });
    expect(ask("Which steps still need people?").a.lines.map((l) => l.split(" · ")[0])).toEqual(["Post the event on Facebook", "Arrange first aid"]);
    expect(ask("Who is leading the water team?").a.text).toBe("Water is led by Rhea. 1 of 3 steps done.");
    expect(ask("Who's doing the bibs?").a.text).toMatch(/^“Print 300 race bibs” is open, due .*\. On it: Don\. Team: Registration\.$/);
    expect(ask("Are we on schedule?").a.text).toBe("1 of 5 steps done (20%). 1 late. 2 with nobody yet.");
    expect(ask("Do we have enough bottles?").a.lines).toEqual(["Bottled water: 200 of 400 bottles"]);
    expect(ask("Any news?").a.lines).toEqual([expect.stringMatching(/^Don \(.*\): 1000 sign ups!$/)]);
    expect(ask("When is the run?").a.text).toMatch(/^Lahug Fun Run is on .*, at Lahug Elementary School\.$/);
  });
  it("says plainly what Dasig doesn't keep, and what it can answer", () => {
    expect(ask("How much did we spend?").a.text).toMatch(/doesn't keep money records yet/);
    expect(answerFor("unknown", "hello", s, NOW).text).toMatch(/^About Lahug Fun Run, I can say/);
  });
  it("asks which team when it can't tell", () => {
    expect(answerFor("team", "Which committee is struggling?", s, NOW).text).toBe("Which team? There are Water, Registration.");
  });
  it("lists what isn't done, on a team's screen too", () => {
    expect(["What's pending here?", "What's left?", "Which tasks are not done yet?"].map((q) => intentByWords(q, s))).toEqual(["pending", "pending", "pending"]);
    expect(ask("What's pending here?").a.text).toBe("4 steps aren't done yet, 1 late, 2 with nobody on them.");
    const w = { ...s, kind: "team", team: s.teams[0], teams: [s.teams[0]], tasks: s.tasks.filter((x) => x.team?.reference === "Team/w") };
    expect(answerFor(intentByWords("What's pending here?", w), "", w, NOW).lines.map((l) => l.split(" · ")[0])).toEqual(["Buy 400 bottles of water", "Arrange first aid"]);
    expect(intentByWords("Who leads us?", w)).toBe("team");
    expect(answerFor("team", "Who leads us?", w, NOW).text).toBe("Water is led by Rhea. 1 of 3 steps done.");
  });
  it("sends ideas and advice to Bayani-1, and app questions to the facts", () => {
    expect(["Suggest steps to add", "What are we forgetting?", "What else should we prepare?", "Any ideas for the run?"].map((q) => intentByWords(q, s))).toEqual(["ideas", "ideas", "ideas", "ideas"]);
    expect(["How do we get more runners?", "What could go wrong on the day?", "Any tips?"].map((q) => intentByWords(q, s))).toEqual(["advice", "advice", "advice"]);
    expect(intentByWords("What is BIX?", s)).toBe("app");
  });
  it("keeps only usable new step names from what the model wrote", () => {
    const out = "Sure, here are five more steps:\n1. Prepare handouts and materials\n2. **Print 300 race bibs**\n3. Coordinate with the barangay.\n- set up a first aid tent\nStep 5 -\n4. Coordinate with barangay officials";
    expect(parseIdeas(out, s.tasks.map((x) => x.title))).toEqual(["Prepare handouts and materials", "Coordinate with the barangay", "Set up a first aid tent"]);
    expect(cleanAdvice("Short and sweet.")).toBe("Short and sweet.");
    expect(parseIdeas("Design a poster for the event\nCreate a Facebook event page\nCreate a Facebook event page for the barangay", ["Design the poster"])).toEqual(["Create a Facebook event page"]);
    expect(cleanAdvice(`${"Promote it on Facebook and in class. ".repeat(20)}`).length).toBeLessThanOrEqual(600);
    expect(parseIdeas("1. Coordinate with the barangay health center to ensure they have the permits.\n2. Group work: divide the students into groups\n3. Create a Facebook event page\n4. Design a Facebook event page banner", [])).toEqual(["Coordinate with the barangay health center", "Group work", "Create a Facebook event page", "Design a Facebook event page banner"]);
    expect(brief(s, NOW)).toMatch(/^Project: Lahug Fun Run\nHappens: in 10 days\nWhere: Lahug Elementary School\nTeams: Water, Registration\nSteps they have: Find a water supplier \(Water\) - done; /);
  });
});
