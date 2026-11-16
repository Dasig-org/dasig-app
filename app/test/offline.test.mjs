/*
 * The offline rules (audit 2026-11-16, B85–B87): what counts as offline, that the outbox never drops a change, that a
 * change kept for later is a success, and that reads fall back to the saved copy with waiting changes on top.
 * The app has no test runner of its own yet (B84, B97); this runs with the one in the bayanihan repository:
 *
 *   cd app && ../../bayanihan/node_modules/.bin/vitest run test/offline.test.mjs
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Offline } from "../src/lib/reach";

const mem = new Map(), cache = new Map();
const state = { kind: "ecosystem", send: async () => { throw new Offline(); } };
vi.mock("@react-native-async-storage/async-storage", () => ({ default: { getItem: async (k) => mem.get(k) ?? null, setItem: async (k, v) => { mem.set(k, v); } } }));
vi.mock("expo-crypto", () => ({ randomUUID: () => "id" }));
vi.mock("../src/lib/cache", () => ({ getCached: async (k) => cache.get(k) ?? null, putCached: async (k, v) => { cache.set(k, v); }, clearCache: async () => cache.clear() }));
vi.mock("../src/lib/connection", () => ({ getConnection: async () => ({ kind: state.kind, url: "https://x", token: "t" }) }));
vi.mock("../src/lib/transport", () => ({ send: (...a) => state.send(...a) }));

const { bix, onQueued, onLocalChange } = await import("../src/lib/bix");
const outbox = await import("../src/lib/outbox");
const task = (id, version = 1, extra = {}) => ({ resourceType: "Task", id, meta: { version }, ...extra });
const ok = (json) => ({ ok: true, status: 200, text: async () => JSON.stringify(json), json: async () => json });
const offline = async () => { throw new Offline(); };

beforeEach(() => { mem.clear(); cache.clear(); state.kind = "ecosystem"; state.send = offline; });

describe("what counts as offline", () => {
  it("only a request that never got there", () => {
    expect(outbox.isNetworkError(new Offline())).toBe(true);
    expect(outbox.isNetworkError(new TypeError("x is not a function"))).toBe(false);
    expect(outbox.isNetworkError(new Error("Failed to fetch"))).toBe(false);
  });
  it("a code bug while saving is an error, not something to queue", async () => {
    state.send = async () => { throw new TypeError("boom"); };
    const seen = []; const stop = onLocalChange((e) => seen.push(e.kind));
    await expect(bix.commit(task("a"))).rejects.toThrow("boom");
    stop();
    expect(await outbox.pending()).toEqual([]);
    expect(seen).toEqual(["change", "revert"]);
  });
});

describe("saving without signal", () => {
  it("keeps the change, returns it, and says so once", async () => {
    let said = 0; const stop = onQueued(() => said++);
    const out = await bix.commit(task("a"));
    stop();
    expect(out).toEqual([task("a")]);
    expect((await outbox.pending()).map((p) => p.resource.id)).toEqual(["a"]);
    expect(said).toBe(1);
  });
  it("the same for a change a rule or Bayani suggested", async () => {
    const out = await bix.commitAssisted([task("a")], { type: "rule", rule: "usually-needed" });
    expect(out).toEqual([task("a")]);
    expect((await outbox.pending()).length).toBe(1);
  });
  it("a refusal from the server is still an error", async () => {
    state.send = async () => ok({ entry: [{ ok: false, reasons: ["stale change"], current: null }] });
    await expect(bix.commit(task("a"))).rejects.toThrow(/Someone changed this/);
    expect(await outbox.pending()).toEqual([]);
  });
});

describe("the outbox", () => {
  it("keeps changes added at the same moment", async () => {
    await Promise.all([outbox.enqueue([task("a")]), outbox.enqueue([task("b")]), outbox.enqueue([task("c")])]);
    expect((await outbox.pending()).map((p) => p.resource.id)).toEqual(["a", "b", "c"]);
  });
  it("keeps a change added while the others are being sent", async () => {
    await outbox.enqueue([task("a"), task("b")]);
    let answer; state.send = () => new Promise((r) => { answer = () => r(ok({ accepted: [], refused: [] })); });
    const sending = outbox.flush();
    await new Promise((r) => setTimeout(r, 5));
    await outbox.enqueue([task("late")]);
    answer();
    expect((await sending).sent).toBe(2);
    expect((await outbox.pending()).map((p) => p.resource.id)).toEqual(["late"]);
  });
  it("keeps everything when the send fails", async () => {
    await outbox.enqueue([task("a")]);
    await expect(outbox.flush()).rejects.toBeInstanceOf(Offline);
    expect((await outbox.pending()).length).toBe(1);
  });
});

describe("reading without signal", () => {
  it("saves each answer, and serves it when out of reach", async () => {
    state.send = async () => ok(task("a", 1, { title: "Marshal" }));
    expect((await bix.get("Task", "a")).title).toBe("Marshal");
    state.send = offline;
    expect((await bix.get("Task", "a")).title).toBe("Marshal");
  });
  it("shows changes still waiting on top of the saved copy, in lists too", async () => {
    state.send = async () => ok({ entry: [{ resource: task("a", 1, { status: "ready" }) }, { resource: task("b", 1, { status: "ready" }) }] });
    await bix.search("Task", { partOf: "Initiative/p" });
    state.send = offline;
    await bix.commit(task("a", 2, { status: "accepted" }));
    const list = await bix.search("Task", { partOf: "Initiative/p" });
    expect(list.map((x) => x.status)).toEqual(["accepted", "ready"]);
  });
  it("opens a record made offline by its own page", async () => {
    await bix.commit(task("new", 1, { title: "Made offline" }));
    expect((await bix.get("Task", "new")).title).toBe("Made offline");
  });
  it("says offline when there is nothing saved", async () => {
    await expect(bix.get("Task", "never")).rejects.toBeInstanceOf(Offline);
  });
  it("never serves a saved copy for an error from the server", async () => {
    state.send = async () => ok(task("a"));
    await bix.get("Task", "a");
    state.send = async () => ({ ok: false, status: 403, text: async () => JSON.stringify({ error: "not yours to see" }) });
    await expect(bix.get("Task", "a")).rejects.toThrow("not yours to see");
  });
  it("keeps nothing on the phone's own server, which is never out of reach", async () => {
    state.kind = "phone"; state.send = async () => ok(task("a"));
    await bix.get("Task", "a");
    expect(cache.size).toBe(0);
  });
});
