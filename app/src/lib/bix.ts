import { randomUUID } from "expo-crypto";
import { send } from "./transport";

export type Ref = { reference: string };
export type R = { resourceType: string; id: string; meta: { version: number }; [k: string]: any };
export const ref = (r: R | string): Ref => ({ reference: typeof r === "string" ? r : `${r.resourceType}/${r.id}` });
export const refId = (x?: Ref | null) => x?.reference.split("/")[1] ?? "";
export const newId = () => randomUUID();
export const now = () => new Date().toISOString();

/** Plain words for errors people can act on; technical ones become a calm retry message. */
export function friendly(m: string): string {
  if (/^invalid \/|must NOT have|must be equal|must match/.test(m)) return "This didn't save: the server didn't accept part of it. Update Dasig, or try again.";
  if (/stale change|someone else got there first/.test(m)) return "Someone changed this just now. We've reloaded it.";
  if (/HTTP 5\d\d/.test(m)) return "Something went wrong on the hub. Please try again.";
  return m;
}
export class BixError extends Error {
  constructor(public reasons: string[], public current: R | null = null) { super(reasons.join("; ")); }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await send(method, path, body === undefined ? undefined : JSON.stringify(body));
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok && !(res.status === 409 && json?.entry)) throw new BixError([friendly(json?.error ? String(json.error) : `HTTP ${res.status}`)]);
  return json as T;
}
const entries = (b: { entry?: { resource: R }[] }) => (b.entry ?? []).map((e) => e.resource);

/*
 * Optimistic updates (2026-11-13). commit() announces the records before the network answers, so every screen that
 * shows them (useLoad) swaps them in at once; when the server refuses, it announces a revert and screens reload.
 */
type LocalListener = (e: { kind: "change"; records: R[] } | { kind: "revert" }) => void;
const local = new Set<LocalListener>();
export const onLocalChange = (l: LocalListener) => { local.add(l); return () => { local.delete(l); }; };
const announce = (e: Parameters<LocalListener>[0]) => local.forEach((l) => { try { l(e); } catch {} });

