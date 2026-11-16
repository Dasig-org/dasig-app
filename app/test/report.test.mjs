/*
 * The project report's model and printable page (lib/report.ts). Run with the others:
 *   cd app && ../../bayanihan/node_modules/.bin/vitest run test
 * Set REPORT_OUT=/some/file.html to write the sample page, to look at it in a browser.
 */
import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildReport, reportHtml } from "../src/lib/report";

const NOW = Date.parse("2027-02-10T08:00:00Z"), at = (d) => new Date(NOW + d * 86400000).toISOString();
const person = (id, name, credit) => [`Person/${id}`, { resourceType: "Person", id, name: { text: name }, credit, extension: [{ url: "bayanihan:full-name", value: `${name} Reyes` }] }];
const people = Object.fromEntries([person("mia", "Mia"), person("ben", "Ben", "full"), person("ana", "Ana", "anonymous")]);
const on = (...ids) => ids.map((id) => ({ status: "active", person: { reference: `Person/${id}` } }));
const org = { resourceType: "Organization", id: "o", name: "Lahug Uplands Runners Club", extension: [{ url: "bayanihan:place-text", value: "Lahug, Cebu City" }] };
const project = (x = {}) => ({ resourceType: "Initiative", id: "p", title: "Lahug Uplands Fun Run 2027", status: "active", description: "A 5 km run to fund the barangay reading corner.", period: { start: at(14) },
  target: [{ code: { code: "people-served" }, value: 400 }, { code: { code: "volunteers-active" }, value: 30 }], ...x });
const teams = [{ resourceType: "Team", id: "route", name: "Route", participant: [{ role: "lead", status: "active", person: { reference: "Person/ben" } }] }, { resourceType: "Team", id: "water", name: "Water", participant: [] }];
const img = (hash, extra = {}) => ({ hash, contentType: "image/jpeg", url: `/$files/${hash}`, size: 1, ...extra });
const task = (id, x) => ({ resourceType: "Task", id, title: id, status: "ready", team: { reference: "Team/route" }, meta: { version: 1 }, ...x });
const tasks = [
  task("Mark the route", { status: "completed", participant: on("mia", "ben"), estimate: { value: 2, unit: "h", per: "person" }, milestone: true, output: [{ code: { code: "people-served" }, value: 120 }, { attachment: [img("a"), img("kids", { showsMinors: true }), { hash: "d", contentType: "application/pdf", url: "", size: 1, title: "Route permit" }] }] }),
  task("Brief the marshals", { status: "completed", participant: on("ana"), estimate: { value: 1, unit: "h", per: "person" }, output: [{ attachment: [img("b")] }] }),
  task("Fill the jugs", { team: { reference: "Team/water" }, due: at(-2), participant: on("mia") }),
  task("Set up the finish line", { due: at(13) }),
  task("An idea", { status: "draft" }), task("Dropped", { status: "cancelled" }),
];
const needs = [{ resourceType: "Need", id: "n", status: "partially-met", category: { display: "Bottled water" }, quantity: { value: 400, unit: "piece" }, received: { value: 200, unit: "piece" } }];
const offers = [{ resourceType: "Offer", id: "of", status: "matched", offeredBy: { reference: "Person/ben" }, quantity: { value: 200, unit: "piece" } }, { resourceType: "Offer", id: "of2", status: "available", offeredBy: { reference: "Person/mia" } }];
const input = (x = {}) => ({ project: project(), org, teams, tasks, needs, offers, people, partners: [{ name: "Barangay Lahug" }], now: NOW, ...x });

