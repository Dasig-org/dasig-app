/*
 * Bayani's rules for a group (lib/copilot.ts groupMoves): what a coordinator sees on Home. Run like offline.test.mjs:
 *   cd app && npm test
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("@react-native-async-storage/async-storage", () => ({ default: { getItem: async () => null, setItem: async () => {} } }));
vi.mock("expo-crypto", () => ({ randomUUID: () => "id" }));
vi.mock("../src/lib/cache", () => ({ getCached: async () => null, putCached: async () => {}, clearCache: async () => {} }));
vi.mock("../src/lib/connection", () => ({ getConnection: async () => ({ kind: "phone" }) }));
vi.mock("../src/lib/transport", () => ({ send: async () => { throw new Error("no network in tests"); } }));
vi.mock("../src/lib/bayani", () => ({ assisted: () => ({}), judge: async () => null, modelDownloaded: async () => false, modelSupported: false, SHOW_AT: 0.8 }));
vi.mock("../src/lib/memory", () => ({ addFromMemory: async () => ({}), declineFromMemory: async () => {}, packProject: (p) => p, practicesFor: async () => [] }));

const { movesFor, pick, intentOf } = await import("../src/lib/copilot");
const DAY = 86400000, at = (d) => new Date(Date.now() + d * DAY).toISOString();
const org = { resourceType: "Organization", id: "o", name: "Lahug Uplands Runners Club", meta: { version: 1 }, assist: [{ code: "memory" }] };
const run = { resourceType: "Initiative", id: "run", title: "Fun Run", status: "active", period: { start: at(5) }, meta: { version: 1 } };
const drive = { resourceType: "Initiative", id: "drive", title: "Book drive", status: "active", meta: { version: 1 } };
const led = { resourceType: "Team", id: "t1", name: "Route", initiative: { reference: "Initiative/run" }, participant: [{ role: "lead", status: "active", person: { reference: "Person/a" } }] };
const unled = { resourceType: "Team", id: "t2", name: "Water", initiative: { reference: "Initiative/run" }, participant: [] };
const task = (id, x) => ({ resourceType: "Task", id, title: id, status: "ready", partOf: { reference: "Initiative/run" }, meta: { version: 1 }, ...x });
const group = (x = {}) => ({ kind: "group", org, projects: [run, drive], officer: true, ...x });
const ids = (ms) => ms.map((m) => m.id);

describe("Bayani across a group", () => {
  it("with only the projects, says which start soon", () => {
    const ms = movesFor(group(), null);
    expect(ids(ms)).toContain("soon-run");
    expect(ids(ms)).toContain("undated-drive");
  });
  it("finds late steps, steps with nobody, and a team with no lead, across projects, and names the project", () => {
    const tasks = [task("Mark the route", { due: at(-3), team: { reference: "Team/t1" } }), task("Fill the jugs", { due: at(4), team: { reference: "Team/t2" } }), task("Done one", { status: "completed", due: at(-9) })];
    const ms = movesFor(group({ tasks, teams: [led, unled] }), null);
    expect(ids(ms).slice(0, 1)).toEqual(["late-Mark the route"]);
    expect(ids(ms)).toEqual(expect.arrayContaining(["nobody-Fill the jugs", "lead-t2", "soon-run", "empty-drive"]));
    expect(ids(ms)).not.toContain("late-Done one");
    expect(ms.find((m) => m.id === "late-Mark the route").why).toContain("Fun Run · Route");
    expect(ms.find((m) => m.id === "soon-run").why).toBe("2 steps still open");
  });
  it("says what waits on an officer: join requests, a report to send, an event to wrap up, what's short", () => {
    const over = { ...drive, id: "over", title: "Coastal cleanup", period: { start: at(-4) } }, happened = { ...drive, id: "sent", title: "Tree planting", period: { start: at(-3) } };
    const needs = [{ resourceType: "Need", id: "n1", status: "open", priority: "urgent", category: { display: "Water jugs" }, quantity: { value: 10, unit: "jug" }, received: { value: 4, unit: "jug" }, initiative: { reference: "Initiative/run" } },
      { resourceType: "Need", id: "n2", status: "met", priority: "urgent", category: { display: "Tents" } }, { resourceType: "Need", id: "n3", status: "open", neededBy: at(40), category: { display: "Cones" } }];
    const ms = movesFor(group({ projects: [run, over, happened], tasks: [], teams: [], needs, requests: 2, unreported: [happened] }), null);
    expect(ids(ms)).toEqual(expect.arrayContaining(["joins", "report-sent", "wrap-over", "need-n1"]));
    expect(ids(ms)).not.toEqual(expect.arrayContaining(["need-n2"]));
    expect(ids(ms)).not.toContain("need-n3");
    expect(ids(ms)).not.toContain("wrap-sent"); // one item for it: the report
    expect(ms.find((m) => m.id === "joins").title).toBe("2 people are waiting to join");
    expect(ms.find((m) => m.id === "need-n1").why).toContain("4 of 10 jug");
  });
  it("offers project memory to an officer when it's off, and not to anyone else", () => {
    const off = { ...org, assist: [] };
    expect(ids(movesFor(group({ org: off }), null))).toContain("memory-off");
    expect(ids(movesFor(group({ org: off, officer: false }), null))).not.toContain("memory-off");
    expect(ids(movesFor(group(), null))).not.toContain("memory-off");
  });
  it("answers the coordinator's questions from the same list", () => {
    const tasks = [task("Mark the route", { due: at(-3) }), task("Fill the jugs", { due: at(4) })];
    const ms = movesFor(group({ tasks, teams: [], requests: 1 }), null);
    expect(ids(pick(ms, intentOf("What's late across our projects?")))).toEqual(expect.arrayContaining(["late-Mark the route", "nobody-Fill the jugs"]));
    expect(ids(pick(ms, intentOf("Who's still needed?")))).toEqual(expect.arrayContaining(["joins", "nobody-Fill the jugs"]));
    expect(ids(pick(ms, intentOf("What needs me today?"))).length).toBe(ms.length);
  });
  it("leaves a finished or cancelled project alone", () => {
    const ms = movesFor(group({ projects: [{ ...run, status: "completed" }, { ...drive, status: "cancelled" }], tasks: [task("Old", { due: at(-30) })], teams: [] }), null);
    expect(ms).toEqual([]);
  });
});