/** A thin client for any Bayanihan Server: the same calls any BIX app makes. */
export const bix = {
  me: (nickname?: string) => call<R>("POST", "/$me", { nickname }),
  get: (type: string, id: string) => call<R>("GET", `/${type}/${id}`),
  byRef: (r: string) => call<R>("GET", `/$ref/${encodeURIComponent(r)}`),
  search: async (type: string, q: Record<string, string>) => entries(await call<{ entry: { resource: R }[] }>("GET", `/${type}?${new URLSearchParams(q)}`)),
  history: (type: string, id: string) => call<{ entry: { version: number; activity: string; by: string | null; model: boolean; rule: boolean; when: string; offline: boolean; signed: { by: string; unchanged: boolean } | null }[] }>("GET", `/${type}/${id}/$provenance`),
  proof: (type: string, id: string) => call<{ entry: { resource: R }[] }>("GET", `/${type}/${id}/$proof`),
  /** Push notifications: what this server sends (and its web key), register this device, or stop. */
  pushInfo: () => call<{ web: string | null; expo: boolean }>("GET", "/$push"),
  pushOn: (kind: "web" | "expo", target: unknown) => call<{ on: boolean }>("POST", "/$push", { kind, target }),
  pushOff: () => call<{ on: boolean }>("POST", "/$push", { off: true }),
    /** The measure (BIX "Suggestions and their answers"): per question, accepted unchanged, edited, declined. Officers and core members. */
  suggestions: (orgId: string, days = 90) => call<{ days: number; byQuestion: Record<string, { used: number; edited: number; declined: number }> }>("GET", `/Organization/${orgId}/$suggestions?days=${days}`),
  storage: (orgId: string) => call<{ used: number | null; allowance: number | null }>("GET", `/Organization/${orgId}/$storage`),
  verify: (type: string, id: string) => call<{ allValid: boolean; signatures: { signedBy: string; when: string; unchanged: boolean }[] }>("GET", `/${type}/${id}/$verify`),
  /** Apply changes now; if there's no connection, keep them to sync later. Throws BixError if refused. */
  async commit(...records: R[]): Promise<R[]> {
    announce({ kind: "change", records });
    try { const out = await this.commitNow(...records); announce({ kind: "change", records: out }); return out; }
    catch (e) {
      const { isNetworkError, enqueue } = await import("./outbox");
      if (isNetworkError(e)) { await enqueue(records); throw new BixError(["Saved on this phone. We'll send it when you're back online."]); }
      announce({ kind: "revert" });
      throw e;
    }
  },
  /** Commit with what suggested the change (BIX "Suggestions and their answers"): a rule or Bayani, recorded in Provenance. */
  async commitAssisted(records: R[], assistedBy: { type: "rule"; rule: string } | { type: "model"; model: { name: string; version: string; question?: string; confidence?: number; edited?: boolean } }): Promise<R[]> {
    announce({ kind: "change", records });
    try {
      const b = await call<{ entry: ({ ok: true; record: R } | { ok: false; reasons: string[]; current: R | null })[] }>("POST", "/", { type: "transaction", entry: records.map((resource) => ({ resource, assistedBy })) });
      const bad = b.entry.find((e) => !e.ok) as { reasons: string[]; current: R | null } | undefined;
      if (bad) throw new BixError(bad.reasons.map(friendly), bad.current);
      const out = b.entry.map((e) => (e as { record: R }).record); announce({ kind: "change", records: out }); return out;
    } catch (e) {
      const { isNetworkError, enqueue } = await import("./outbox");
      // Offline: kept and sent later without the suggester (the outbox has no place for it yet).
      if (isNetworkError(e)) { await enqueue(records); throw new BixError(["Saved on this phone. We'll send it when you're back online."]); }
      announce({ kind: "revert" }); throw e;
    }
  },
  async commitNow(...records: R[]): Promise<R[]> {
    const b = await call<{ entry: ({ ok: true; record: R } | { ok: false; reasons: string[]; current: R | null })[] }>("POST", "/", { type: "transaction", entry: records.map((resource) => ({ resource })) });
    const bad = b.entry.find((e) => !e.ok) as { reasons: string[]; current: R | null } | undefined;
    if (bad) throw new BixError(bad.reasons.map(friendly), bad.current);
    return b.entry.map((e) => (e as { record: R }).record);
  },
  /** A new record at version 1. */
  create: (resourceType: string, fields: Record<string, any>): R => ({ resourceType, id: newId(), meta: { version: 1 }, ...fields }),
  /** The next version of a record. */
  next: (r: R, fields: Record<string, any>): R => ({ ...r, ...fields, meta: { ...r.meta, version: r.meta.version + 1 } }),
  link: (target: Ref, grants: string[], preview = "title-only", opts: { approval?: boolean; expires?: string; role?: string } = {}) =>
    call<{ token: string; link: R; pairingCode?: string }>("POST", "/$links", { target, grants, preview, ...opts }),
  openLink: (token: string) => call<any>("GET", `/$link/${token}`),
  joinByLink: (token: string) => call<R>("POST", `/$link/${token}/join`, {}),
  /** What you may do with a record, from the server that keeps it. */
  can: (type: string, id: string) => call<{ edit: boolean; who: string }>("GET", `/${type}/${id}/$can`).catch(() => ({ edit: false, who: "" })),
  /** Public groups that may be the one you're about to create. */
  similar: (name: string, place = "") => call<{ entry: { resource: R; score: number }[] }>("GET", `/$similar?${new URLSearchParams({ name, place })}`).then((b) => b.entry).catch(() => [] as { resource: R; score: number }[]),
  /** Ask to join a public group you found. */
  ask: (orgId: string) => call<R>("POST", `/Organization/${orgId}/$ask`, {}),
  tally: (decisionId: string) => call<{ voted: number; eligible: number; mine: string[] | null; tally: Record<string, number> | null }>("GET", `/Decision/${decisionId}/$tally`),
  links: () => call<{ link: R; target: { resourceType: string; id: string; title?: string } | null }[]>("GET", "/$links"),
  revokeLink: (id: string) => call<R>("POST", `/$links/${id}/revoke`, {}),
  deleteMe: (cancel = false) => call<{ deleteAfter: string | null }>("POST", `/$me/delete${cancel ? "?cancel=1" : ""}`, {}),
  exportOrg: (orgId: string) => call<{ entry: unknown[] }>("GET", `/Organization/${orgId}/$export`),
  /** Everything that names you, as a BIX Bundle (rule 18). */
  exportMe: (personId: string) => call<{ entry: { resource: R }[] }>("GET", `/Person/${personId}/$export`),
};