describe("the project report", () => {
  const m = buildReport(input());
  it("says where the project stands before the day", () => {
    expect(m.state).toBe("underway");
    expect(m.stateLabel).toBe("Under way · 2 of 4 steps done");
    expect(m.steps).toEqual({ done: 2, total: 4, late: 1 });
    expect(m.draft).toMatch(/is under way for .*2027: 2 of 4 steps done, 1 late, with 3 volunteers and 5 hours given so far\./);
  });
  it("counts the figures from finished work, next to what was planned", () => {
    expect(m.figures).toEqual([
      { code: "volunteers-active", label: "volunteers", value: 3, planned: 30 },
      { code: "volunteer-hours", label: "hours given", value: 5, unit: "h", planned: 3 },
      { code: "people-served", label: "people served", value: 120, planned: 400 },
    ]);
  });
  it("shows each team's progress and lead, and what's still to do, late first by date", () => {
    expect(m.teams).toEqual([{ id: "route", name: "Route", lead: "Ben Reyes", done: 2, total: 3, did: ["Mark the route", "Brief the marshals"] }, { id: "water", name: "Water", lead: undefined, done: 0, total: 1, did: [] }]);
    expect(m.open.map((x) => [x.title, x.late, x.who])).toEqual([["Fill the jugs", true, "Mia"], ["Set up the finish line", false, ""]]);
  });
  it("lists needs, what was given, partners and documents", () => {
    expect(m.needs).toEqual([{ id: "n", what: "Bottled water", got: 200, want: 400, unit: "piece" }]);
    expect(m.gave).toEqual([{ who: "Ben Reyes", what: "200 piece" }]);
    expect(m.partners).toEqual(["Barangay Lahug"]);
    expect(m.docs).toEqual([{ title: "Route permit", from: "Mark the route" }]);
  });
  it("never offers a photo marked as showing children, and puts milestones first", () => {
    expect(m.photos.map((x) => x.a.hash)).toEqual(["a", "b"]);
    expect(m.photos[0]).toMatchObject({ caption: "Mark the route", team: "Route", milestone: true });
  });
  it("credits people as they chose: full name, nickname, or not at all", () => {
    expect(m.credits).toEqual([{ team: "Route", names: ["Mia", "Ben Reyes"] }]);
    expect(m.anonymous).toBe(1);
  });
  it("after the day, says how it went", () => {
    const after = buildReport(input({ project: project({ period: { start: at(-3) } }) }));
    expect(after.state).toBe("finished");
    expect(after.draft).toMatch(/^On .*2027, 3 volunteers gave 5 hours for Lahug Uplands Fun Run 2027, serving 120 people\. Route: mark the route, brief the marshals\.$/);
  });
  it("gathers photos, documents and updates left on steps and on the project, each once", () => {
    const note = (text, d, who = "mia") => ({ author: { reference: `Person/${who}` }, time: at(d), text });
    const r = buildReport(input({
      project: project({ attachment: [img("cover", { title: "Start line" }), img("a"), { hash: "brief", contentType: "application/pdf", url: "", size: 1, title: "Brief" }], note: [note("Permit approved.", -1, "ben")] }),
      tasks: [...tasks, task("Scout the hill", { attachment: [img("hill"), img("kids2", { showsMinors: true })], note: [note("Path is muddy after rain.", -2), note("Can't make it: sick", -1), note("Cleared by the barangay.", 0, "ana")] })],
    }));
    expect(r.photos.map((x) => [x.a.hash, x.caption])).toEqual([["a", "Mark the route"], ["b", "Brief the marshals"], ["hill", "Scout the hill"], ["cover", "Start line"]]);
    expect(r.docs).toEqual([{ title: "Route permit", from: "Mark the route" }, { title: "Brief", from: "The project" }]);
    expect(r.updates.map((u) => [u.who, u.on, u.text])).toEqual([["A volunteer", "Scout the hill", "Cleared by the barangay."], ["Ben Reyes", "The project", "Permit approved."], ["Mia", "Scout the hill", "Path is muddy after rain."]]);
    expect(reportHtml(r, { summary: "x", names: false, photos: [] })).toContain("<h2>Latest updates</h2>");
  });
  it("a project with nothing yet is being planned, with no made-up figures", () => {
    const empty = buildReport(input({ tasks: [], needs: [], offers: [], project: project({ target: undefined, description: undefined }) }));
    expect(empty.state).toBe("planning");
    expect(empty.figures.map((f) => [f.label, f.value, f.planned])).toEqual([["volunteers", 0, undefined], ["hours given", 0, undefined]]);
  });

  const words = { summary: m.draft, lessons: "Start the permit a month earlier.\nKeep the <water> team.", names: true, preparedBy: "Don", photos: [{ src: "data:image/gif;base64,R0lGODlhAQABAAAAACw=", caption: "Mark the route", team: "Route" }] };
  const html = reportHtml(m, words);
  it("prints every section, and leaves out what's empty", () => {
    expect(html).toContain("What it&#39;s for");
    for (const h of ["Summary", "Progress by team", "Still to do", "Needs and what was given", "Partners", "Photos", "Documents", "What we learned, and next time", "With thanks to"]) expect(html).toContain(`<h2>${h.replace("'", "&#39;")}</h2>`);
    expect(html).toContain("planned 400");
    expect(html).toContain("1 late");
    expect(html).toContain("And 1 helper who chose not to be named.");
    const bare = reportHtml(buildReport(input({ tasks: [], needs: [], offers: [], partners: [], project: project({ description: undefined }) })), { summary: "Nothing yet.", names: false, photos: [] });
    for (const h of ["Progress by team", "Photos", "Documents", "Partners", "With thanks to"]) expect(bare).not.toContain(`<h2>${h}</h2>`);
  });
  it("escapes what people typed, and names nobody when names are off", () => {
    expect(html).toContain("Keep the &lt;water&gt; team.");
    const unnamed = reportHtml(m, { ...words, names: false });
    expect(unnamed).not.toContain("Ben Reyes:");
    expect(unnamed).toContain("3 volunteers across 2 teams.");
  });
  if (process.env.REPORT_OUT) {
    // A fuller sample to look at: more steps, some without dates, and drawn stand-ins for photos.
    const pic = (c1, c2, label) => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="800" height="600" fill="url(#g)"/><text x="40" y="560" font-family="Arial" font-size="40" fill="rgba(255,255,255,.8)">${label}</text></svg>`)}`;
    const more = [task("Print 300 race bibs", { due: at(9), participant: on("ben") }), task("Buy 400 bottles of water", { team: { reference: "Team/water" }, due: at(11), participant: on("mia") }), task("Brief the marshals again", { due: at(12) }),
      task("Collect sponsor logos", {}), task("Design the race shirt", {}), task("Arrange first aid", { team: { reference: "Team/water" } }), task("Set up water stations", { team: { reference: "Team/water" } })];
    const big = buildReport(input({ tasks: [...tasks, ...more], project: project({ note: [{ author: { reference: "Person/ben" }, time: at(-1), text: "Permit approved by the barangay. Route is cleared from 5 to 8 AM." }] }) }));
    const photos = [["#F7B267", "#F25C54", "Mark the route"], ["#4D9DE0", "#3BB273", "Brief the marshals"], ["#7768AE", "#E15554", "Water station"], ["#3BB273", "#E1BC29", "Finish line"], ["#F25C54", "#7768AE", "Registration"]].map(([a1, a2, l], i) => ({ src: pic(a1, a2, l), caption: l, team: i % 2 ? "Water" : "Route" }));
    writeFileSync(process.env.REPORT_OUT, reportHtml(big, { ...words, summary: big.draft, photos }));
  }
});
